import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobListItem from '../JobListItem';
import { JobApplication } from '@/types';

const mockJob: JobApplication = {
  uuid: 'test-uuid-456',
  company_name: 'Google',
  job_title: 'Systems Engineer',
  location: 'Remote',
  work_mode: 'remote',
  application_link: 'https://careers.google.com/jobs/456',
  created_at: new Date().toISOString(),
  status: 'applied',
  salary_min: 9000,
  salary_max: 13000,
  match_score: 88,
};

describe('JobListItem component', () => {
  it('renders a prominent Apply button pointing to the job URL visible on all screen sizes', () => {
    render(<JobListItem job={mockJob} />);
    
    // Find the link with text "Apply"
    const applyLink = screen.getByRole('link', { name: /apply/i });
    expect(applyLink).toBeInTheDocument();
    expect(applyLink).toHaveAttribute('href', 'https://careers.google.com/jobs/456');
    expect(applyLink).toHaveAttribute('target', '_blank');
    
    // Ensure it doesn't hide on small screens (e.g. shouldn't contain hidden unless it's hidden lg:block or something similar,
    // but here we expect it to be completely visible on all devices)
    expect(applyLink.className).not.toMatch(/\bhidden\b/);
  });
});
