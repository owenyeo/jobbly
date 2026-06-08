import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAgentExecution } from '@/lib/logger';
import { scrapeJobUrl } from '@/services/scraper/scraper';
import { preEvaluateJob } from '@/services/scraper/funnel';
import { evaluationQueue } from '@/lib/queue';

// Helper to push to queue with retry logic
async function enqueueWithRetries(jobId: string, retries = 2, delayMs = 100): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await evaluationQueue.add('evaluate-job', { job_application_uuid: jobId });
      return true; // Enqueued successfully
    } catch (err) {
      console.warn(`Queue insertion failed on attempt ${attempt}/${retries}:`, err);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false; // All retries failed
}

export async function POST(request: Request) {
  const startTime = Date.now();
  let url = '';
  let rawHtml = '';

  try {
    const body = await request.json();
    url = body.url;
    rawHtml = body.raw_html || '';

    if (!url) {
      return NextResponse.json({ message: 'URL is required.' }, { status: 400 });
    }

    // 1. Write 'running' state in agent logs
    await logAgentExecution({
      agent_name: 'scraper',
      status: 'running',
    });

    // 2. Call scraper service with optional pre-fetched html payload
    const payload = await scrapeJobUrl(url, rawHtml);

    // 2.5. Run Pre-Evaluation Funnel (Workflow A.5)
    const decision = preEvaluateJob(payload.job_title, payload.raw_html);

    // 3. Connect to Supabase
    const supabase = await createClient();

    // 4. Insert scraped job application into the database
    const { data: job, error: dbError } = await supabase
      .from('job_applications')
      .insert({
        company_name: payload.company_name,
        job_title: payload.job_title,
        application_link: payload.application_link,
        work_mode: 'remote', // Default fallback, parsed later
        status: 'saved',
        raw_html: payload.raw_html,
        agent_decision: decision,
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database Insert Failed: ${dbError.message}`);
    }

    // 4.5. Enqueue for LLM Evaluation ONLY if the decision is 'pass'
    let queueSuccess = true;
    if (decision === 'pass') {
      queueSuccess = await enqueueWithRetries(job.uuid, 2, 100);
    }

    const duration = Date.now() - startTime;

    // 5. Update agent log to 'success' (or log queue warning)
    if (decision === 'pass' && !queueSuccess) {
      await logAgentExecution({
        agent_name: 'scraper',
        status: 'failed',
        error: 'Valkey/Queue connection offline. Job saved but enqueuing failed.',
        execution_time_ms: duration,
      });
    } else {
      await logAgentExecution({
        agent_name: 'scraper',
        status: 'success',
        execution_time_ms: duration,
      });
    }

    let responseMessage = `Job scraped and decided as '${decision}' successfully!`;
    if (decision === 'pass' && !queueSuccess) {
      responseMessage += ' Note: AI evaluation is pending because the queue is temporarily down.';
    }

    return NextResponse.json({
      success: true,
      job_id: job.uuid,
      decision,
      message: responseMessage,
      queue_status: decision === 'pass' ? (queueSuccess ? 'enqueued' : 'pending') : 'skipped',
    });

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error('Error in scrape handler:', err);

    // Dump failed rawHtml to file for inspection
    try {
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(process.cwd(), 'src/test/debug_failed_scrape.html'), rawHtml || '');
      console.log('Saved failed scrape HTML to src/test/debug_failed_scrape.html for debugging');
    } catch (fsErr) {
      console.error('Failed to write debug HTML file:', fsErr);
    }

    // 6. Log failure details to database (captures message and call stack)
    await logAgentExecution({
      agent_name: 'scraper',
      status: 'failed',
      error: err,
      execution_time_ms: duration,
    });

    return NextResponse.json(
      {
        message: err.message || 'Scraper encountered an internal error.',
        stack: err.stack || null,
      },
      { status: 500 }
    );
  }
}
