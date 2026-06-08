import React from 'react';
import { SlidersHorizontal, RefreshCw, X, ArrowUpDown } from 'lucide-react';
import { LogFilterOptions, LogSortOptions } from './logUtils';

interface LogFilterBarProps {
  filters: LogFilterOptions;
  sort: LogSortOptions;
  onFiltersChange: (filters: LogFilterOptions) => void;
  onSortChange: (sort: LogSortOptions) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function LogFilterBar({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onRefresh,
  isRefreshing,
}: LogFilterBarProps) {
  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, agent_name: e.target.value || undefined });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, status: e.target.value || undefined });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange({ ...sort, by: e.target.value as any });
  };

  const handleSortOrderToggle = () => {
    onSortChange({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
    onSortChange({ by: 'date', order: 'desc' });
  };

  const hasActiveFilters = filters.agent_name !== undefined || filters.status !== undefined;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
      
      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold mr-1">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </div>

        {/* Agent Filter */}
        <select
          value={filters.agent_name || ''}
          onChange={handleAgentChange}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Agents</option>
          <option value="scraper">Scraper Agent</option>
          <option value="evaluator">Evaluator Agent</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={handleStatusChange}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="idle">Idle</option>
        </select>

        {/* Sort select */}
        <select
          value={sort.by}
          onChange={handleSortByChange}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="date">Date Scraped</option>
          <option value="duration">Execution Duration</option>
          <option value="agent_name">Agent Name</option>
          <option value="status">Execution Status</option>
        </select>

        {/* Sort order toggle */}
        <button
          onClick={handleSortOrderToggle}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title={`Sort Order: ${sort.order === 'asc' ? 'Ascending' : 'Descending'}`}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Manual Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 disabled:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-950"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh Logs
      </button>
    </div>
  );
}
export type { LogFilterOptions, LogSortOptions };
