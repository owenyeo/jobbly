import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobsNewPage from '../new/page';
import JobsEditPage from '../[id]/edit/page';
import { createClient } from '@/lib/supabase/client';

// Mock useRouter and useParams
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    id: 'mock-uuid-999',
  }),
}));

// Mock Supabase browser client
vi.mock('@/lib/supabase/client', () => {
  const mockSupabase = {
    from: vi.fn((table) => {
      if (table === 'job_applications') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              uuid: 'mock-uuid-999',
              company_name: 'Slack',
              job_title: 'Developer Advocate',
              location: 'Remote',
              work_mode: 'remote',
              application_link: 'https://slack.com/jobs/1',
              status: 'scheduling',
              salary_min: 9000,
              salary_max: 12000,
              structured_description: 'Advocate for developers.',
            },
            error: null,
          }),
        };
      }
      return {};
    }),
  };
  return {
    createClient: () => mockSupabase,
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('JobsNewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, job_id: 'new-job-uuid-123' }),
    });
  });

  it('renders creation form fields and submits successfully', async () => {
    render(<JobsNewPage />);

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Core Systems Engineer' } });
    fireEvent.change(screen.getByLabelText(/application link/i), { target: { value: 'https://netflix.com/jobs/1' } });
    
    // Fill in other fields
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'Los Gatos' } });
    fireEvent.change(screen.getByLabelText(/work mode/i), { target: { value: 'on_site' } });
    fireEvent.change(screen.getByLabelText(/application status/i), { target: { value: 'applied' } });
    fireEvent.change(screen.getByLabelText(/minimum salary/i), { target: { value: '12000' } });
    fireEvent.change(screen.getByLabelText(/maximum salary/i), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText(/job description/i), { target: { value: 'Systems design scaling.' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /create job/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Netflix',
          job_title: 'Core Systems Engineer',
          location: 'Los Gatos',
          work_mode: 'on_site',
          application_link: 'https://netflix.com/jobs/1',
          status: 'applied',
          salary_min: 12000,
          salary_max: 15000,
          structured_description: 'Systems design scaling.',
        }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});

describe('JobsEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('pre-populates current details and updates with reevaluate checkbox checked', async () => {
    render(<JobsEditPage />);

    // Wait for Supabase load effect to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveValue('Slack');
    });

    expect(screen.getByLabelText(/job title/i)).toHaveValue('Developer Advocate');
    expect(screen.getByLabelText(/application link/i)).toHaveValue('https://slack.com/jobs/1');
    expect(screen.getByLabelText(/location/i)).toHaveValue('Remote');
    expect(screen.getByLabelText(/work mode/i)).toHaveValue('remote');
    expect(screen.getByLabelText(/application status/i)).toHaveValue('scheduling');
    expect(screen.getByLabelText(/minimum salary/i)).toHaveValue(9000);
    expect(screen.getByLabelText(/maximum salary/i)).toHaveValue(12000);
    expect(screen.getByLabelText(/job description/i)).toHaveValue('Advocate for developers.');

    // Edit fields and check the reevaluate box
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Senior Developer Advocate' } });
    
    const checkbox = screen.getByLabelText(/re-evaluate profile match/i);
    fireEvent.click(checkbox);

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/jobs/mock-uuid-999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: 'Slack',
          job_title: 'Senior Developer Advocate',
          location: 'Remote',
          work_mode: 'remote',
          application_link: 'https://slack.com/jobs/1',
          status: 'scheduling',
          salary_min: 9000,
          salary_max: 12000,
          structured_description: 'Advocate for developers.',
          reevaluate: true,
        }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('deletes the job successfully when delete button is clicked', async () => {
    // Mock user confirmation
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<JobsEditPage />);

    // Wait for Supabase load
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toHaveValue('Slack');
    });

    const deleteBtn = screen.getByRole('button', { name: /delete job/i });
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/jobs/mock-uuid-999', {
        method: 'DELETE',
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
