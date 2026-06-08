export type FunnelResult = 'pass' | 'fallback' | 'drop';

const negativeKeywords = [
  'senior', 'staff', 'principal', 'director', 'vp', 'lead', 'head of',
  'sales', 'marketing', 'hr', 'accountant', 'nurse'
];

const techKeywords = [
  'software',
  'developer',
  'forward deployed',
  'data engineer',
  'project manager',
  'react',
  'node',
  'express',
  'pyspark',
  'kafka',
  'langgraph',
  'agent',
  'machine learning',
  'ai',
  'test',
  'engineer',
  'llm',
  'engineering',
  'langchain',
  'algorithm',
  'deep learning'
];

// Compile a regex for negative keywords with word boundaries
const negativeRegex = new RegExp(
  `\\b(${negativeKeywords.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})\\b`,
  'i'
);

/**
 * Pre-Evaluation Funnel (Workflow A.5)
 * Prevents expensive LLM embedding calls on obviously irrelevant jobs using zero-cost local heuristics.
 */
export function preEvaluateJob(jobTitle: string, rawHtml: string): FunnelResult {
  const normalizedTitle = jobTitle.toLowerCase();

  // Step 1: Negative Filter (Exclusion - Fail Fast)
  // Check if the title contains seniority markers beyond fresh graduate scope or disconnected departments
  if (negativeRegex.test(normalizedTitle)) {
    return 'drop';
  }

  // Step 2: Broad Tech Taxonomy (Inclusion - Pass to LLM)
  // Strip HTML tags first as requested
  const strippedHtml = rawHtml.replace(/<[^>]*>/g, ' ');

  // Slice to the first 1000 characters of tag-stripped text
  const htmlSnippet = strippedHtml.slice(0, 1000).toLowerCase();

  // Scan title and the first 1000 characters of raw_html
  const hasTech = techKeywords.some(tech =>
    normalizedTitle.includes(tech) || htmlSnippet.includes(tech)
  );

  if (hasTech) {
    return 'pass';
  }

  // Fallback Logic: If job passes Negative Filter but misses Tech Taxonomy
  return 'fallback';
}
