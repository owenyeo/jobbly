import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { JobFilterOptions, JobSortOptions } from './filterUtils';

interface JobFiltersProps {
  filters: JobFilterOptions;
  sort: JobSortOptions;
  onFiltersChange: (filters: JobFilterOptions) => void;
  onSortChange: (sort: JobSortOptions) => void;
  uniqueLocations: string[];
}

export default function JobFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  uniqueLocations,
}: JobFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, status: e.target.value || undefined });
  };

  const handleWorkModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, work_mode: e.target.value || undefined });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, location: e.target.value || undefined });
  };

  const handleSalaryChange = (field: 'salaryMin' | 'salaryMax', value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    onFiltersChange({ ...filters, [field]: num });
  };

  const handleMatchScoreChange = (field: 'matchScoreMin' | 'matchScoreMax', value: string) => {
    const num = value === '' ? undefined : parseInt(value, 10);
    onFiltersChange({ ...filters, [field]: num });
  };

  const handleDateChange = (field: 'dateStart' | 'dateEnd', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange({ ...sort, by: e.target.value as any });
  };

  const handleSortOrderToggle = () => {
    onSortChange({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' });
  };

  const handleClearAll = () => {
    onFiltersChange({});
    onSortChange({ by: 'date', order: 'desc' });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
      {/* Search and Primary Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search by job title or company name..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs shadow-inner outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:bg-zinc-950"
          />
        </div>

        {/* Primary Filter selects */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="">All Statuses</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="scheduling">Scheduling</option>
            <option value="technical_interview">Technical Interview</option>
            <option value="behavioural_interview">Behavioural Interview</option>
            <option value="HR_round">HR Round</option>
            <option value="ghosted">Ghosted</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Work Mode */}
          <select
            value={filters.work_mode || ''}
            onChange={handleWorkModeChange}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <option value="">All Work Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On Site</option>
          </select>

          {/* Toggle Advanced */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
              showAdvanced
                ? 'border-indigo-200 bg-indigo-50/50 text-indigo-600 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-400'
                : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>

          {/* Sort trigger order button */}
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
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Expandable Grid */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Location Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-zinc-400">Location</label>
            <select
              value={filters.location || ''}
              onChange={handleLocationChange}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Salary Range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-zinc-400">Salary Range (SGD)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.salaryMin || ''}
                onChange={(e) => handleSalaryChange('salaryMin', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.salaryMax || ''}
                onChange={(e) => handleSalaryChange('salaryMax', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Match Score Range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-zinc-400">Match Score (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min %"
                min="0"
                max="100"
                value={filters.matchScoreMin || ''}
                onChange={(e) => handleMatchScoreChange('matchScoreMin', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
              <span className="text-zinc-400">-</span>
              <input
                type="number"
                placeholder="Max %"
                min="0"
                max="100"
                value={filters.matchScoreMax || ''}
                onChange={(e) => handleMatchScoreChange('matchScoreMax', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Sorting Option */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-zinc-400">Sort By</label>
            <select
              value={sort.by}
              onChange={handleSortByChange}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="date">Date Scraped</option>
              <option value="company_name">Company Name</option>
              <option value="job_title">Job Title</option>
              <option value="status">Application Status</option>
              <option value="salary">Salary Range</option>
              <option value="uuid">UUID Primary Key</option>
              <option value="location">Location</option>
              <option value="match_score">Match Score</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xxs font-bold uppercase tracking-wider text-zinc-400">Date Range Scraped</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateStart || ''}
                onChange={(e) => handleDateChange('dateStart', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
              />
              <span className="text-zinc-400">to</span>
              <input
                type="date"
                value={filters.dateEnd || ''}
                onChange={(e) => handleDateChange('dateEnd', e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type { JobFilterOptions, JobSortOptions };
