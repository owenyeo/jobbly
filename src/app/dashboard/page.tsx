'use client';

import React, { useState } from 'react';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import ApplicationModal from '@/components/dashboard/ApplicationModal';
import { JobApplication } from '@/components/shared/JobCard';
import { Layers, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';



export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [boardState, setBoardState] = useState<'success' | 'loading' | 'empty'>('success');
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
        setBoardState(formattedJobs.length === 0 ? 'empty' : 'success');
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setBoardState('empty');
      }
    }
    loadData();
  }, []);

  // Trigger scraper mock action
  const handleTriggerScraper = () => {
    alert('Mock Action: Scraper engine triggered!');
  };

  const handleJobClick = (job: JobApplication) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleSaveJob = (updatedJob: JobApplication) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.uuid === updatedJob.uuid ? updatedJob : job))
    );
  };

  // Derive metrics from mock jobs (only applicable if we are in success state)
  const jobsToUse = boardState === 'success' ? jobs : [];
  const totalCount = jobsToUse.length;

  const appliedCount = jobsToUse.filter((j) =>
    j.status !== 'saved'
  ).length;

  const interviewCount = jobsToUse.filter((j) =>
    ['scheduling', 'technical_interview', 'behavioural_interview', 'HR_round'].includes(j.status)
  ).length;

  const conversionRate = appliedCount > 0
    ? Math.round((interviewCount / appliedCount) * 100)
    : 0;

  const avgMatchScore = jobsToUse.length > 0
    ? Math.round(jobsToUse.reduce((acc, curr) => acc + (curr.match_score || 0), 0) / jobsToUse.length)
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Dashboard Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Application Pipeline
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your agent-curated applications and track interview progress.
          </p>
        </div>

        {/* State Toggle Dropdown as requested */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <label htmlFor="state-select" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            View State:
          </label>
          <select
            id="state-select"
            value={boardState}
            onChange={(e) => setBoardState(e.target.value as any)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="success">Loaded (Success)</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty</option>
          </select>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Scraped</span>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {boardState === 'loading' ? '...' : totalCount}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Applied</span>
            <CheckCircle2 className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {boardState === 'loading' ? '...' : appliedCount}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion</span>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {boardState === 'loading' ? '...' : `${conversionRate}%`}
            </span>
            <span className="text-xxs text-zinc-400">Applied ➔ Interview</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Match Score</span>
            <BarChart3 className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {boardState === 'loading' ? '...' : `${avgMatchScore}%`}
            </span>
            <span className="text-xxs text-zinc-400">Profile Similarity</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-hidden min-h-[500px]">
        <KanbanBoard
          jobs={jobsToUse}
          state={boardState}
          onTriggerScraper={handleTriggerScraper}
          onJobClick={handleJobClick}
        />
      </div>

      {/* Detailed View Modal */}
      <ApplicationModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveJob}
      />
    </div>
  );
}
