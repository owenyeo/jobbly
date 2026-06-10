import path from 'path';
import fs from 'fs';

// Programmatically load .env variables first
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex !== -1) {
        const key = trimmed.substring(0, delimiterIndex).trim();
        let value = trimmed.substring(delimiterIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key] || process.env[key] === 'undefined') {
          process.env[key] = value;
        }
      }
    }
  }
} catch (err) {
  console.warn('Warning: Programmatic .env loading skipped:', err);
}

import { graph } from './graph';
import { supabase } from './supabaseClient';

async function main() {
  const args = process.argv.slice(2);
  const uuid = args[0];

  if (!uuid) {
    console.error('Error: Please provide a job application UUID.');
    console.log('Usage: npx tsx src/services/llm/evaluator/trigger.ts <uuid>');
    process.exit(1);
  }

  console.log(`[Trigger] Fetching job application details for: ${uuid}...`);

  const { data: jobApp, error: fetchError } = await supabase
    .from('job_applications')
    .select('uuid, job_title, company_name, raw_html')
    .eq('uuid', uuid)
    .single();

  if (fetchError || !jobApp) {
    console.error(`Error: Job application not found: ${fetchError?.message || 'not found'}`);
    process.exit(1);
  }

  console.log(`[Trigger] Loaded job: "${jobApp.job_title}" at "${jobApp.company_name}"`);
  console.log(`[Trigger] Running LangGraph evaluation pipeline...`);

  try {
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

    if (finalState.errors && finalState.errors.length > 0) {
      throw new Error(finalState.errors.join(' | '));
    }

    console.log('==================================================');
    console.log('   Evaluation Complete!');
    console.log(`   Job UUID: ${uuid}`);
    console.log(`   Job Title: ${jobApp.job_title}`);
    console.log(`   Company: ${jobApp.company_name}`);
    console.log(`   Match Score: ${finalState.match_score}%`);
    console.log(`   Agent Decision: ${finalState.agent_decision}`);
    console.log('==================================================');
  } catch (error: any) {
    console.error('[Trigger] Graph execution failed:', error.message || error);
    process.exit(1);
  }
}

main();
