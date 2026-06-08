'use client';

import React, { useState, useMemo } from 'react';
import LogFilterBar from '@/components/logs/LogFilterBar';
import LogTable from '@/components/logs/LogTable';
import LogDetailsModal from '@/components/logs/LogDetailsModal';
import { filterAndSortLogs, LogFilterOptions, LogSortOptions } from '@/components/logs/logUtils';
import { AgentExecutionLog } from '@/components/logs/__tests__/filterLogs.test';

const initialMockLogs: AgentExecutionLog[] = [
  {
    uuid: 'uuid-log-01',
    agent_name: 'scraper',
    status: 'success',
    error_message: null,
    execution_time_ms: 1850,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
  },
  {
    uuid: 'uuid-log-02',
    agent_name: 'evaluator',
    status: 'failed',
    error_message: JSON.stringify({
      message: 'DeepSeek API rate limit exceeded (429)',
      stack: 'Error: Rate limit hit at callDeepSeek (nodes/rank.ts:24:12)\n    at Object.processNode (nodes/vectorize.ts:18:24)\n    at async runOrchestration (graph.ts:114:9)',
    }),
    execution_time_ms: 5400,
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
  },
  {
    uuid: 'uuid-log-03',
    agent_name: 'scraper',
    status: 'failed',
    error_message: JSON.stringify({
      message: 'Forbidden (403) LinkedIn scraping target crawl block',
      stack: 'Error: Scraper crawler blocked by Cloudflare challenge (scraper.ts:15:3)\n    at async runScrape (scraper_engine.ts:44:9)',
    }),
    execution_time_ms: 2200,
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(), // 1.5 hours ago
  },
  {
    uuid: 'uuid-log-04',
    agent_name: 'evaluator',
    status: 'success',
    error_message: null,
    execution_time_ms: 4800,
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 mins ago
  },
  {
    uuid: 'uuid-log-05',
    agent_name: 'evaluator',
    status: 'running',
    error_message: null,
    execution_time_ms: null,
    created_at: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
  },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<AgentExecutionLog[]>(initialMockLogs);
  const [filters, setFilters] = useState<LogFilterOptions>({});
  const [sort, setSort] = useState<LogSortOptions>({ by: 'date', order: 'desc' });
  const [selectedLog, setSelectedLog] = useState<AgentExecutionLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and sort logs list
  const processedLogs = useMemo(() => {
    return filterAndSortLogs(logs, filters, sort);
  }, [logs, filters, sort]);

  const handleRowClick = (log: AgentExecutionLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Create a new mock running log for demonstration
      const newLog: AgentExecutionLog = {
        uuid: `uuid-log-${Date.now()}`,
        agent_name: Math.random() > 0.5 ? 'scraper' : 'evaluator',
        status: 'success',
        error_message: null,
        execution_time_ms: Math.floor(Math.random() * 2000) + 1000,
        created_at: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Agent Execution Logs
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Monitor background scraping cycles, parser runtimes, and similarity matches logs in real-time.
        </p>
      </div>

      {/* Filter and Control Bar */}
      <LogFilterBar
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Log Table display */}
      <div className="flex-1">
        <LogTable logs={processedLogs} onRowClick={handleRowClick} />
      </div>

      {/* Details View Modal */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
