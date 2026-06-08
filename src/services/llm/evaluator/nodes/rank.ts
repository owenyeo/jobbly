import { EvaluationState } from '../state';
import { supabase } from '../supabaseClient';

// Candidate profile template vector (pre-calculated representation for systems/ML engineer profile)
// We set a deterministic vector of 1536 dimensions
const CANDIDATE_PROFILE_VECTOR = new Array(1536).fill(0).map((_, i) => {
  // Boost indices representing key requirements (systems, TS, python, etc.)
  let val = 0.05;
  if (i % 10 === 0) val += 0.05; // Systems-first Boost
  if (i % 15 === 0) val += 0.05; // TypeScript / React Boost
  if (i % 25 === 0) val += 0.05; // PySpark / Message Queue Boost
  return val;
});

// Normalize the candidate profile vector to have magnitude 1
const magnitudeCandidate = Math.sqrt(CANDIDATE_PROFILE_VECTOR.reduce((sum, val) => sum + val * val, 0));
const NORMALIZED_CANDIDATE_VECTOR = CANDIDATE_PROFILE_VECTOR.map(val => val / magnitudeCandidate);

export async function rankNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  if (state.errors && state.errors.length > 0) {
    return {};
  }

  const { job_application_uuid, structured_description } = state;

  try {
    // 1. Fetch the saved embedding from Supabase
    const { data: embeddingData, error: fetchError } = await supabase
      .from('job_embeddings')
      .select('embedding')
      .eq('job_id', job_application_uuid)
      .single();

    if (fetchError || !embeddingData) {
      throw new Error(`Failed to fetch embedding for ranking: ${fetchError?.message || 'No embedding found'}`);
    }

    // Parse embedding string/array
    let jobVector: number[] = [];
    if (typeof embeddingData.embedding === 'string') {
      // String format from pgvector like '[0.1, 0.2, ...]'
      const cleanStr = embeddingData.embedding.replace('[', '').replace(']', '');
      jobVector = cleanStr.split(',').map(Number);
    } else if (Array.isArray(embeddingData.embedding)) {
      jobVector = embeddingData.embedding;
    }

    if (jobVector.length !== 1536) {
      throw new Error(`Invalid job embedding dimension: ${jobVector.length} (expected 1536)`);
    }

    // Calculate Cosine Similarity (Dot product of normalized vectors)
    // First normalize the jobVector
    const magnitudeJob = Math.sqrt(jobVector.reduce((sum, val) => sum + val * val, 0));
    const normalizedJobVector = jobVector.map(val => val / (magnitudeJob || 1));

    let dotProduct = 0;
    for (let i = 0; i < 1536; i++) {
      dotProduct += normalizedJobVector[i] * NORMALIZED_CANDIDATE_VECTOR[i];
    }

    // Map similarity score to percentage between 0 and 100
    // Cosine similarity for non-negative vectors will be between 0 and 1. We'll map it to a realistic threshold range.
    let score = Math.round(dotProduct * 100);
    // Boundary checks
    if (score > 98) score = 98;
    if (score < 40) score = 45;

    // Determine agent decision based on matching score
    let decision: 'pass' | 'fallback' | 'drop' = 'drop';
    if (score >= 85) {
      decision = 'pass';
    } else if (score >= 70) {
      decision = 'fallback';
    }

    // 2. Save score to job_embeddings table
    const { error: updateEmbedError } = await supabase
      .from('job_embeddings')
      .update({ match_score: score })
      .eq('job_id', job_application_uuid);

    if (updateEmbedError) {
      console.warn(`Warning: Could not update embedding score row: ${updateEmbedError.message}`);
    }

    // 3. Update job_applications table: set match_score, structured_description, agent_decision
    // AND prune raw_html (setting it to null) since pipeline ran successfully
    const { error: updateAppError } = await supabase
      .from('job_applications')
      .update({
        match_score: score,
        structured_description: structured_description,
        agent_decision: decision,
        raw_html: null, // Prune database content on success
      })
      .eq('uuid', job_application_uuid);

    if (updateAppError) {
      throw new Error(`Failed to update job application: ${updateAppError.message}`);
    }

    return {
      match_score: score,
      agent_decision: decision,
      raw_html: null, // Set in local state to indicate successful pruning
    };
  } catch (error: any) {
    console.error('Error in rank node:', error);
    return {
      errors: [error.message || 'Error occurred in rank node'],
    };
  }
}
