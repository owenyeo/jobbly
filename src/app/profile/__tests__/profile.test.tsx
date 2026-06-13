import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfilePage from '../page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/client', () => {
  return {
    createClient: () => ({
      auth: {
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      from: vi.fn((table) => {
        if (table === 'candidate_profile') {
          return {
            select: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          };
        }
        return {};
      }),
    }),
  };
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: 'owen@example.com',
        },
      },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: {
        resume_text: 'This is my pre-existing resume text which is quite long and detailed.',
      },
      error: null,
    });
  });

  it('renders profile fields with preloaded resume text', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/owen@example.com/i)).toBeDefined();
      expect(screen.getByLabelText(/resume text/i)).toHaveValue(
        'This is my pre-existing resume text which is quite long and detailed.'
      );
    });
  });

  it('submits updated resume text successfully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<ProfilePage />);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByLabelText(/resume text/i)).toBeDefined();
    });

    const newResume = 'My new awesome system architect resume text. Highly specialized in React and Node and Kubernetes scaling systems.';
    fireEvent.change(screen.getByLabelText(/resume text/i), { target: { value: newResume } });

    fireEvent.click(screen.getByRole('button', { name: /process & save resume/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: newResume }),
      });
      expect(screen.getByText(/resume saved and vectorized successfully/i)).toBeDefined();
    });
  });

  it('signs out user successfully', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
