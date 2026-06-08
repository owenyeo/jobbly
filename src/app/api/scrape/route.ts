import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAgentExecution } from '@/lib/logger';
import { scrapeJobUrl } from '@/services/scraper/scraper';
import { preEvaluateJob } from '@/services/scraper/funnel';

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
    // We log the scraper execution start
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

    const duration = Date.now() - startTime;

    // 5. Update agent log to 'success'
    await logAgentExecution({
      agent_name: 'scraper',
      status: 'success',
      execution_time_ms: duration,
    });

    return NextResponse.json({
      success: true,
      job_id: job.uuid,
      decision,
      message: `Job scraped and decided as '${decision}' successfully!`,
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
