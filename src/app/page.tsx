'use client';

import React from 'react';
import Link from 'next/link';
import { JobApplication } from '@/components/shared/JobCard';
import { ArrowRight, Sparkles, AlertCircle, Layers, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';

// Unified mock data sharing the same mock jobs as dashboard/jobs pages
const mockJobs: JobApplication[] = [
  {
    uuid: '11111111-1111-1111-1111-111111111111',
    company_name: 'Apple',
    job_title: 'iOS Engineer',
    location: 'Singapore',
    work_mode: 'on_site',
    application_link: 'https://apple.com/careers',
    created_at: new Date().toISOString(),
    status: 'saved',
    salary_min: 6000,
    salary_max: 8000,
    match_score: 95,
  },
  {
    uuid: '66666666-6666-6666-6666-666666666666',
    company_name: 'Canva',
    job_title: 'Frontend Engineer',
    location: 'Remote',
    work_mode: 'remote',
    application_link: 'https://canva.com/careers',
    created_at: new Date().toISOString(),
    status: 'HR_round',
    salary_min: 8000,
    salary_max: 11000,
    match_score: 95,
  },
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
];

export default function HomePage() {
  // Sort jobs by match score descending to display the top similarity matches
  const topMatches = [...mockJobs]
    .filter((j) => j.match_score !== undefined)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  // Compute metrics
  const totalCount = mockJobs.length;
  const appliedCount = mockJobs.filter((j) => j.status !== 'saved').length;
  const interviewCount = mockJobs.filter((j) =>
    ['scheduling', 'technical_interview', 'behavioural_interview', 'HR_round'].includes(j.status)
  ).length;
  
  const conversionRate = appliedCount > 0 
    ? Math.round((interviewCount / appliedCount) * 100) 
    : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 max-w-5xl mx-auto py-4">
      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-8 dark:border-zinc-800/80 dark:bg-zinc-950">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl dark:from-indigo-950/40 dark:to-purple-950/40" />
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl leading-tight">
          Welcome back, Owen.
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
          Jobbly Agent is monitoring 3 job boards. 5 new jobs were scraped in the last 24 hours. The extraction engine has evaluated them against your ML / Systems software engineer profile.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all"
          >
            Open Pipeline Board
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
          >
            View Scraped Listings
          </Link>
        </div>
      </div>

      {/* Main Grid: Overview stats & AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Stats summary card */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pipeline Metrics</h3>
          
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-900">
              <span className="text-xs font-medium text-zinc-500">Total Scraped</span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{totalCount}</span>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-900">
              <span className="text-xs font-medium text-zinc-500">Applications Submitted</span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{appliedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Interview Conversion</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{conversionRate}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: AI overview and recommendations strategy card */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            AI Strategy Insights
          </h3>
          
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-bold text-zinc-900 dark:text-zinc-50 block mb-1">Strong profile alignments detected</span>
                Your profile vector matches strongly with positions referencing **Systems Design**, **pgvector**, and **Message Queues/Kafka**. Jobs from **Apple** and **Canva** exceed a 95% similarity match.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-bold text-zinc-900 dark:text-zinc-50 block mb-1">Application recommendations</span>
                You have 3 saved jobs matching &gt;90% that you have not applied to yet. We suggest initiating scheduling checks on **Google (Systems Engineer)**.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Top 10 Similar Matches */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Top Similarity Match Rankings</h3>
        
        <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden dark:border-zinc-800/80 dark:bg-zinc-950 shadow-sm">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {topMatches.slice(0, 10).map((job, index) => {
              const score = job.match_score || 0;
              return (
                <div key={job.uuid} className="flex items-center justify-between p-4 text-xs hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-zinc-300 dark:text-zinc-700 font-bold w-4">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">{job.job_title}</h4>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">{job.company_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Score */}
                    <span className={`px-2 py-0.5 rounded text-xxs font-bold border ${
                      score >= 85
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {score}% Similarity
                    </span>
                    
                    {/* Status */}
                    <span className="capitalize text-zinc-500 dark:text-zinc-400 font-semibold">{job.status.replace('_', ' ')}</span>
                    
                    {/* Link */}
                    <a
                      href={job.application_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold"
                    >
                      Apply Link
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
