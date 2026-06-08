import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Use service role key if available for server environments, fallback to publishable
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface LogData {
  agent_name: 'scraper' | 'evaluator';
  status: 'running' | 'failed' | 'idle' | 'success';
  error?: Error | { message: string; stack?: string } | string;
  execution_time_ms?: number;
}

/**
 * Utility to write execution logs to Supabase agent_execution_logs table.
 * Standardizes stack traces and error objects into clean JSON payloads.
 */
export async function logAgentExecution({
  agent_name,
  status,
  error,
  execution_time_ms,
}: LogData) {
  let errorMessage: string | null = null;

  if (error) {
    if (error instanceof Error) {
      errorMessage = JSON.stringify({
        message: error.message,
        stack: error.stack || null,
      });
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify({
        message: (error as any).message || 'Unknown error object',
        stack: (error as any).stack || null,
      });
    } else {
      errorMessage = JSON.stringify({
        message: String(error),
      });
    }
  }

  try {
    const { data, error: dbError } = await supabase
      .from('agent_execution_logs')
      .insert({
        agent_name,
        status,
        error_message: errorMessage,
        execution_time_ms: execution_time_ms ?? null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to insert log entry:', dbError);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exception thrown in logging wrapper:', err);
    return null;
  }
}
