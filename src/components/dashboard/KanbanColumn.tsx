import React from 'react';
import JobCard, { JobApplication } from '../shared/JobCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: string;
  jobs: JobApplication[];
  state: 'loading' | 'empty' | 'success';
  onTriggerScraper?: () => void;
}

export default function KanbanColumn({
  title,
  status,
  jobs,
  state,
  onTriggerScraper,
}: KanbanColumnProps) {
  const isColumnEmpty = jobs.length === 0;

  // Status-specific color formatting for headers
  const getHeaderColors = (colStatus: string) => {
    switch (colStatus) {
      case 'saved':
        return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800';
      case 'applied':
        return 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50';
      case 'scheduling':
      case 'technical_interview':
      case 'behavioural_interview':
      case 'HR_round':
        return 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/50';
      case 'rejected':
        return 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50';
      case 'ghosted':
        return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50';
      default:
        return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800';
    }
  };

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-xl bg-zinc-50/50 p-4 border border-zinc-200/50 dark:bg-zinc-900/20 dark:border-zinc-800/50 h-[calc(100vh-250px)]">
      {/* Column Header */}
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border-l-4 font-semibold text-sm ${getHeaderColors(status)} shadow-sm mb-4`}>
        <span>{title}</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs font-bold shadow-sm dark:bg-zinc-950/80">
          {state === 'loading' ? '...' : jobs.length}
        </span>
      </div>

      {/* Cards Area */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {state === 'loading' ? (
          // Loading skeletons
          Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              data-testid="skeleton-card"
              className="h-32 w-full animate-pulse rounded-xl border border-zinc-100 bg-zinc-200/60 p-5 dark:border-zinc-900 dark:bg-zinc-800/60"
            />
          ))
        ) : state === 'empty' || isColumnEmpty ? (
          // Empty State per UI Spec
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800/80 bg-white/30 dark:bg-zinc-950/10">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              No jobs found
            </p>
            {onTriggerScraper && (
              <button
                onClick={onTriggerScraper}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-all hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Trigger Scraper Engine
              </button>
            )}
          </div>
        ) : (
          // Normal success state: list of cards
          jobs.map((job) => <JobCard key={job.uuid} job={job} />)
        )}
      </div>
    </div>
  );
}
