import { describe, it, expect } from 'vitest';
import { filterAndSortJobs, JobFilterOptions, JobSortOptions } from '../filterUtils';
import { JobApplication } from '@/components/shared/JobCard';

const mockJobs: JobApplication[] = [
  {
    uuid: '11111111-1111-1111-1111-111111111111',
    company_name: 'Apple',
    job_title: 'iOS Engineer',
    location: 'Singapore',
    work_mode: 'on_site',
    application_link: 'https://example.com/1',
    created_at: '2026-06-01T00:00:00.000Z',
    status: 'saved',
    salary_min: 6000,
    salary_max: 8000,
    match_score: 95,
  },
  {
    uuid: '22222222-2222-2222-2222-222222222222',
    company_name: 'Google',
    job_title: 'Backend Developer',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://example.com/2',
    created_at: '2026-06-03T00:00:00.000Z',
    status: 'applied',
    salary_min: 8000,
    salary_max: 12000,
    match_score: 85,
  },
  {
    uuid: '33333333-3333-3333-3333-333333333333',
    company_name: 'Meta',
    job_title: 'Frontend Developer',
    location: 'Remote',
    work_mode: 'remote',
    application_link: 'https://example.com/3',
    created_at: '2026-06-02T00:00:00.000Z',
    status: 'technical_interview',
    salary_min: 9000,
    salary_max: 14000,
    match_score: 70,
  },
];

describe('filterAndSortJobs utility', () => {
  it('filters by search term (company name or job title case-insensitive)', () => {
    const filters: JobFilterOptions = { search: 'app' };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(1);
    expect(result[0].company_name).toBe('Apple');

    const filters2: JobFilterOptions = { search: 'developer' };
    const result2 = filterAndSortJobs(mockJobs, filters2, { by: 'date', order: 'desc' });
    expect(result2.length).toBe(2);
  });

  it('filters by work mode', () => {
    const filters: JobFilterOptions = { work_mode: 'remote' };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(1);
    expect(result[0].work_mode).toBe('remote');
  });

  it('filters by status', () => {
    const filters: JobFilterOptions = { status: 'applied' };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('applied');
  });

  it('filters by location', () => {
    const filters: JobFilterOptions = { location: 'Singapore' };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(2);
  });

  it('filters by salary range', () => {
    // Should match jobs with salary overlaps or matching the boundaries
    const filters: JobFilterOptions = { salaryMin: 8500 };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    // Meta has salary_min = 9000, Google has salary_max = 12000 (salary_min 8000).
    // Let's filter strictly: match jobs where salary_max is >= salaryMin and salary_min is <= salaryMax if provided.
    expect(result.length).toBe(2); // Google (max 12000 >= 8500), Meta (max 14000 >= 8500)
  });

  it('filters by match score range', () => {
    const filters: JobFilterOptions = { matchScoreMin: 80, matchScoreMax: 90 };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(1);
    expect(result[0].company_name).toBe('Google');
  });

  it('filters by date range', () => {
    const filters: JobFilterOptions = {
      dateStart: '2026-06-01T00:00:00.000Z',
      dateEnd: '2026-06-02T23:59:59.999Z',
    };
    const result = filterAndSortJobs(mockJobs, filters, { by: 'date', order: 'asc' });
    expect(result.length).toBe(2);
    expect(result[0].company_name).toBe('Apple');
    expect(result[1].company_name).toBe('Meta');
  });

  it('sorts by company_name alphabetically', () => {
    const sort: JobSortOptions = { by: 'company_name', order: 'asc' };
    const result = filterAndSortJobs(mockJobs, {}, sort);
    expect(result[0].company_name).toBe('Apple');
    expect(result[1].company_name).toBe('Google');
    expect(result[2].company_name).toBe('Meta');
  });

  it('sorts by match_score descending', () => {
    const sort: JobSortOptions = { by: 'match_score', order: 'desc' };
    const result = filterAndSortJobs(mockJobs, {}, sort);
    expect(result[0].match_score).toBe(95);
    expect(result[1].match_score).toBe(85);
    expect(result[2].match_score).toBe(70);
  });
});
