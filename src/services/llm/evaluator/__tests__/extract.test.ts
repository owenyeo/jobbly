import { vi, describe, it, expect, beforeEach } from 'vitest';
import { extractNode } from '../nodes/extract';
import { supabase } from '../supabaseClient';

vi.mock('../supabaseClient', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
    },
  };
});

describe('Extract Node with Pre-existing Description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses existing structured_description if raw_html is null', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        raw_html: null,
        job_title: 'Systems Engineer',
        company_name: 'Google',
        structured_description: 'Pre-existing description in DB',
      },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'job_applications') {
        return { select: mockSelect };
      }
      return {};
    });

    const state = {
      job_application_uuid: 'uuid-123',
      job_title: 'Systems Engineer',
      company_name: 'Google',
      raw_html: null,
      structured_description: null,
      match_score: null,
      agent_decision: null,
      errors: [],
    };

    const result = await extractNode(state);

    // If there are errors (e.g. "No raw HTML found for extraction"), this check will fail
    expect(result.errors).toBeUndefined();
    expect(result.structured_description).toBe('Pre-existing description in DB');
  });
});
