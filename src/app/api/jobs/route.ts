import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluationQueue } from '@/lib/queue';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company_name,
      job_title,
      location,
      work_mode,
      application_link,
      salary_min,
      salary_max,
      structured_description,
      status,
    } = body;

    if (!company_name || !job_title || !application_link) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Insert new job application
    const { data: job, error: dbError } = await supabase
      .from('job_applications')
      .insert({
        company_name,
        job_title,
        location: location || null,
        work_mode: work_mode || 'remote',
        application_link,
        status: status || 'saved',
        salary_min: salary_min !== undefined && salary_min !== null ? Number(salary_min) : null,
        salary_max: salary_max !== undefined && salary_max !== null ? Number(salary_max) : null,
        structured_description: structured_description || null,
      })
      .select('uuid')
      .single();

    if (dbError || !job) {
      return NextResponse.json({ message: `Database Insert Failed: ${dbError?.message || 'unknown error'}` }, { status: 500 });
    }

    // Push to evaluation queue
    try {
      await evaluationQueue.add('evaluate-job', { job_application_uuid: job.uuid });
    } catch (queueErr) {
      console.warn('Failed to enqueue manual job for evaluation:', queueErr);
      // We don't fail the request since the job is successfully saved
      return NextResponse.json({
        success: true,
        job_id: job.uuid,
        message: 'Job created successfully, but background evaluation queue is down.',
        queue_status: 'pending',
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      job_id: job.uuid,
      message: 'Job created and enqueued for evaluation successfully!',
      queue_status: 'enqueued',
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error in POST /api/jobs:', err);
    return NextResponse.json({ message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
