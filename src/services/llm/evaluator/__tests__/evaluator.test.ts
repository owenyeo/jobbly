import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { graph } from '../graph';
import { evaluatorWorker } from '../worker';

afterAll(async () => {
  await evaluatorWorker.close();
});

// Mock Supabase client to prevent actual network calls during tests
vi.mock('@supabase/supabase-js', () => {
  const createMockQueryBuilder = (singleData: any) => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => Promise.resolve({ data: singleData, error: null })),
      then: vi.fn((onFulfilled) => {
        if (typeof onFulfilled === 'function') {
          return Promise.resolve(onFulfilled({ data: singleData, error: null }));
        }
        return Promise.resolve({ data: singleData, error: null });
      }),
    };
    return builder;
  };

  const mockSupabase = {
    from: vi.fn((table) => {
      if (table === 'job_applications') {
        return createMockQueryBuilder({
          uuid: 'mock-uuid-999',
          job_title: 'Software Engineer (Systems)',
          company_name: 'Google',
          location: 'Singapore',
          work_mode: 'hybrid',
          raw_html: '<html><body><h1>Software Engineer</h1><p>We use TypeScript, Next.js, Node.js, and PySpark.</p></body></html>',
          structured_description: null,
        });
      } else if (table === 'job_embeddings') {
        return createMockQueryBuilder({
          embedding: new Array(1536).fill(0.1),
        });
      }
      return createMockQueryBuilder(null);
    }),
  };
  return {
    createClient: () => mockSupabase,
  };
});

// Mock external APIs for OpenAI completion & embedding
const mockCreateChatCompletion = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          role: 'Systems Software Engineer role focusing on Next.js, Node.js, Kafka.',
          techStack: ['TypeScript', 'Next.js', 'Node.js', 'PySpark', 'Kafka'],
          requirements: 'Clean architecture design and messaging queue scaling.',
        }),
      },
    },
  ],
});

const mockCreateEmbedding = vi.fn().mockResolvedValue({
  data: [
    {
      embedding: new Array(1536).fill(0.1),
    },
  ],
});

// Set environment variables for testing
process.env.OPENAI_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'mock-key';

describe('Evaluation Graph Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the full graph pipeline successfully and prunes raw_html', async () => {
    const inputState = {
      job_application_uuid: 'mock-uuid-999',
      job_title: 'Software Engineer (Systems)',
      company_name: 'Google',
      raw_html: '<html><body><h1>Software Engineer</h1><p>We use TypeScript, Next.js, Node.js, and PySpark.</p></body></html>',
      structured_description: null,
      match_score: null,
      agent_decision: null,
      errors: [],
    };

    // Run the graph
    const finalState = await graph.invoke(inputState);

    // Assert that the graph nodes populated state fields
    expect(finalState.structured_description).toContain('TypeScript');
    expect(finalState.match_score).toBeGreaterThan(0);
    expect(finalState.errors).toHaveLength(0);

    // Verify pruning behavior: raw_html in the final state or processed DB should be null
    // (We'll check the mock DB call inside our test or check the final state output if it returns it)
    expect(finalState.raw_html).toBeNull();
  });
});

describe('Evaluation Worker Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully processes a job application from a queue payload', async () => {
    const { evaluateJobHandler } = await import('../worker');
    const mockJob = {
      data: {
        job_application_uuid: 'mock-uuid-999',
      },
    };

    const result = await evaluateJobHandler(mockJob);
    expect(result.success).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.decision).toBeDefined();
  });
});
