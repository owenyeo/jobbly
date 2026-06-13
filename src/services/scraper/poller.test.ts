import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNodeFlairIndexPage, pollNodeFlairJobs } from './poller';
import { preEvaluateJob } from './funnel';

// Mock the preEvaluateJob function
vi.mock('./funnel', () => ({
  preEvaluateJob: vi.fn((title: string) => {
    if (title.toLowerCase().includes('senior')) return 'drop';
    if (title.toLowerCase().includes('engineer')) return 'pass';
    return 'fallback';
  }),
}));

describe('NodeFlair Poller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNodeFlairIndexPage', () => {
    it('extracts jobs from HTML correctly', () => {
      const mockHtml = `
        <html>
          <body>
            <div class="jobListingCard-123">
              <a href="/jobs/123-software-engineer?utm=source">View Job</a>
              <h2 class="jobListingCardTitle-abc">Software Engineer</h2>
              <p class="companynameAndRating-xyz"><span>Google</span> 4.5</p>
            </div>
            <div class="jobListingCard-456">
              <a href="https://nodeflair.com/jobs/456-senior-dev">View Job</a>
              <h2 class="jobListingCardTitle-def">Senior Developer</h2>
              <p class="companynameAndRating-uvw"><span>Meta</span></p>
            </div>
          </body>
        </html>
      `;

      const results = parseNodeFlairIndexPage(mockHtml);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        job_title: 'Software Engineer',
        company_name: 'Google',
        application_link: 'https://nodeflair.com/jobs/123-software-engineer',
      });
      expect(results[1]).toEqual({
        job_title: 'Senior Developer',
        company_name: 'Meta',
        application_link: 'https://nodeflair.com/jobs/456-senior-dev',
      });
    });
  });

  describe('pollNodeFlairJobs', () => {
    it('filters out duplicates and drops, inserts valid jobs, and enqueues them', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="jobListingCard-1">
              <a href="/jobs/1">View</a>
              <h2 class="jobListingCardTitle-1">Software Engineer</h2>
              <p class="companynameAndRating-1"><span>Google</span></p>
            </div>
            <div class="jobListingCard-2">
              <a href="/jobs/2">View</a>
              <h2 class="jobListingCardTitle-2">Senior Engineer</h2>
              <p class="companynameAndRating-2"><span>Meta</span></p>
            </div>
            <div class="jobListingCard-3">
              <a href="/jobs/3">View</a>
              <h2 class="jobListingCardTitle-3">QA Intern</h2>
              <p class="companynameAndRating-3"><span>Stripe</span></p>
            </div>
          </body>
        </html>
      `;

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });
      global.fetch = mockFetch;

      // Mock Supabase
      const mockIn = vi.fn().mockResolvedValue({ data: [{ application_link: 'https://nodeflair.com/jobs/3' }], error: null });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockInsertSelect = vi.fn().mockResolvedValue({ data: { uuid: 'mock-uuid-1', application_link: 'https://nodeflair.com/jobs/1' }, error: null });
      const mockInsert = vi.fn().mockReturnValue({ select: () => ({ single: mockInsertSelect }) });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });
      const mockSupabase = {
        from: mockFrom,
      } as any;

      // Mock Queue
      const mockQueueAdd = vi.fn().mockResolvedValue({ id: '1' });
      const mockQueue = {
        add: mockQueueAdd,
      } as any;

      const enqueuedCount = await pollNodeFlairJobs(mockSupabase, mockQueue, 'mock-api-key');

      // 1. Checks for duplicates using existing links
      expect(mockFrom).toHaveBeenCalledWith('job_applications');
      expect(mockSelect).toHaveBeenCalled();

      // 2. Pre-evaluation filter:
      // - 'Software Engineer' -> 'pass' (valid, not duplicate)
      // - 'Senior Engineer' -> 'drop' (dropped by pre-evaluator)
      // - 'QA Intern' -> 'fallback' (valid, but it is duplicate as it matches existing '/jobs/3')
      // Only 'Software Engineer' should be inserted and enqueued.
      expect(mockInsert).toHaveBeenCalledWith({
        company_name: 'Google',
        job_title: 'Software Engineer',
        application_link: 'https://nodeflair.com/jobs/1',
        status: 'pending',
        raw_html: null,
        agent_decision: 'pass',
      });

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      expect(mockQueueAdd).toHaveBeenCalledWith('evaluate-job', { job_application_uuid: 'mock-uuid-1' });
      expect(enqueuedCount).toBe(1);
    });
  });
});
