'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, Globe, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function GlobalHeader() {
  const pathname = usePathname();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `HTTP error! status: ${res.status}`);
      }

      setStatus({
        type: 'success',
        message: `Scraper triggered successfully! Job ID: ${data.job_id || 'Queued'}`,
      });
      setUrl('');
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Failed to trigger scraper. Please check details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const navLinks = [
    { name: 'Overview', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Jobs', href: '/jobs' },
    { name: 'Logs', href: '/dashboard/logs' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              Jobbly
            </span>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-xxs font-semibold text-indigo-600 dark:text-indigo-400">
              Agent
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              // Exact match for root page, prefix match for dashboard / jobs nested pages
              const isActive = link.href === '/' 
                ? pathname === '/' 
                : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Scraper Trigger Panel in Nav Bar */}
        <div className="flex-1 max-w-md">
          <form onSubmit={handleScrape} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Globe className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="url"
                placeholder="Paste job URL to scrape..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs shadow-inner outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:bg-zinc-950"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow transition-all hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  Scrape
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Global Toast/Alert feedback bar just below nav */}
      {status && (
        <div
          className={`flex items-center justify-between border-t px-6 py-2 text-xs transition-all ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400'
          }`}
        >
          <div className="mx-auto flex max-w-7xl w-full items-center gap-2">
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{status.message}</span>
          </div>
          <button
            onClick={() => setStatus(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
}
