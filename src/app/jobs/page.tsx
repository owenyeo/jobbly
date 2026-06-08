'use client';

import React, { useState, useMemo } from 'react';
import JobFilters from '@/components/jobs/JobFilters';
import JobListItem from '@/components/shared/JobListItem';
import JobDetailsModal from '@/components/jobs/JobDetailsModal';
import { filterAndSortJobs, JobFilterOptions, JobSortOptions } from '@/components/jobs/filterUtils';
import { JobApplication } from '@/components/shared/JobCard';
import { Briefcase, SlidersHorizontal, LayoutList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [filters, setFilters] = useState<JobFilterOptions>({});
  const [sort, setSort] = useState<JobSortOptions>({ by: 'date', order: 'desc' });
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            *,
            job_embeddings (
              match_score
            )
          `)
          .order('created_at', { ascending: false });

        const formattedJobs = data?.map(job => ({
          ...job,
          match_score: job.job_embeddings?.[0]?.match_score ?? undefined
        })) || [];

        setJobs(formattedJobs);
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }
    loadData();
  }, []);

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
