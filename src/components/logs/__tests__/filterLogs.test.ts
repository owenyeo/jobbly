import { describe, it, expect } from 'vitest';
import { filterAndSortLogs, LogFilterOptions, LogSortOptions } from '../logUtils';

import { AgentExecutionLog } from '@/types';

const mockLogs: AgentExecutionLog[] = [
  {
    uuid: 'l1',
    agent_name: 'scraper',
    status: 'success',
    error_message: null,
    execution_time_ms: 1200,
    created_at: '2026-06-08T01:00:00.000Z',
  },
  {
    uuid: 'l2',
    agent_name: 'evaluator',
    status: 'failed',
    error_message: JSON.stringify({
      message: 'DeepSeek API rate limit exceeded',
      stack: 'Error: Rate limit at evalNode (nodes/rank.ts:24:12)',
    }),
    execution_time_ms: 5500,
    created_at: '2026-06-08T02:00:00.000Z',
  },
  {
    uuid: 'l3',
    agent_name: 'scraper',
    status: 'failed',
    error_message: JSON.stringify({
      message: 'Forbidden (403) from LinkedIn crawler block',
      stack: 'Error: Scraper blocked at crawl (scraper.ts:15:3)',
    }),
    execution_time_ms: 2500,
    created_at: '2026-06-08T01:30:00.000Z',
  },
];

describe('filterAndSortLogs utility', () => {
  it('filters by status', () => {
    const filters: LogFilterOptions = { status: 'failed' };
    const result = filterAndSortLogs(mockLogs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(2);
    expect(result.every((log) => log.status === 'failed')).toBe(true);
  });

  it('filters by agent name', () => {
    const filters: LogFilterOptions = { agent_name: 'evaluator' };
    const result = filterAndSortLogs(mockLogs, filters, { by: 'date', order: 'desc' });
    expect(result.length).toBe(1);
    expect(result[0].agent_name).toBe('evaluator');
  });

  it('sorts by created_at date', () => {
    const sort: LogSortOptions = { by: 'date', order: 'asc' };
    const result = filterAndSortLogs(mockLogs, {}, sort);
    expect(result[0].uuid).toBe('l1');
    expect(result[1].uuid).toBe('l3');
    expect(result[2].uuid).toBe('l2');
  });

  it('sorts by execution_time_ms duration', () => {
    const sort: LogSortOptions = { by: 'duration', order: 'desc' };
    const result = filterAndSortLogs(mockLogs, {}, sort);
    expect(result[0].execution_time_ms).toBe(5500);
    expect(result[1].execution_time_ms).toBe(2500);
    expect(result[2].execution_time_ms).toBe(1200);
  });
});
export type { AgentExecutionLog };
