'use client';

import React, { useState, useMemo } from 'react';
import LogFilterBar from '@/components/logs/LogFilterBar';
import LogTable from '@/components/logs/LogTable';
import LogDetailsModal from '@/components/logs/LogDetailsModal';
import { filterAndSortLogs, LogFilterOptions, LogSortOptions } from '@/components/logs/logUtils';
import { AgentExecutionLog } from '@/types';
import { createClient } from '@/lib/supabase/client';



export default function LogsPage() {
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [filters, setFilters] = useState<LogFilterOptions>({});
  const [sort, setSort] = useState<LogSortOptions>({ by: 'date', order: 'desc' });
  const [selectedLog, setSelectedLog] = useState<AgentExecutionLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    async function loadLogs() {
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from('agent_execution_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          setLogs(data);
        }
      } catch (error) {
        console.error('Error loading logs:', error);
      }
    }
    loadLogs();
  }, []);

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
