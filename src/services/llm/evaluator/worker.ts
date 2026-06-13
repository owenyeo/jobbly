import { Worker } from 'bullmq';
import { connectionOptions } from '../../../lib/queue';
import { graph } from './graph';
import { supabase } from './supabaseClient';
import * as cheerio from 'cheerio';

async function fetchDetailedHtml(url: string): Promise<string> {
  const apiKey = process.env.SCRAPER_API_KEY;
  let html = '';

  if (apiKey) {
    try {
      const proxyUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        html = await res.text();
      } else {
        console.warn(`[Worker] ScraperAPI returned ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.warn('[Worker] ScraperAPI request failed, trying direct fallback...', err);
    }
  }

  if (!html) {
    console.log('[Worker] Performing direct fetch with spoofed User-Agent fallback...');
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) {
      throw new Error(`Direct fallback fetch failed with status ${res.status} ${res.statusText}`);
    }
    html = await res.text();
  }

  // Extract body and clean scripts/styles/tags to save space and tokens
  const $ = cheerio.load(html);
  $('script, style, iframe, noscript, svg, path, link, meta, head').remove();
  const bodyHtml = $('body').html() || html;
  return bodyHtml.trim();
}

export async function evaluateJobHandler(job: any) {
  if (job.name === 'poll-nodeflair') {
    console.log('[Worker] Scheduled NodeFlair feed poller triggered.');
    const { pollNodeFlairJobs } = await import('../../scraper/poller');
    const { evaluationQueue } = await import('../../../lib/queue');
    const enqueuedCount = await pollNodeFlairJobs(supabase, evaluationQueue);
    return {
      success: true,
      polledJobsCount: enqueuedCount,
    };
  }

  const startTime = Date.now();
  const uuid = job.data.uuid || job.data.job_application_uuid;

  console.log(`[Worker] Started evaluation for job application: ${uuid}`);

  // Insert initial "running" state in agent_execution_logs
  const { data: logRow, error: logStartError } = await supabase
    .from('agent_execution_logs')
    .insert({
      agent_name: 'evaluator',
      status: 'running',
      error_message: null,
      execution_time_ms: null,
    })
    .select('uuid')
    .single();

  if (logStartError) {
    console.warn(`Warning: Could not create execution log: ${logStartError.message}`);
  }

  const logUuid = logRow?.uuid;

  try {
    // 1. Retrieve the job application details from the database
    const { data: jobApp, error: fetchError } = await supabase
      .from('job_applications')
      .select('uuid, job_title, company_name, raw_html, application_link')
      .eq('uuid', uuid)
      .single();

    if (fetchError || !jobApp) {
      throw new Error(
        `Failed to load job application ${uuid} from database: ${fetchError?.message || 'not found'}`
      );
    }

    // A.1 Lazy HTML loading if raw_html is missing
    let rawHtml = jobApp.raw_html;
    if (!rawHtml) {
      console.log(`[Worker] Lazy fetching raw HTML for ${jobApp.job_title} at ${jobApp.company_name} from ${jobApp.application_link}...`);
      if (!jobApp.application_link) {
        throw new Error('No application link found for lazy fetching raw HTML.');
      }
      
      rawHtml = await fetchDetailedHtml(jobApp.application_link);
      
      // Update raw_html in database so we don't have to fetch it again if re-evaluated later
      const { error: updateHtmlError } = await supabase
        .from('job_applications')
        .update({ raw_html: rawHtml })
        .eq('uuid', uuid);

      if (updateHtmlError) {
        console.warn(`[Worker] Warning: Could not update raw_html for job application ${uuid}:`, updateHtmlError.message);
      }
    }

    // 2. Invoke the compiled LangGraph flow
    const finalState = await graph.invoke({
      job_application_uuid: jobApp.uuid,
      job_title: jobApp.job_title,
      company_name: jobApp.company_name,
      raw_html: rawHtml,
      structured_description: null,
      match_score: null,
      agent_decision: null,
      errors: [],
    });

    // 3. Verify final execution state
    if (finalState.errors && finalState.errors.length > 0) {
      throw new Error(finalState.errors.join(' | '));
    }

    console.log(
      `[Worker] Successfully evaluated job ${uuid}. Score: ${finalState.match_score}%, Decision: ${finalState.agent_decision}`
    );

    // 4. Update the log to "success"
    const duration = Date.now() - startTime;
    if (logUuid) {
      await supabase
        .from('agent_execution_logs')
        .update({
          status: 'success',
          execution_time_ms: duration,
        })
        .eq('uuid', logUuid);
    }

    return {
      success: true,
      score: finalState.match_score,
      decision: finalState.agent_decision,
    };
  } catch (err: any) {
    console.error(`[Worker] Evaluation failed for job ${uuid}:`, err);
    const duration = Date.now() - startTime;

    // Update job application status to 'failed' in DB
    try {
      await supabase
        .from('job_applications')
        .update({ status: 'failed' })
        .eq('uuid', uuid);
    } catch (dbErr) {
      console.error(`[Worker] Failed to set job application ${uuid} status to failed:`, dbErr);
    }

    if (logUuid) {
      await supabase
        .from('agent_execution_logs')
        .update({
          status: 'failed',
          error_message: err.message || 'Unknown error occurred in worker process',
          execution_time_ms: duration,
        })
        .eq('uuid', logUuid);
    }

    // Propagate the exception so BullMQ marks the job as failed and retries as configured
    throw err;
  }
}

export const evaluatorWorker = new Worker(
  'evaluation-queue',
  evaluateJobHandler,
  {
    connection: connectionOptions,
    concurrency: 1, // Evaluate jobs sequentially to prevent LLM API rate-limiting
  }
);

// Worker lifecycle hooks
evaluatorWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} has completed successfully.`);
});

evaluatorWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
});

evaluatorWorker.on('error', (err) => {
  console.error('[Diagnostic Worker Error] Stack:', err.stack || err);
});
