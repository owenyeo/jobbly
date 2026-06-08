import { AgentExecutionLog } from './__tests__/filterLogs.test';

export interface LogFilterOptions {
  status?: string;
  agent_name?: string;
}

export interface LogSortOptions {
  by: 'date' | 'duration' | 'agent_name' | 'status';
  order: 'asc' | 'desc';
}

export function filterAndSortLogs(
  logs: AgentExecutionLog[],
  filters: LogFilterOptions,
  sort: LogSortOptions
): AgentExecutionLog[] {
  let filtered = [...logs];

  // 1. Filter by status
  if (filters.status) {
    filtered = filtered.filter((log) => log.status === filters.status);
  }

  // 2. Filter by agent name
  if (filters.agent_name) {
    filtered = filtered.filter((log) => log.agent_name === filters.agent_name);
  }

  // 3. Sort
  filtered.sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';

    switch (sort.by) {
      case 'date':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'duration':
        aVal = a.execution_time_ms ?? 0;
        bVal = b.execution_time_ms ?? 0;
        break;
      case 'agent_name':
        aVal = a.agent_name.toLowerCase();
        bVal = b.agent_name.toLowerCase();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
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
