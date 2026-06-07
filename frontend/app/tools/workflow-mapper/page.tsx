'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface Workflow {
  id: string;
  name: string;
  description: string;
  frequency: string;
  estimatedHoursPerMonth: number;
  currentTools: string[];
  painPoints: string[];
  automationReadiness: number;
  automationReadinessReason: string;
  recommendedApproach: string;
  estimatedHoursSavedPerMonth: number;
  priority: 'High' | 'Medium' | 'Low';
  monthlyCostSaved?: number;
  yearlyCostSaved?: number;
}

interface WorkflowMap {
  clientName: string;
  industry: string;
  auditSummary: string;
  workflows: Workflow[];
  totalHoursPerMonth: number;
  totalHoursSavedIfAutomated: number;
  topRecommendation: string;
  totalYearlySavings?: number;
}

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function fmtDollars(n: number) {
  return `$${n.toLocaleString()}`;
}

export default function WorkflowMapper() {
  const [notes, setNotes] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!notes.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: { notes: string; hourlyRate?: number } = { notes };
      const rate = parseFloat(hourlyRate);
      if (!isNaN(rate) && rate > 0) body.hourlyRate = rate;

      const res = await fetch('/api/tools/workflow-mapper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 422) {
        setError('Could not parse a workflow map from those notes. Try adding more detail about specific tasks and time spent.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Something went wrong. Check the backend logs.');
        return;
      }

      const data = (await res.json()) as WorkflowMap;
      data.workflows.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setNotes('');
    setHourlyRate('');
    setExpanded(new Set());
  };

  const hasRate = result?.workflows.some((w) => w.monthlyCostSaved !== undefined);

  const priorityEmberColor = (p: 'High' | 'Medium' | 'Low') =>
    p === 'High'
      ? 'var(--ember)'
      : p === 'Medium'
      ? 'oklch(0.68 0.16 50 / 0.6)'
      : 'var(--faint)';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 sm:px-8 flex items-center justify-between gap-4"
        style={{
          minHeight: '60px',
          background: 'oklch(0.985 0.005 80 / 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          <Logo />
          <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
          <span
            className="text-[13px] font-semibold tracking-[0.20em] uppercase"
            style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Mallorie · HQ
          </span>
        </div>
        <Link
          href="/andy"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          Andy →
        </Link>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[60px] z-10"
        style={{
          background: 'oklch(0.95 0.01 80 / 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <nav className="flex overflow-x-auto scrollbar-hide px-5 sm:px-8">
          {(['Pipeline', 'Projects', 'Tasks', 'Queue'] as const).map((label) => (
            <Link
              key={label}
              href="/"
              className="relative flex-none flex items-center px-4 whitespace-nowrap transition-all duration-150 border-b-2 border-b-transparent text-[12px] font-semibold tracking-[0.16em] uppercase hover:opacity-80"
              style={{ minHeight: '48px', fontFamily: 'var(--font-inter), sans-serif', color: 'var(--muted-foreground)' }}
            >
              {label}
            </Link>
          ))}
          <span
            className="relative flex-none flex items-center px-4 whitespace-nowrap border-b-2 text-[12px] font-semibold tracking-[0.16em] uppercase"
            style={{
              minHeight: '48px',
              fontFamily: 'var(--font-inter), sans-serif',
              color: 'var(--foreground)',
              borderBottomColor: 'var(--ember)',
            }}
          >
            Tools
          </span>
        </nav>
      </div>

      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto">
        {/* Section header */}
        <div className="pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
          <p
            className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
            style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Tools
          </p>
          <div className="flex items-end justify-between gap-4">
            <h2
              className="text-[2.25rem] font-bold leading-none"
              style={{ color: 'var(--foreground)' }}
            >
              Workflow Mapper
            </h2>
            {result && (
              <button
                onClick={reset}
                className="text-[12px] font-semibold tracking-[0.16em] uppercase transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                ← New audit
              </button>
            )}
          </div>
        </div>

        {!result ? (
          <div className="flex flex-col gap-5">
            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Audit notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste raw notes, transcript, or stream-of-consciousness from the audit call…"
                rows={14}
                className="w-full px-4 py-3 text-[14px] focus:outline-none resize-y"
                style={{
                  backgroundColor: 'var(--cream)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-inter), sans-serif',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={e => (e.target.style.borderColor = 'oklch(0.68 0.16 50 / 0.6)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Avg. hourly labor cost (optional) — used to calculate $ ROI
              </label>
              <div className="relative w-48">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px]"
                  style={{ color: 'var(--faint)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 45"
                  min={0}
                  className="w-full pl-7 pr-4 py-2.5 text-[14px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--cream)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}
                />
              </div>
            </div>

            {error && (
              <p
                className="text-[13px]"
                style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!notes.trim() || loading}
              className="self-start flex items-center gap-2 px-5 text-[12px] font-bold transition-opacity hover:opacity-90 uppercase tracking-[0.12em] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                minHeight: '40px',
                fontFamily: 'var(--font-inter), sans-serif',
                backgroundColor: 'var(--ink)',
                color: 'var(--background)',
                borderRadius: '9999px',
              }}
            >
              {loading ? 'Generating…' : 'Generate Process Map'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Client header */}
            <div>
              <h3
                className="text-[1.75rem] font-bold leading-tight"
                style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
              >
                {result.clientName}
              </h3>
              <p
                className="text-[12px] font-semibold tracking-[0.18em] uppercase mt-1"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {result.industry}
              </p>
              <p
                className="text-[14px] mt-3 leading-relaxed"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {result.auditSummary}
              </p>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Hours / month', value: String(result.totalHoursPerMonth) },
                { label: 'Hours recoverable', value: String(result.totalHoursSavedIfAutomated) },
                { label: 'Workflows found', value: String(result.workflows.length) },
                ...(hasRate && result.totalYearlySavings
                  ? [{ label: '$ saved / year', value: fmtDollars(result.totalYearlySavings) }]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="px-4 py-4"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <p
                    className="text-[11px] font-semibold tracking-[0.16em] uppercase mb-1"
                    style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[1.5rem] font-bold tabular-nums"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Top recommendation */}
            <div
              className="px-5 py-4"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--ember)',
                borderRadius: 'var(--radius)',
              }}
            >
              <p
                className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Top Recommendation
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {result.topRecommendation}
              </p>
            </div>

            {/* Workflow cards */}
            <div className="flex flex-col gap-3">
              <p
                className="text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Workflows
              </p>
              {result.workflows.map((w) => {
                const isOpen = expanded.has(w.id);
                const pColor = priorityEmberColor(w.priority);

                return (
                  <div
                    key={w.id}
                    className="overflow-hidden"
                    style={{
                      backgroundColor: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(w.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                      style={{ backgroundColor: isOpen ? 'var(--cream)' : undefined }}
                    >
                      <span
                        className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 flex-none"
                        style={{
                          color: pColor,
                          border: `1px solid ${pColor}`,
                          borderRadius: '3px',
                          fontFamily: 'var(--font-inter), sans-serif',
                        }}
                      >
                        {w.priority}
                      </span>
                      <span
                        className="flex-1 text-[14px] font-semibold text-left"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                      >
                        {w.name}
                      </span>
                      <div className="flex items-center gap-3 flex-none">
                        <span
                          className="text-[12px] tabular-nums hidden sm:block"
                          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                        >
                          {w.estimatedHoursSavedPerMonth}h saved/mo
                        </span>
                        {w.yearlyCostSaved !== undefined && (
                          <span
                            className="text-[12px] tabular-nums hidden sm:block"
                            style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                          >
                            {fmtDollars(w.yearlyCostSaved)}/yr
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 flex-none transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--faint)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div
                        className="px-4 pb-4 pt-1 flex flex-col gap-4"
                        style={{ borderTop: '1px solid var(--border)' }}
                      >
                        <p
                          className="text-[13px] leading-relaxed"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {w.description}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
                              style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                            >
                              Frequency
                            </p>
                            <p className="text-[13px]" style={{ color: 'var(--foreground)' }}>{w.frequency}</p>
                          </div>
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
                              style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                            >
                              Hours / month
                            </p>
                            <p className="text-[13px] tabular-nums" style={{ color: 'var(--foreground)' }}>{w.estimatedHoursPerMonth}</p>
                          </div>
                          {w.monthlyCostSaved !== undefined && (
                            <>
                              <div>
                                <p
                                  className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
                                  style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                                >
                                  $ saved / month
                                </p>
                                <p className="text-[13px] tabular-nums" style={{ color: 'var(--ember)' }}>{fmtDollars(w.monthlyCostSaved)}</p>
                              </div>
                              <div>
                                <p
                                  className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
                                  style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                                >
                                  $ saved / year
                                </p>
                                <p className="text-[13px] tabular-nums" style={{ color: 'var(--ember)' }}>{fmtDollars(w.yearlyCostSaved ?? 0)}</p>
                              </div>
                            </>
                          )}
                        </div>

                        {w.currentTools.length > 0 && (
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5"
                              style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                            >
                              Current tools
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {w.currentTools.map((tool) => (
                                <span
                                  key={tool}
                                  className="text-[11px] px-2 py-0.5"
                                  style={{
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--muted-foreground)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {w.painPoints.length > 0 && (
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5"
                              style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                            >
                              Pain points
                            </p>
                            <ul className="flex flex-col gap-1">
                              {w.painPoints.map((point, i) => (
                                <li
                                  key={i}
                                  className="text-[13px] flex items-start gap-2"
                                  style={{ color: 'var(--muted-foreground)' }}
                                >
                                  <span className="mt-0.5 flex-none" style={{ color: 'var(--ember)' }}>—</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5"
                            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                          >
                            Automation readiness
                          </p>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-1 h-1.5 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'var(--border)' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${w.automationReadiness * 10}%`, backgroundColor: 'var(--ember)' }}
                              />
                            </div>
                            <span
                              className="text-[12px] font-bold tabular-nums flex-none"
                              style={{ color: 'var(--foreground)' }}
                            >
                              {w.automationReadiness}/10
                            </span>
                          </div>
                          <p
                            className="text-[12px] mt-1"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            {w.automationReadinessReason}
                          </p>
                        </div>

                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-1.5"
                            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                          >
                            Recommended approach
                          </p>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }}>
                            {w.recommendedApproach}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
