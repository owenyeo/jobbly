'use client';

import React, { useState } from 'react';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import { JobApplication } from '@/components/shared/JobCard';
import { Layers, CheckCircle2, CalendarDays, TrendingUp, BarChart3 } from 'lucide-react';

const mockJobs: JobApplication[] = [
  {
    uuid: '1',
    company_name: 'Google',
    job_title: 'Software Engineer (Systems)',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://careers.google.com/jobs/1',
    created_at: new Date().toISOString(),
    status: 'saved',
    salary_min: 8000,
    salary_max: 11000,
    match_score: 92,
  },
  {
    uuid: '2',
    company_name: 'Stripe',
    job_title: 'Forward Deployed Engineer',
    location: 'Singapore',
    work_mode: 'remote',
    application_link: 'https://stripe.com/jobs/2',
    created_at: new Date().toISOString(),
    status: 'applied',
    salary_min: 9000,
    salary_max: 13000,
    match_score: 88,
  },
  {
    uuid: '3',
    company_name: 'Bytedance',
    job_title: 'Backend Engineer (Data Platform)',
    location: 'Singapore',
    work_mode: 'on_site',
    application_link: 'https://careers.bytedance.com/jobs/3',
    created_at: new Date().toISOString(),
    status: 'applied',
    salary_min: 7500,
    salary_max: 10500,
    match_score: 74,
  },
  {
    uuid: '4',
    company_name: 'Grab',
    job_title: 'Machine Learning Engineer',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://grab.careers/jobs/4',
    created_at: new Date().toISOString(),
    status: 'scheduling',
    salary_min: 8500,
    salary_max: 12000,
    match_score: 81,
  },
  {
    uuid: '5',
    company_name: 'Shopee',
    job_title: 'Full Stack Developer',
    location: 'Singapore',
    work_mode: 'on_site',
    application_link: 'https://careers.shopee.sg/jobs/5',
    created_at: new Date().toISOString(),
    status: 'technical_interview',
    salary_min: 6500,
    salary_max: 9500,
    match_score: 68,
  },
  {
    uuid: '6',
    company_name: 'Canva',
    job_title: 'Frontend Engineer',
    location: 'Remote',
    work_mode: 'remote',
    application_link: 'https://canva.com/careers/6',
    created_at: new Date().toISOString(),
    status: 'HR_round',
    salary_min: 8000,
    salary_max: 11000,
    match_score: 95,
  },
  {
    uuid: '7',
    company_name: 'Meta',
    job_title: 'Production Engineer',
    location: 'Singapore',
    work_mode: 'hybrid',
    application_link: 'https://meta.com/careers/7',
    created_at: new Date().toISOString(),
    status: 'rejected',
    salary_min: 10000,
    salary_max: 14000,
    match_score: 90,
  },
];

export default function DashboardPage() {
  const [boardState, setBoardState] = useState<'success' | 'loading' | 'empty'>('success');

  // Trigger scraper mock action
  const handleTriggerScraper = () => {
    alert('Mock Action: Scraper engine triggered!');
  };

  // Derive metrics from mock jobs (only applicable if we are in success state)
  const jobsToUse = boardState === 'success' ? mockJobs : [];
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
        />
      </div>
    </div>
  );
}
