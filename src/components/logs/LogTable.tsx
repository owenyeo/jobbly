import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { AgentExecutionLog } from '@/types';

interface LogTableProps {
  logs: AgentExecutionLog[];
  onRowClick: (log: AgentExecutionLog) => void;
}

export default function LogTable({ logs, onRowClick }: LogTableProps) {
  // Deterministic locale-independent UTC formatting to prevent hydration mismatches
  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: AgentExecutionLog['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case 'idle':
        default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <HelpCircle className="h-3 w-3" />
            Idle
          </span>
        );
    }
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms}ms`;
  };

  const parseErrorMessage = (errorStr: string | null) => {
    if (!errorStr) return '—';
    try {
      const parsed = JSON.parse(errorStr);
      return parsed.message || errorStr;
    } catch {
      return errorStr;
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
      <table className="w-full text-left border-collapse text-xs font-sans">
        <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xxs font-bold uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/20">
          <tr>
            <th className="px-6 py-4">Timestamp</th>
            <th className="px-6 py-4">Agent Name</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Execution Time</th>
            <th className="px-6 py-4 max-w-xs truncate">Log Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-zinc-700 dark:text-zinc-300">
          {logs.length > 0 ? (
            logs.map((log) => (
              <tr
                key={log.uuid}
                onClick={() => onRowClick(log)}
                className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-all duration-150 cursor-pointer"
              >
                <td className="px-6 py-4 font-mono font-medium text-zinc-500 dark:text-zinc-400">
                  {formatTimestamp(log.created_at)}
                </td>
                <td className="px-6 py-4 font-semibold capitalize text-zinc-900 dark:text-zinc-50">
                  {log.agent_name}
                </td>
                <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                <td className="px-6 py-4 font-medium">{formatDuration(log.execution_time_ms)}</td>
                <td className="px-6 py-4 font-mono text-xxs max-w-xs truncate text-zinc-500 dark:text-zinc-400">
                  {parseErrorMessage(log.error_message)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-16 text-center text-zinc-400">
                No logs found matching filter selections.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export type { AgentExecutionLog };
