import { JobApplication } from '@/components/shared/JobCard';

export interface JobFilterOptions {
  search?: string;
  status?: string;
  work_mode?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  matchScoreMin?: number;
  matchScoreMax?: number;
  dateStart?: string;
  dateEnd?: string;
}

export interface JobSortOptions {
  by: 'date' | 'company_name' | 'job_title' | 'status' | 'salary' | 'uuid' | 'location' | 'match_score';
  order: 'asc' | 'desc';
}

export function filterAndSortJobs(
  jobs: JobApplication[],
  filters: JobFilterOptions,
  sort: JobSortOptions
): JobApplication[] {
  let filtered = [...jobs];

  // 1. Text Search (Company Name or Job Title)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (job) =>
        job.company_name.toLowerCase().includes(searchLower) ||
        job.job_title.toLowerCase().includes(searchLower)
    );
  }

  // 2. Filter by Status
  if (filters.status) {
    filtered = filtered.filter((job) => job.status === filters.status);
  }

  // 3. Filter by Work Mode
  if (filters.work_mode) {
    filtered = filtered.filter((job) => job.work_mode === filters.work_mode);
  }

  // 4. Filter by Location
  if (filters.location) {
    const locLower = filters.location.toLowerCase();
    filtered = filtered.filter(
      (job) => job.location && job.location.toLowerCase().includes(locLower)
    );
  }

  // 5. Filter by Salary Range
  if (filters.salaryMin !== undefined) {
    filtered = filtered.filter((job) => {
      const maxSalary = job.salary_max ?? job.salary_min;
      return maxSalary !== null && maxSalary >= filters.salaryMin!;
    });
  }
  if (filters.salaryMax !== undefined) {
    filtered = filtered.filter((job) => {
      const minSalary = job.salary_min ?? job.salary_max;
      return minSalary !== null && minSalary <= filters.salaryMax!;
    });
  }

  // 6. Filter by Match Score Range
  if (filters.matchScoreMin !== undefined) {
    filtered = filtered.filter(
      (job) => job.match_score !== undefined && job.match_score >= filters.matchScoreMin!
    );
  }
  if (filters.matchScoreMax !== undefined) {
    filtered = filtered.filter(
      (job) => job.match_score !== undefined && job.match_score <= filters.matchScoreMax!
    );
  }

  // 7. Filter by Date Range (created_at)
  if (filters.dateStart) {
    const start = new Date(filters.dateStart).getTime();
    filtered = filtered.filter((job) => new Date(job.created_at).getTime() >= start);
  }
  if (filters.dateEnd) {
    const end = new Date(filters.dateEnd).getTime();
    filtered = filtered.filter((job) => new Date(job.created_at).getTime() <= end);
  }

  // 8. Sorting
  filtered.sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    switch (sort.by) {
      case 'date':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'company_name':
        aVal = a.company_name.toLowerCase();
        bVal = b.company_name.toLowerCase();
        break;
      case 'job_title':
        aVal = a.job_title.toLowerCase();
        bVal = b.job_title.toLowerCase();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'salary':
        // Sort by upper range first, fallback to lower range
        aVal = a.salary_max ?? a.salary_min ?? 0;
        bVal = b.salary_max ?? b.salary_min ?? 0;
        break;
      case 'uuid':
        aVal = a.uuid;
        bVal = b.uuid;
        break;
      case 'location':
        aVal = (a.location || '').toLowerCase();
        bVal = (b.location || '').toLowerCase();
        break;
      case 'match_score':
        aVal = a.match_score ?? 0;
        bVal = b.match_score ?? 0;
        break;
      default:
        break;
    }

    if (aVal < bVal) return sort.order === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.order === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}
