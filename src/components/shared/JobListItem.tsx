import React from 'react';
import { ExternalLink, MapPin, Briefcase, Calendar } from 'lucide-react';
import { JobApplication } from './JobCard';

interface JobListItemProps {
  job: JobApplication;
  onClick?: () => void;
}

export default function JobListItem({ job, onClick }: JobListItemProps) {
  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50';
    return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saved':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';
      case 'applied':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
      case 'ghosted':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
      default:
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300';
    }
  };

  const getDecisionColor = (decision?: string) => {
    switch (decision) {
      case 'pass':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'fallback':
        return 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'drop':
        return 'bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
      default:
        return 'bg-zinc-50 text-zinc-600 border border-zinc-200/50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  const formattedSalary = job.salary_min && job.salary_max
    ? `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`
    : job.salary_min
    ? `>= $${(job.salary_min / 1000).toFixed(0)}k`
    : 'Undisclosed';

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 dark:border-zinc-800/80 dark:bg-zinc-950 dark:hover:border-indigo-900/50 cursor-pointer"
    >
      {/* Background soft glow on hover */}
      <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-50/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-indigo-950/10" />

      {/* Left Area: Title, Company, location, date */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
        <div className="flex-1">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {job.job_title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-300">{job.company_name}</span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location || 'Remote'}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {(() => {
                try {
                  const d = new Date(job.created_at);
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
                } catch {
                  return '';
                }
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Right Area: Metadata Badges */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* Salary */}
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 rounded-lg">
          {formattedSalary}
        </span>

        {/* Work Mode */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg capitalize bg-zinc-50 text-zinc-700 border border-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
          <Briefcase className="h-3 w-3" />
          {job.work_mode.replace('_', ' ')}
        </span>

        {/* Status */}
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${getStatusColor(job.status)}`}>
          {job.status.replace('_', ' ')}
        </span>

        {/* Agent Decision */}
        {job.agent_decision && (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize ${getDecisionColor(job.agent_decision)}`}>
            Agent: {job.agent_decision}
          </span>
        )}

        {/* Match Score */}
        {job.match_score !== undefined && (
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border ${getMatchScoreColor(job.match_score)}`}>
            {job.match_score}% Match
          </span>
        )}

        {/* Link Out */}
        <a
          href={job.application_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent modal trigger
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:text-white border border-indigo-200 hover:bg-indigo-600 hover:border-indigo-600 dark:border-indigo-900/50 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 transition-all"
          title="Open application link"
        >
          <span>Apply</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
