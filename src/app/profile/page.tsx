'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, FileText, Upload, Save, LogOut, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push('/login');
          return;
        }
        setEmail(user.email || '');

        // Fetch resume text from candidate_profile table
        const { data: profile, error: profileError } = await supabase
          .from('candidate_profile')
          .select('resume_text')
          .single();

        if (!profileError && profile) {
          setResumeText(profile.resume_text || '');
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/profile/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resume_text: resumeText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save resume');
      }

      setSuccessMsg('Resume saved and vectorized successfully!');
    } catch (err: any) {
      console.error('Failed to save resume:', err);
      setErrorMsg(err.message || 'An error occurred while saving the resume.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setErrorMsg('Only plain text (.txt) files are supported for upload.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setResumeText(text);
        setSuccessMsg('File content loaded into text field. Click Save to complete updates.');
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-12 items-center justify-center animate-pulse min-h-[50vh]">
        <div className="h-10 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 relative">
      {/* Background ambient light gradients */}
      <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* Header section with Sign Out */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Profile Settings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage your personal profile and upload your resume for match score vectorization.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* Profile Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">User Account</h3>
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-950 space-y-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-400 block">Registered Email</span>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 break-all">{email}</span>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
              <span className="text-xs font-medium text-zinc-400 block">Matching Status</span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle className="h-4 w-4" />
                Auth Active
              </div>
            </div>
          </div>
        </div>

        {/* Resume Vectorization Area */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Resume Matching Vector
          </h3>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800/80 dark:bg-zinc-950 shadow-sm space-y-6">
            {successMsg && (
              <div className="flex gap-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex gap-2 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="resumeText" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-zinc-400" />
                    Resume Text (Markdown or Plain Text)
                  </label>
                  <label className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Upload .txt file
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  id="resumeText"
                  required
                  rows={12}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your professional experience here. (At least 50 characters required for vectorization...)"
                  className="w-full p-4 rounded-xl border border-zinc-200 bg-white text-zinc-900 dark:text-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-zinc-400">
                  {resumeText.trim().length} characters (min 50)
                </span>
                <button
                  type="submit"
                  disabled={saving || resumeText.trim().length < 50}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md hover:shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Vectorising...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Process & Save Resume
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
