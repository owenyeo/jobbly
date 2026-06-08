import React from 'react';
import KanbanColumn from './KanbanColumn';
import { JobApplication } from '../shared/JobCard';

interface KanbanBoardProps {
  jobs: JobApplication[];
  state: 'loading' | 'empty' | 'success';
  onTriggerScraper?: () => void;
  onJobClick?: (job: JobApplication) => void;
}

const COLUMNS = [
  { title: 'Saved', status: 'saved' },
  { title: 'Applied', status: 'applied' },
  { title: 'Scheduling', status: 'scheduling' },
  { title: 'Technical Interview', status: 'technical_interview' },
  { title: 'Behavioural Interview', status: 'behavioural_interview' },
  { title: 'HR Round', status: 'HR_round' },
  { title: 'Ghosted', status: 'ghosted' },
  { title: 'Rejected', status: 'rejected' },
];

export default function KanbanBoard({
  jobs = [],
  state = 'success',
  onTriggerScraper,
  onJobClick,
}: KanbanBoardProps) {
  return (
    <div className="flex h-full w-full gap-5 overflow-x-auto pb-6 pt-2 pr-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
      {COLUMNS.map((column) => {
        // Filter jobs for this specific column
        const columnJobs = jobs.filter((job) => job.status === column.status);
        
        // Determine individual column state.
        // If the global state is loading/empty, propagate that.
        // Otherwise, if success but this column has no jobs, it defaults to 'empty'.
        let columnState: 'loading' | 'empty' | 'success' = state;
        if (state === 'success' && columnJobs.length === 0) {
          columnState = 'empty';
        }

        return (
          <KanbanColumn
            key={column.status}
            title={column.title}
            status={column.status}
            jobs={columnJobs}
            state={columnState}
            onTriggerScraper={onTriggerScraper}
            onJobClick={onJobClick}
          />
        );
      })}
    </div>
  );
}
export type { JobApplication };
