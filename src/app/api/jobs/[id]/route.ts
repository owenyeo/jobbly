import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluationQueue } from '@/lib/queue';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await context.params;
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
      reevaluate,
      notes,
      interview_date,
    } = body;

    const supabase = await createClient();

    // Prepare fields to update, filter undefined to allow partial updates
    const updatePayload: any = {};
    if (company_name !== undefined) updatePayload.company_name = company_name;
    if (job_title !== undefined) updatePayload.job_title = job_title;
    if (location !== undefined) updatePayload.location = location;
    if (work_mode !== undefined) updatePayload.work_mode = work_mode;
    if (application_link !== undefined) updatePayload.application_link = application_link;
    if (status !== undefined) updatePayload.status = status;
    if (salary_min !== undefined) updatePayload.salary_min = salary_min !== null ? Number(salary_min) : null;
    if (salary_max !== undefined) updatePayload.salary_max = salary_max !== null ? Number(salary_max) : null;
    if (structured_description !== undefined) updatePayload.structured_description = structured_description;
    if (notes !== undefined) updatePayload.notes = notes;
    if (interview_date !== undefined) updatePayload.interview_date = interview_date !== null ? interview_date : null;

    const { error: dbError } = await supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('uuid', id);

    if (dbError) {
      return NextResponse.json({ message: `Database Update Failed: ${dbError.message}` }, { status: 500 });
    }

    // Trigger re-evaluation if requested
    let queueSuccess = true;
    if (reevaluate === true) {
      try {
        await evaluationQueue.add('evaluate-job', { job_application_uuid: id });
      } catch (queueErr) {
        console.warn('Failed to enqueue job for re-evaluation:', queueErr);
        queueSuccess = false;
      }
    }

    return NextResponse.json({
      success: true,
      message: reevaluate === true 
        ? (queueSuccess ? 'Job updated and enqueued for re-evaluation.' : 'Job updated, but queue enqueuing failed.') 
        : 'Job details updated successfully.',
      queue_status: reevaluate === true ? (queueSuccess ? 'enqueued' : 'pending') : 'skipped',
    });

  } catch (err: any) {
    console.error('Error in PUT /api/jobs/[id]:', err);
    return NextResponse.json({ message: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const { error: dbError } = await supabase
      .from('job_applications')
      .delete()
      .eq('uuid', id);

    if (dbError) {
      return NextResponse.json({ message: `Database Delete Failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Job application deleted successfully.',
    });

  } catch (err: any) {
    console.error('Error in DELETE /api/jobs/[id]:', err);
    return NextResponse.json({ message: err.message || 'Internal server error.' }, { status: 500 });
  }
}
