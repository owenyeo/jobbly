import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluationQueue } from '@/lib/queue';
import { pollNodeFlairJobs } from '@/services/scraper/poller';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Trigger synchronous NodeFlair feed poll
    const enqueuedCount = await pollNodeFlairJobs(supabase, evaluationQueue);

    return NextResponse.json({
      success: true,
      enqueued_count: enqueuedCount,
      message: `Successfully polled NodeFlair listing feed and enqueued ${enqueuedCount} new jobs.`,
    });
  } catch (err: any) {
    console.error('[API Scrape Poll] Error triggering poller:', err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Scraper poller encountered an internal error.',
      },
      { status: 500 }
    );
  }
}
