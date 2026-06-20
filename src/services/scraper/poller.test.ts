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
    it('polls both NodeFlair and MyCareersFuture, dedups, filters, and inserts jobs with correct work modes and salaries', async () => {
      const mockNodeFlairHtml = `
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
          </body>
        </html>
      `;

      // Mock fetch to handle both NodeFlair and MyCareersFuture endpoints
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('nodeflair.com')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockNodeFlairHtml),
          });
        }
        if (url.includes('mycareersfuture.gov.sg')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({
              results: [
                {
                  uuid: 'mcf-uuid-1',
                  title: 'MCF Software Engineer',
                  postedCompany: { name: 'GovTech' },
                  salary: { minimum: 6000, maximum: 8000 }
                },
                {
                  uuid: 'mcf-uuid-2',
                  title: 'MCF Senior Designer', // Will be dropped by pre-evaluator
                  postedCompany: { name: 'GovTech' },
                  salary: { minimum: 8000, maximum: 10000 }
                },
                {
                  uuid: 'mcf-uuid-3', // Duplicate/existing job
                  title: 'MCF Front End Engineer',
                  postedCompany: { name: 'GovTech' }
                }
              ]
            })),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        });
      });
      global.fetch = mockFetch;

      // Mock Supabase
      const mockIn = vi.fn().mockResolvedValue({
        data: [{ application_link: 'https://www.mycareersfuture.gov.sg/job/mcf-uuid-3' }],
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      
      const mockInsertSelect = vi.fn()
        .mockResolvedValueOnce({ data: { uuid: 'mock-uuid-1' }, error: null })
        .mockResolvedValueOnce({ data: { uuid: 'mock-uuid-2' }, error: null });
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

      // 1. Check database duplicate queries
      expect(mockFrom).toHaveBeenCalledWith('job_applications');
      expect(mockSelect).toHaveBeenCalled();

      // 2. Validate insertions:
      // NodeFlair job "Software Engineer at Google" should be saved as work_mode: 'remote' (legacy behavior)
      expect(mockInsert).toHaveBeenCalledWith({
        company_name: 'Google',
        job_title: 'Software Engineer',
        application_link: 'https://nodeflair.com/jobs/1',
        status: 'saved',
        work_mode: 'remote',
        raw_html: null,
        agent_decision: 'pass',
        salary_min: null,
        salary_max: null,
      });

      // MyCareersFuture job "MCF Software Engineer at GovTech" should be saved as work_mode: 'hybrid' with salary
      expect(mockInsert).toHaveBeenCalledWith({
        company_name: 'GovTech',
        job_title: 'MCF Software Engineer',
        application_link: 'https://www.mycareersfuture.gov.sg/job/mcf-uuid-1',
        status: 'saved',
        work_mode: 'hybrid',
        raw_html: null,
        agent_decision: 'pass',
        salary_min: 6000,
        salary_max: 8000,
      });

      // Dropped jobs should not be inserted:
      // - NodeFlair: 'Senior Engineer at Meta' -> dropped
      // - MCF: 'MCF Senior Designer at GovTech' -> dropped
      // Duplicate jobs should not be inserted:
      // - MCF: 'MCF Front End Engineer at GovTech' -> duplicate of 'https://www.mycareersfuture.gov.sg/job/mcf-uuid-3'
      expect(mockInsert).not.toHaveBeenCalledWith(expect.objectContaining({
        job_title: 'Senior Engineer',
      }));
      expect(mockInsert).not.toHaveBeenCalledWith(expect.objectContaining({
        job_title: 'MCF Senior Designer',
      }));
      expect(mockInsert).not.toHaveBeenCalledWith(expect.objectContaining({
        job_title: 'MCF Front End Engineer',
      }));

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
      expect(enqueuedCount).toBe(2);
    });
  });
});
