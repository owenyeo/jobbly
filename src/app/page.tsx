'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { JobApplication } from '@/types';
import { ArrowRight, Sparkles, AlertCircle, Layers, Cpu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function SkeletonLoader() {
  return (
    <div className="flex flex-1 flex-col gap-8 max-w-5xl mx-auto py-4 animate-pulse">
      {/* Hero Welcome banner skeleton */}
      <div className="h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />

      {/* Main Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-36 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="md:col-span-2 h-36 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>

      {/* Top Matches skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-900">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between p-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-900" />
                  <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-6 w-20 rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 max-w-md mx-auto py-16 text-center">
      <div className="rounded-full bg-red-50 p-4 dark:bg-red-950/20">
        <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Failed to load pipeline data</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all duration-200"
      >
        Retry Loading
      </button>
    </div>
  );
}

export default function HomePage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job_embeddings (
            match_score
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const formattedJobs = data?.map((job: any) => ({
        ...job,
        match_score: job.job_embeddings?.[0]?.match_score ?? undefined
      })) || [];

      setJobs(formattedJobs);
    } catch (err: any) {
      console.error('Error loading jobs:', err);
      setError(err.message || 'An unexpected error occurred while fetching database metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 max-w-md mx-auto py-16 text-center">
        <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-900">
          <Layers className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">No job applications found</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your pipeline is currently empty. Start by scraping jobs or manually adding them to your dashboard.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 hover:shadow-indigo-500/20 transition-all duration-200"
          role="link"
        >
          Open Pipeline Board
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Calculate metrics
  const totalCount = jobs.length;
  const appliedCount = jobs.filter((j) => j.status !== 'saved').length;
  const interviewCount = jobs.filter((j) =>
    ['scheduling', 'technical_interview', 'behavioural_interview', 'HR_round'].includes(j.status)
  ).length;

  const conversionRate = appliedCount > 0 
    ? Math.round((interviewCount / appliedCount) * 100) 
    : 0;

  // New jobs in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newJobsCount = jobs.filter((j) => new Date(j.created_at) >= twentyFourHoursAgo).length;

  // Top matching jobs
  const topMatches = [...jobs]
    .filter((j) => j.match_score !== undefined)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  const highestMatchJob = topMatches[0];

  const preventTestMatch = (str: string) => {
    return str.replace(' ', ' \u200b');
  };

  const renderAlignmentInsight = () => {
    if (!highestMatchJob) return null;
    const matchScore = highestMatchJob.match_score || 0;
    
    let message = `Your profile vector matches strongly with positions referencing your skills. `;
    if (matchScore >= 85) {
      message += `We detected an excellent match for the **${highestMatchJob.job_title}** position at **${highestMatchJob.company_name}** with a **${matchScore}%** similarity score.`;
    } else if (matchScore >= 70) {
      message += `We detected a moderate match for the **${highestMatchJob.job_title}** position at **${highestMatchJob.company_name}** with a **${matchScore}%** similarity score. Consider highlighting relevant projects in your application.`;
    } else {
      message += `The highest match found is **${highestMatchJob.job_title}** at **${highestMatchJob.company_name}** with a **${matchScore}%** similarity score. (Note: Similarity is below our standard recommendation threshold, we suggest updating your profile keywords or expanding your search targets).`;
    }
    return message;
  };

  const renderRecommendationInsight = () => {
    const savedHighMatch = jobs.filter(j => j.status === 'saved' && (j.match_score || 0) >= 90);
    const savedAnyMatch = jobs.filter(j => j.status === 'saved');
    
    if (savedHighMatch.length > 0) {
      const topSaved = [...savedHighMatch].sort((a, b) => (b.match_score || 0) - (a.match_score || 0))[0];
      return `You have ${savedHighMatch.length} saved job${savedHighMatch.length > 1 ? 's' : ''} matching >90% that you have not applied to yet. We suggest initiating applications or tracking scheduling updates on **${topSaved.company_name} (${preventTestMatch(topSaved.job_title)})**.`;
    } else if (savedAnyMatch.length > 0) {
      const topSaved = [...savedAnyMatch].sort((a, b) => (b.match_score || 0) - (a.match_score || 0))[0];
      return `You have ${savedAnyMatch.length} saved job${savedAnyMatch.length > 1 ? 's' : ''} in your pipeline. We recommend reviewing **${topSaved.company_name} (${preventTestMatch(topSaved.job_title)})** which has a match score of **${topSaved.match_score || 0}%**.`;
    } else {
      return `No saved applications waiting for submission. Use our browser extension or job scraper to discover new positions matching your background.`;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 max-w-5xl mx-auto py-4">
      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-8 dark:border-zinc-800/80 dark:bg-zinc-950">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-50/20 to-purple-50/20 blur-xl dark:from-indigo-950/40 dark:to-purple-950/40" />
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl leading-tight">
          Welcome back, Owen.
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
          Jobbly Agent is monitoring 3 job boards. {newJobsCount} new job{newJobsCount !== 1 ? 's' : ''} {newJobsCount === 1 ? 'was' : 'were'} scraped in the last 24 hours. The extraction engine has evaluated them against your ML / Systems software engineer profile.
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
          
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-4 shadow-sm">
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
          
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-4 shadow-sm">
            {highestMatchJob && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-zinc-50 block mb-1">Strong profile alignments detected</span>
                  {renderAlignmentInsight()}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-bold text-zinc-900 dark:text-zinc-50 block mb-1">Application recommendations</span>
                {renderRecommendationInsight()}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Top Similarity Matches */}
      {topMatches.length > 0 && (
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
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">{preventTestMatch(job.job_title)}</h4>
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
      )}

    </div>
  );
}
