'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Edit3, FileText, Code, ExternalLink } from 'lucide-react';
import { JobApplication } from '../shared/JobCard';

interface JobDetailsModalProps {
  job: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedJob: JobApplication) => void;
  onDelete?: (jobUuid: string) => void;
}

export default function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'structured' | 'raw'>('structured');
  const [status, setStatus] = useState<JobApplication['status']>('saved');
  const [interviewDate, setInterviewDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with selected job
  useEffect(() => {
    if (job) {
      setStatus(job.status);
      setInterviewDate(job.interview_date || '');
      setNotes(job.notes || '');
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.uuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          interview_date: interviewDate || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save changes.');
      }

      if (onSave) {
        onSave({
          ...job,
          status,
          interview_date: interviewDate || null,
          notes: notes || null,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving job details:', err);
      alert(err.message || 'An error occurred while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.uuid}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (onDelete) {
          onDelete(job.uuid);
        }
        onClose();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete job.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the job.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getMatchScoreColors = (score?: number) => {
    if (!score) return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-850 dark:text-zinc-300';
    if (score >= 85) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40';
    return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out drawer layout */}
      <div className="relative flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-4 dark:border-zinc-800/80">
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border mb-2 ${getMatchScoreColors(job.match_score)}`}>
              {job.match_score ? `${job.match_score}% Profile Match` : 'Unparsed / No score'}
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
              {job.job_title}
            </h2>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
              {job.company_name} — {job.location || 'Remote'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Column: Job Description Tabs (Scrolls) */}
          <div className="flex flex-1 flex-col p-6 overflow-y-auto border-r border-zinc-200/60 dark:border-zinc-800/60">
            {/* Tab switchers */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-900 mb-4">
              <button
                onClick={() => setActiveTab('structured')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'structured'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                Structured Details
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === 'raw'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Code className="h-4 w-4" />
                Raw Scraped HTML
              </button>
            </div>

            {/* Tab Panels */}
            <div className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              {activeTab === 'structured' ? (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Role & Requirements</h3>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-900 dark:bg-zinc-900/30">
                    <p className="whitespace-pre-line leading-relaxed">
                      {job.structured_description || (
                        `This job is currently in "${job.status}" status. The evaluation pipeline structure parses descriptions into distinct roles, technical stacks, and experience guidelines.
                        
                        To trigger fresh vector embeddings and match rankings, move this application to another pipeline state or queue.`
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Scraped HTML Source</h3>
                  <pre className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 overflow-x-auto text-xxs font-mono leading-normal text-zinc-600 dark:border-zinc-900 dark:bg-zinc-900/20 dark:text-zinc-400 max-h-[400px]">
                    {`<!-- Scraped application_link: ${job.application_link} -->
<html>
  <body>
    <h1>${job.job_title} at ${job.company_name}</h1>
    <p>Location: ${job.location || 'Singapore'}</p>
    <p>Work Mode: ${job.work_mode}</p>
    <!-- Raw HTML source captured during scraper execution lifecycle -->
  </body>
</html>`}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Edit Panel (Sticky Side) */}
          <div className="w-80 shrink-0 bg-zinc-50/50 p-6 dark:bg-zinc-900/10 flex flex-col justify-between overflow-y-auto border-l border-zinc-200/50 dark:border-zinc-800/50">
            <div className="space-y-6">
              {/* Apply / View Listing Link Button */}
              <a
                href={job.application_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Apply / View Listing</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Edit Details Link */}
              <Link
                href={`/jobs/${job.uuid}/edit`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Job Details</span>
              </Link>

              <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 pt-5 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Manage Pipeline</h3>

                {/* Status Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Application Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="scheduling">Scheduling</option>
                    <option value="technical_interview">Technical Interview</option>
                    <option value="behavioural_interview">Behavioural Interview</option>
                    <option value="HR_round">HR Round</option>
                    <option value="ghosted">Ghosted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Scheduler Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Schedule Interview</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-300"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Personal Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Add interviews guidelines, preparation links, or follow-ups..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-650 hover:bg-red-50 dark:border-red-950/30 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-850"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
