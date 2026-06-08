import React from 'react';
import { X, Clock, Calendar, AlertTriangle, Terminal, Cpu } from 'lucide-react';
import { AgentExecutionLog } from './__tests__/filterLogs.test';

interface LogDetailsModalProps {
  log: AgentExecutionLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LogDetailsModal({
  log,
  isOpen,
  onClose,
}: LogDetailsModalProps) {
  if (!isOpen || !log) return null;

  let parsedError: { message: string; stack?: string } | null = null;
  if (log.error_message) {
    try {
      parsedError = JSON.parse(log.error_message);
    } catch {
      parsedError = { message: log.error_message };
    }
  }

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Panel */}
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 capitalize">
              {log.agent_name} Execution Log
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30">
              <span className="text-xxs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Status</span>
              <span className={`inline-flex px-2 py-0.5 text-xxs font-bold rounded capitalize border ${
                log.status === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                  : log.status === 'failed'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900'
              }`}>
                {log.status}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30">
              <span className="text-xxs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Duration</span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                {log.execution_time_ms !== null ? `${log.execution_time_ms} ms` : '—'}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 sm:col-span-2 dark:border-zinc-900 dark:bg-zinc-900/30">
              <span className="text-xxs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Timestamp</span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                {formatTimestamp(log.created_at)}
              </span>
            </div>
          </div>

          {/* Log ID */}
          <div className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            Log UUID: {log.uuid}
          </div>

          {/* Details Section (Conditional Error Display) */}
          {log.status === 'failed' && parsedError ? (
            <div className="space-y-4">
              
              {/* Error Message */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  Error Message
                </h3>
                <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 text-xs font-medium text-rose-800 dark:border-rose-950/30 dark:bg-rose-950/10 dark:text-rose-400 leading-relaxed">
                  {parsedError.message}
                </div>
              </div>

              {/* Stack Trace */}
              {parsedError.stack && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                    Stack Trace
                  </h3>
                  <pre className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 overflow-x-auto text-xxs font-mono leading-normal text-zinc-600 dark:border-zinc-900 dark:bg-zinc-900/20 dark:text-zinc-400 max-h-[300px] scrollbar-thin">
                    {parsedError.stack}
                  </pre>
                </div>
              )}

            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Execution Details</h3>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/20 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The agent completed execution successfully with no errors generated. Target jobs extracted or similarities evaluated have been pushed successfully to the corresponding database nodes.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80">
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-900 text-white px-5 py-2 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
