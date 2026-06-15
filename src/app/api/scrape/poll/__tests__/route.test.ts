import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { evaluationQueue } from '@/lib/queue';
import { pollNodeFlairJobs } from '@/services/scraper/poller';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/queue', () => ({
  evaluationQueue: {},
}));

vi.mock('@/services/scraper/poller', () => ({
  pollNodeFlairJobs: vi.fn(),
}));

describe('POST /api/scrape/poll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs pollNodeFlairJobs and returns enqueued count on success', async () => {
    const mockSupabase = {};
    (createClient as any).mockResolvedValue(mockSupabase);
    (pollNodeFlairJobs as any).mockResolvedValue(5);

    const request = new Request('http://localhost:3000/api/scrape/poll', {
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.enqueued_count).toBe(5);
    expect(pollNodeFlairJobs).toHaveBeenCalledWith(mockSupabase, evaluationQueue);
  });

  it('returns 500 error if poller fails', async () => {
    const mockSupabase = {};
    (createClient as any).mockResolvedValue(mockSupabase);
    (pollNodeFlairJobs as any).mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost:3000/api/scrape/poll', {
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Network error');
  });
});
