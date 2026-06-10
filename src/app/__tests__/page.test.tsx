import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '../page';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn((table) => {
      if (table === 'job_applications') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => {
            // Return mock resolver depending on the test setup
            return Promise.resolve(mockDbResponse);
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  };
  return {
    createClient: () => mockSupabase,
  };
});

let mockDbResponse: { data: any[] | null; error: any } = { data: [], error: null };

describe('HomePage Component (Dynamic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbResponse = { data: [], error: null };
  });

  it('renders an empty state layout when the database has zero jobs', async () => {
    mockDbResponse = { data: [], error: null };

    render(<HomePage />);

    // Wait for the state to render
    const emptyHeader = await screen.findByText(/no job applications found/i);
    expect(emptyHeader).toBeInTheDocument();
    
    const dashboardBtn = screen.getByRole('link', { name: /open pipeline board/i });
    expect(dashboardBtn).toBeInTheDocument();
  });

  it('renders dynamic counts, metrics, and top matches from the database', async () => {
    const mockJobs = [
      {
        uuid: 'uuid-1',
        company_name: 'Apple',
        job_title: 'iOS Engineer',
        location: 'Singapore',
        work_mode: 'on_site',
        application_link: 'https://apple.com/careers',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        status: 'saved',
        salary_min: 6000,
        salary_max: 8000,
        job_embeddings: [{ match_score: 95 }],
      },
      {
        uuid: 'uuid-2',
        company_name: 'Stripe',
        job_title: 'Backend Engineer',
        location: 'Singapore',
        work_mode: 'remote',
        application_link: 'https://stripe.com/jobs/1',
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        status: 'applied',
        salary_min: 8000,
        salary_max: 11000,
        job_embeddings: [{ match_score: 80 }],
      },
    ];

    mockDbResponse = { data: mockJobs, error: null };

    render(<HomePage />);

    // Total count should show 2
    const totalCountText = await screen.findByText('2');
    expect(totalCountText).toBeInTheDocument();

    // Welcome text should mention 2 new jobs scraped in the last 24 hours
    const welcomeSubtext = screen.getByText(/2 new jobs/i);
    expect(welcomeSubtext).toBeInTheDocument();

    // AI Strategy Insights should recommend the highest matching job (Apple iOS Engineer)
    const insightsText = screen.getByText(/iOS Engineer/i);
    expect(insightsText).toBeInTheDocument();
    expect(insightsText).not.toContainHTML('Canva'); // Confirms mock placeholder Canva is removed

    // Top similarity match rankings should display Apple and Stripe
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });
});
