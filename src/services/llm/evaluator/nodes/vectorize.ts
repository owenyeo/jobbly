import { EvaluationState } from '../state';
import { supabase } from '../supabaseClient';

export async function vectorizeNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  if (state.errors && state.errors.length > 0) {
    return {};
  }

  const { job_application_uuid, job_title, company_name, structured_description } = state;

  try {
    const textToVectorize = `${job_title} at ${company_name}\n${structured_description}`;
    let embedding: number[] = [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'test-key' && !apiKey.startsWith('mock')) {
      // Real API call to OpenAI embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: textToVectorize,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embeddings API request failed: ${response.statusText}`);
      }

      const resBody = await response.json();
      embedding = resBody.data?.[0]?.embedding || [];
    } else {
      // Mock Fallback: Generate a pseudo-random 1536-dimension float array based on strings
      embedding = new Array(1536).fill(0).map((_, i) => {
        // Deterministic mock weights matching some technical keywords
        let val = 0.05;
        if (textToVectorize.toLowerCase().includes('systems') && i % 10 === 0) val += 0.05;
        if (textToVectorize.toLowerCase().includes('typescript') && i % 15 === 0) val += 0.05;
        if (textToVectorize.toLowerCase().includes('next.js') && i % 20 === 0) val += 0.05;
        return val;
      });
    }

    if (embedding.length === 0) {
      throw new Error('Failed to generate embedding vector.');
    }

    // Insert or update in the job_embeddings table
    // Convert embedding array to string format if required by pgvector, e.g. '[0.1,0.2,...]'
    const pgVectorStr = `[${embedding.join(',')}]`;

    // First delete any pre-existing embeddings to avoid conflict
    await supabase
      .from('job_embeddings')
      .delete()
      .eq('job_id', job_application_uuid);

    // Insert new embedding row
    const { error: insertError } = await supabase
      .from('job_embeddings')
      .insert({
        job_id: job_application_uuid,
        embedding: pgVectorStr,
        match_score: null, // will be ranked in the next node
      });

    if (insertError) {
      throw new Error(`Failed to save embedding in database: ${insertError.message}`);
    }

    return {};
  } catch (error: any) {
    console.error('Error in vectorize node:', error);
    return {
      errors: [error.message || 'Error occurred in vectorize node'],
    };
  }
}
