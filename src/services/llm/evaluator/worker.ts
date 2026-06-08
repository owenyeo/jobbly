import { Worker } from 'bullmq';
import { connectionOptions } from '../../../lib/queue';
import { graph } from './graph';
import { supabase } from './supabaseClient';

export async function evaluateJobHandler(job: any) {
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
      .select('uuid, job_title, company_name, raw_html')
      .eq('uuid', uuid)
      .single();

    if (fetchError || !jobApp) {
      throw new Error(
        `Failed to load job application ${uuid} from database: ${fetchError?.message || 'not found'}`
      );
    }

    // 2. Invoke the compiled LangGraph flow
    const finalState = await graph.invoke({
      job_application_uuid: jobApp.uuid,
      job_title: jobApp.job_title,
      company_name: jobApp.company_name,
      raw_html: jobApp.raw_html,
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
