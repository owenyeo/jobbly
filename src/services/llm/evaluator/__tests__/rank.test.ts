import { vi, describe, it, expect, beforeEach } from 'vitest';
import { rankNode } from '../nodes/rank';
import { supabase } from '../supabaseClient';

vi.mock('../supabaseClient', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe('Rank Node with Candidate Profile Table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  });

  it('uses user resume embedding from candidate_profile when available', async () => {
    // Mock database calls
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        // A job embedding of 1536 elements
        embedding: new Array(1536).fill(0.1),
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelectJobEmbed = vi.fn().mockReturnValue({ eq: mockEq });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0.2), // custom profile embedding
        },
      ],
      error: null,
    });
    const mockSelectProfile = vi.fn().mockReturnValue({ limit: mockLimit });

    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'job_embeddings') {
        return { select: mockSelectJobEmbed, update: mockUpdate };
      }
      if (table === 'candidate_profile') {
        return { select: mockSelectProfile };
      }
      return { update: mockUpdate };
    });

    const state = {
      job_application_uuid: 'job-123',
      job_title: 'Software Engineer',
      company_name: 'Test Inc',
      structured_description: 'We use TS',
      errors: [],
    };

    const result = await rankNode(state as any);
    expect(result.errors).toBeUndefined();
    expect(result.match_score).toBeDefined();

    // Verify candidate_profile table was queried
    expect(supabase.from).toHaveBeenCalledWith('candidate_profile');
  });

  it('falls back to default candidate vector if service role key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        embedding: new Array(1536).fill(0.1),
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelectJobEmbed = vi.fn().mockReturnValue({ eq: mockEq });
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'job_embeddings') {
        return { select: mockSelectJobEmbed, update: mockUpdate };
      }
      return { update: mockUpdate };
    });

    const state = {
      job_application_uuid: 'job-123',
      job_title: 'Software Engineer',
      company_name: 'Test Inc',
      structured_description: 'We use TS',
      errors: [],
    };

    const result = await rankNode(state as any);
    expect(result.errors).toBeUndefined();
    expect(result.match_score).toBeDefined();

    // Verify candidate_profile table was NOT queried
    expect(supabase.from).not.toHaveBeenCalledWith('candidate_profile');
  });
});
