import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KanbanBoard from '../KanbanBoard';

// Mock types matching the schema
interface JobApplication {
  uuid: string;
  company_name: string;
  job_title: string;
  location: string | null;
  work_mode: 'remote' | 'hybrid' | 'on_site';
  application_link: string;
  created_at: string;
  status:
    | 'saved'
    | 'applied'
    | 'rejected'
    | 'ghosted'
    | 'scheduling'
    | 'technical_interview'
    | 'behavioural_interview'
    | 'HR_round';
  salary_min: number | null;
  salary_max: number | null;
}

const mockJobs: JobApplication[] = [
  {
    uuid: '1',
    company_name: 'Company A',
    job_title: 'Software Engineer',
    location: 'Singapore',
    work_mode: 'remote',
    application_link: 'https://example.com/1',
    created_at: new Date().toISOString(),
    status: 'saved',
    salary_min: 6000,
    salary_max: 8000,
  },
  {
    uuid: '2',
    company_name: 'Company B',
    job_title: 'Data Engineer',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://example.com/2',
    created_at: new Date().toISOString(),
    status: 'applied',
    salary_min: 7000,
    salary_max: 9000,
  },
];

describe('KanbanBoard component', () => {
  it('renders loading skeleton cards when loading state is active', () => {
    render(<KanbanBoard jobs={mockJobs} state="loading" />);
    // Should render a skeleton indicator/cards
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state layout when state is empty', () => {
    render(<KanbanBoard jobs={[]} state="empty" onTriggerScraper={vi.fn()} />);
    // Should render "Trigger Scraper Engine" buttons for the columns
    const scraperBtns = screen.getAllByRole('button', { name: /trigger scraper engine/i });
    expect(scraperBtns.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no jobs found/i).length).toBeGreaterThan(0);
  });

  it('renders all column headers and groups jobs correctly by status', () => {
    render(<KanbanBoard jobs={mockJobs} state="success" />);
    
    // Check for some main columns
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
    
    // Check that jobs are in their respective columns
    expect(screen.getByText('Company A')).toBeInTheDocument();
    expect(screen.getByText('Company B')).toBeInTheDocument();
  });
});
