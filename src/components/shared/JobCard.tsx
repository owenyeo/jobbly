import React from 'react';
import { ExternalLink, MapPin, Briefcase } from 'lucide-react';

import { JobApplication } from '@/types';

interface JobCardProps {
  job: JobApplication;
  onClick?: () => void;
}

export default function JobCard({ job, onClick }: JobCardProps) {
  // Generate colors based on status
  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50';
    return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50';
  };

  const formattedSalary = job.salary_min && job.salary_max
    ? `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`
    : job.salary_min
    ? `>= $${(job.salary_min / 1000).toFixed(0)}k`
    : 'Salary undisclosed';

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 dark:border-zinc-800/80 dark:bg-zinc-950 dark:hover:border-indigo-900/50 cursor-pointer"
    >
      {/* Background soft glow on hover */}
      <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-indigo-950/20" />
      
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-zinc-900 line-clamp-1 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {job.job_title}
          </h4>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-0.5">
            {job.company_name}
          </p>
        </div>

        {job.match_score !== undefined && (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${getMatchScoreColor(job.match_score)}`}>
            {job.match_score}% Match
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded">
          <MapPin className="h-3 w-3" />
          <span>{job.location || 'Remote'}</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded capitalize">
          <Briefcase className="h-3 w-3" />
          <span>{job.work_mode.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {formattedSalary}
        </span>
        <a
          href={job.application_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="Open application link"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
export type { JobApplication };
