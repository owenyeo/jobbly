import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { evaluationQueue } from '@/lib/queue';
import { scrapeJobUrl } from '@/services/scraper/scraper';
import { preEvaluateJob } from '@/services/scraper/funnel';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/services/scraper/scraper', () => ({
  scrapeJobUrl: vi.fn(),
}));

vi.mock('@/services/scraper/funnel', () => ({
  preEvaluateJob: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logAgentExecution: vi.fn(),
}));

vi.mock('@/lib/queue', () => ({
  evaluationQueue: {
    add: vi.fn(),
  },
}));

describe('Scraper API Route (Queue Fallback TDD)', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock DB client chain
    mockSingle.mockResolvedValue({
      data: { uuid: 'mock-uuid-123' },
      error: null,
    });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    
    (createClient as any).mockResolvedValue({
      from: () => ({ insert: mockInsert }),
    });
  });

  it('enqueues a job when pre-evaluation funnel passes', async () => {
    (scrapeJobUrl as any).mockResolvedValue({
      job_title: 'Junior Developer',
      company_name: 'Stripe',
      application_link: 'https://stripe.com/job/1',
      raw_html: 'React Developer',
    });
    (preEvaluateJob as any).mockReturnValue('pass');
    (evaluationQueue.add as any).mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://stripe.com/job/1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.queue_status).toBe('enqueued');
    expect(evaluationQueue.add).toHaveBeenCalledTimes(1);
    expect(evaluationQueue.add).toHaveBeenCalledWith('evaluate-job', {
      job_application_uuid: 'mock-uuid-123',
    });
  });

  it('skips enqueuing when pre-evaluation decision is fallback', async () => {
    (scrapeJobUrl as any).mockResolvedValue({
      job_title: 'Product Designer',
      company_name: 'Stripe',
      application_link: 'https://stripe.com/job/2',
      raw_html: 'Figma Designer',
    });
    (preEvaluateJob as any).mockReturnValue('fallback');

    const request = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://stripe.com/job/2' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.queue_status).toBe('skipped');
    expect(evaluationQueue.add).not.toHaveBeenCalled();
  });

  it('gracefully degrades to pending if Valkey is down (retries 2 times and succeeds in DB)', async () => {
    (scrapeJobUrl as any).mockResolvedValue({
      job_title: 'Junior Developer',
      company_name: 'Stripe',
      application_link: 'https://stripe.com/job/1',
      raw_html: 'React Developer',
    });
    (preEvaluateJob as any).mockReturnValue('pass');
    
    // Mock queue failing due to Valkey connection issue
    (evaluationQueue.add as any).mockRejectedValue(new Error('Valkey connection refused'));

    const request = new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://stripe.com/job/1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200); // UI clip success
    expect(body.queue_status).toBe('pending'); // Queue fallback
    expect(body.message).toContain('AI evaluation is pending because the queue is temporarily down.');
    
    // We expect it to have retried 2 times
    expect(evaluationQueue.add).toHaveBeenCalledTimes(2);
  });
});
