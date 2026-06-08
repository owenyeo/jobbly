import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobCard from '../JobCard';
import { JobApplication } from '@/types';

const mockJob: JobApplication = {
  uuid: 'test-uuid-123',
  company_name: 'Stripe',
  job_title: 'Software Engineer',
  location: 'Singapore',
  work_mode: 'remote',
  application_link: 'https://stripe.com/jobs/123',
  created_at: new Date().toISOString(),
  status: 'saved',
  salary_min: 8000,
  salary_max: 12000,
  match_score: 92,
};

describe('JobCard component', () => {
  it('renders a prominent Apply button pointing to the job URL', () => {
    render(<JobCard job={mockJob} />);
    
    // Find the link with text "Apply"
    const applyLink = screen.getByRole('link', { name: /apply/i });
    expect(applyLink).toBeInTheDocument();
    expect(applyLink).toHaveAttribute('href', 'https://stripe.com/jobs/123');
    expect(applyLink).toHaveAttribute('target', '_blank');
    expect(applyLink).toHaveClass('inline-flex'); // Asserting it uses modern button/link styling
  });
});
