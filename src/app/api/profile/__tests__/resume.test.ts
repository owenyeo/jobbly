import { vi, describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../resume/route';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Resume Profile API Route', () => {
  const mockGetUser = vi.fn();
  const mockUpsert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'mock-user-123',
          email: 'owen@example.com',
        },
      },
      error: null,
    });

    mockUpsert.mockResolvedValue({
      error: null,
    });

    (createClient as any).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table) => {
        if (table === 'candidate_profile') {
          return { upsert: mockUpsert };
        }
        return {};
      }),
    });
  });

  it('rejects unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost:3000/api/profile/resume', {
      method: 'POST',
      body: JSON.stringify({ resume_text: 'Experienced Systems Developer.' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toContain('Unauthorized');
  });

  it('rejects missing resume text', async () => {
    const request = new Request('http://localhost:3000/api/profile/resume', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain('Resume text is required');
  });

  it('rejects too short resume text', async () => {
    const request = new Request('http://localhost:3000/api/profile/resume', {
      method: 'POST',
      body: JSON.stringify({ resume_text: 'Too short' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain('Resume text must be at least 50 characters');
  });

  it('successfully vectorizes the resume and updates Supabase user metadata', async () => {
    // Set a mock OpenAI key to test fallback or real flow
    process.env.OPENAI_API_KEY = 'test-key';

    const request = new Request('http://localhost:3000/api/profile/resume', {
      method: 'POST',
      body: JSON.stringify({ resume_text: 'My React and Systems scaling resume. I have ten years of software development experience building web apps with TypeScript and Next.js.' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify Supabase upsert was called with the calculated embedding
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.user_id).toBe('mock-user-123');
    expect(upsertArg.resume_text).toBe('My React and Systems scaling resume. I have ten years of software development experience building web apps with TypeScript and Next.js.');
    expect(upsertArg.embedding).toContain('['); // pgvector string representation
  });
});
