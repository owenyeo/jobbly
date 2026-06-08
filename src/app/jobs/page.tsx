'use client';

import React, { useState, useMemo } from 'react';
import JobFilters from '@/components/jobs/JobFilters';
import JobListItem from '@/components/shared/JobListItem';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import { filterAndSortJobs, JobFilterOptions, JobSortOptions } from '@/components/jobs/filterUtils';
import { JobApplication } from '@/components/shared/JobCard';
import { Briefcase, SlidersHorizontal, LayoutList } from 'lucide-react';

const mockJobs: JobApplication[] = [
  {
    uuid: '11111111-1111-1111-1111-111111111111',
    company_name: 'Apple',
    job_title: 'iOS Engineer',
    location: 'Singapore',
    work_mode: 'on_site',
    application_link: 'https://apple.com/careers',
    created_at: '2026-06-01T00:00:00.000Z',
    status: 'saved',
    salary_min: 6000,
    salary_max: 8000,
    match_score: 95,
    structured_description: 'Responsible for building next-generation core frameworks for iOS devices. Works closely with designer teams.',
  },
  {
    uuid: '22222222-2222-2222-2222-222222222222',
    company_name: 'Google',
    job_title: 'Backend Developer',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://careers.google.com',
    created_at: '2026-06-03T00:00:00.000Z',
    status: 'applied',
    salary_min: 8000,
    salary_max: 12000,
    match_score: 85,
    structured_description: 'Scale systems pipelines using distributed queues and transactional datastores. Core stacks: Go, GCP, Spanner.',
  },
  {
    uuid: '33333333-3333-3333-3333-333333333333',
    company_name: 'Meta',
    job_title: 'Frontend Developer',
    location: 'Remote',
    work_mode: 'remote',
    application_link: 'https://meta.com/careers',
    created_at: '2026-06-02T00:00:00.000Z',
    status: 'technical_interview',
    salary_min: 9000,
    salary_max: 14000,
    match_score: 70,
    structured_description: 'Craft beautiful user experiences in React, Relay, and GraphQL. Deep interest in browser loading performance.',
  },
  {
    uuid: '44444444-4444-4444-4444-444444444444',
    company_name: 'Stripe',
    job_title: 'Forward Deployed Engineer',
    location: 'Singapore',
    work_mode: 'remote',
    application_link: 'https://stripe.com/jobs',
    created_at: '2026-06-04T00:00:00.000Z',
    status: 'scheduling',
    salary_min: 9000,
    salary_max: 13000,
    match_score: 88,
    structured_description: 'Integrating Stripe products for enterprise clients. System integration layout and custom code design.',
  },
  {
    uuid: '55555555-5555-5555-5555-555555555555',
    company_name: 'Grab',
    job_title: 'Software Intern',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://grab.careers',
    created_at: '2026-06-05T00:00:00.000Z',
    status: 'saved',
    salary_min: null,
    salary_max: null,
    // match_score undefined to showcase raw / unparsed jobs
    structured_description: '',
  },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobApplication[]>(mockJobs);
  const [filters, setFilters] = useState<JobFilterOptions>({});
  const [sort, setSort] = useState<JobSortOptions>({ by: 'date', order: 'desc' });
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute unique locations for location filter dropdown
  const uniqueLocations = useMemo(() => {
    const locs = jobs.map((job) => job.location).filter((loc): loc is string => !!loc);
    return Array.from(new Set(locs));
  }, [jobs]);

  // Apply filtering and sorting logic
  const processedJobs = useMemo(() => {
    return filterAndSortJobs(jobs, filters, sort);
  }, [jobs, filters, sort]);

  const handleJobClick = (job: JobApplication) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleSaveJob = (updatedJob: JobApplication) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.uuid === updatedJob.uuid ? updatedJob : job))
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Scraped Job Listings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          View all scraped listings, search, filter, and drill into unparsed raw HTML content.
        </p>
      </div>

      {/* Filters Panel */}
      <JobFilters
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        uniqueLocations={uniqueLocations}
      />

      {/* Jobs List */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-900">
          <span className="flex items-center gap-1">
            <LayoutList className="h-3.5 w-3.5" />
            Showing {processedJobs.length} of {jobs.length} jobs
          </span>
          <span>Click row for details</span>
        </div>

        {processedJobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {processedJobs.map((job) => (
              <JobListItem
                key={job.uuid}
                job={job}
                onClick={() => handleJobClick(job)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10">
            <Briefcase className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">No matches found</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Try adjusting your query or filter configurations.
            </p>
          </div>
        )}
      </div>

      {/* Side-Drawer Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveJob}
      />
    </div>
  );
}
