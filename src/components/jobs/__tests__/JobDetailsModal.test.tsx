import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobDetailsModal from '../JobDetailsModal';
import { JobApplication } from '@/types';

const mockJob: JobApplication = {
  uuid: 'test-uuid-789',
  company_name: 'Meta',
  job_title: 'Production Engineer',
  location: 'Singapore',
  work_mode: 'hybrid',
  application_link: 'https://meta.com/careers/789',
  created_at: new Date().toISOString(),
  status: 'saved',
  salary_min: 10000,
  salary_max: 14000,
  match_score: 95,
};

describe('JobDetailsModal component', () => {
  it('renders a prominent Apply / View Listing button pointing to the job URL', () => {
    render(
      <JobDetailsModal
        job={mockJob}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    
    // Find the prominent link button in the modal
    const applyButton = screen.getByRole('link', { name: /apply \/ view listing/i });
    expect(applyButton).toBeInTheDocument();
    expect(applyButton).toHaveAttribute('href', 'https://meta.com/careers/789');
    expect(applyButton).toHaveAttribute('target', '_blank');
    expect(applyButton).toHaveClass('bg-indigo-600'); // Check that it is styled as a primary action button
  });
});
