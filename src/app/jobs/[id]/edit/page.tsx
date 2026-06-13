'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function JobsEditPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    location: '',
    work_mode: 'remote',
    application_link: '',
    status: 'saved',
    salary_min: '',
    salary_max: '',
    structured_description: '',
  });
  
  const [reevaluate, setReevaluate] = useState(false);

  useEffect(() => {
    async function loadJobDetails() {
      try {
        const supabase = createClient();
        const { data, error: dbError } = await supabase
          .from('job_applications')
          .select('*')
          .eq('uuid', id)
          .single();

        if (dbError) {
          throw new Error(dbError.message);
        }

        if (data) {
          setFormData({
            company_name: data.company_name || '',
            job_title: data.job_title || '',
            location: data.location || '',
            work_mode: data.work_mode || 'remote',
            application_link: data.application_link || '',
            status: data.status || 'saved',
            salary_min: data.salary_min !== null ? String(data.salary_min) : '',
            salary_max: data.salary_max !== null ? String(data.salary_max) : '',
            structured_description: data.structured_description || '',
          });
        }
      } catch (err: any) {
        console.error('Failed to load job:', err);
        setError(err.message || 'Could not load job details.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadJobDetails();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.company_name || !formData.job_title || !formData.application_link) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary_min: formData.salary_min ? Number(formData.salary_min) : null,
          salary_max: formData.salary_max ? Number(formData.salary_max) : null,
          reevaluate,
        }),
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message || 'Failed to update job.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error updating job:', err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this job listing? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message || 'Failed to delete job.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error deleting job:', err);
      setError(err.message || 'An unexpected error occurred while deleting.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col justify-center items-center py-16 animate-pulse">
        <div className="h-6 w-32 rounded bg-zinc-150 dark:bg-zinc-850 mb-4" />
        <div className="h-4 w-48 rounded bg-zinc-150 dark:bg-zinc-850" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit Job</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Modify details for this job application listing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 dark:border-red-950/30 dark:text-red-400 dark:hover:bg-red-950/20 transition-all cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isDeleting ? 'Deleting...' : 'Delete Job'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-6 shadow-sm"
      >
        {/* Core fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job_title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="job_title"
              name="job_title"
              type="text"
              required
              value={formData.job_title}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="company_name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              required
              value={formData.company_name}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="application_link" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Application Link <span className="text-red-500">*</span>
          </label>
          <input
            id="application_link"
            name="application_link"
            type="url"
            required
            value={formData.application_link}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="work_mode" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Work Mode
            </label>
            <select
              id="work_mode"
              name="work_mode"
              value={formData.work_mode}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on_site">On-site</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Application Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
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
        </div>

        {/* Salary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="salary_min" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Minimum Salary ($ / month)
            </label>
            <input
              id="salary_min"
              name="salary_min"
              type="number"
              value={formData.salary_min}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="salary_max" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Maximum Salary ($ / month)
            </label>
            <input
              id="salary_max"
              name="salary_max"
              type="number"
              value={formData.salary_max}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
        </div>

        {/* Long Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="structured_description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Job Description
          </label>
          <textarea
            id="structured_description"
            name="structured_description"
            rows={6}
            value={formData.structured_description}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>

        {/* Re-evaluation Toggle */}
        <div className="flex items-center gap-3 bg-zinc-50/50 p-4 border border-zinc-200/60 dark:border-zinc-850 dark:bg-zinc-900/10 rounded-2xl">
          <input
            id="reevaluate"
            name="reevaluate"
            type="checkbox"
            checked={reevaluate}
            onChange={(e) => setReevaluate(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="reevaluate" className="text-xs font-semibold text-zinc-750 dark:text-zinc-300 cursor-pointer select-none">
            Re-evaluate profile match score with AI
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <Link
            href="/jobs"
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:bg-zinc-350 dark:disabled:bg-zinc-850 transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
