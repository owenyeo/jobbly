import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../route';
import { PUT, DELETE } from '../[id]/route';
import { evaluationQueue } from '@/lib/queue';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/queue', () => ({
  evaluationQueue: {
    add: vi.fn(),
  },
}));

describe('Jobs API Endpoints', () => {
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Supabase query builder
    mockSingle.mockResolvedValue({ data: { uuid: 'new-job-uuid-123' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });

    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });

    (createClient as any).mockResolvedValue({
      from: vi.fn((table) => {
        if (table === 'job_applications') {
          return {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
          };
        }
        return {};
      }),
    });
  });

  describe('POST /api/jobs', () => {
    it('creates a job application and enqueues the UUID for evaluation', async () => {
      const payload = {
        company_name: 'Microsoft',
        job_title: 'Software Engineer',
        location: 'Redmond',
        work_mode: 'hybrid',
        application_link: 'https://microsoft.com/careers/123',
        status: 'saved',
        salary_min: 100000,
        salary_max: 130000,
        structured_description: 'We need a C# developer',
      };

      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.job_id).toBe('new-job-uuid-123');

      // Verify Supabase insert was called with the correct payload
      expect(mockInsert).toHaveBeenCalledWith({
        company_name: payload.company_name,
        job_title: payload.job_title,
        location: payload.location,
        work_mode: payload.work_mode,
        application_link: payload.application_link,
        status: payload.status,
        salary_min: payload.salary_min,
        salary_max: payload.salary_max,
        structured_description: payload.structured_description,
      });

      // Verify enqueued to evaluator queue
      expect(evaluationQueue.add).toHaveBeenCalledTimes(1);
      expect(evaluationQueue.add).toHaveBeenCalledWith('evaluate-job', {
        job_application_uuid: 'new-job-uuid-123',
      });
    });
  });

  describe('PUT /api/jobs/[id]', () => {
    it('updates job details and does NOT enqueue if reevaluate is false', async () => {
      const payload = {
        job_title: 'Senior Software Engineer',
        reevaluate: false,
      };

      const request = new Request('http://localhost:3000/api/jobs/mock-id-123', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const response = await PUT(request, { params: { id: 'mock-id-123' } } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify db update was called
      expect(mockUpdate).toHaveBeenCalledWith({
        job_title: 'Senior Software Engineer',
      });
      expect(mockEq).toHaveBeenCalledWith('uuid', 'mock-id-123');

      // Verify no enqueuing
      expect(evaluationQueue.add).not.toHaveBeenCalled();
    });

    it('updates job details and enqueues if reevaluate is true', async () => {
      const payload = {
        job_title: 'Senior Software Engineer',
        reevaluate: true,
      };

      const request = new Request('http://localhost:3000/api/jobs/mock-id-123', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      const response = await PUT(request, { params: { id: 'mock-id-123' } } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify enqueued
      expect(evaluationQueue.add).toHaveBeenCalledTimes(1);
      expect(evaluationQueue.add).toHaveBeenCalledWith('evaluate-job', {
        job_application_uuid: 'mock-id-123',
      });
    });
  });

  describe('DELETE /api/jobs/[id]', () => {
    it('deletes the job application from the database', async () => {
      const request = new Request('http://localhost:3000/api/jobs/mock-id-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'mock-id-123' } } as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);

      // Verify delete was called
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('uuid', 'mock-id-123');
    });
  });
});
