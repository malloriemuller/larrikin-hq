'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

  return (
    <div className="min-h-screen bg-[#0E1B11]">
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b border-[rgba(196,175,90,0.13)] px-5 sm:px-8 flex items-center justify-between gap-4"
        style={{ minHeight: '60px', background: 'rgba(14,27,17,0.94)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-4">
          <Image src="/logo-green-gold.png" alt="Larrikin" width={0} height={0} sizes="160px" className="h-6 w-auto" />
          <div className="w-px h-4 bg-[rgba(196,175,90,0.20)]" />
          <span
            className="text-[13px] font-semibold tracking-[0.20em] text-[#C4AF5A] uppercase"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Mallorie · HQ
          </span>
        </div>
        <Link
          href="/andy"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[#EDE4C8] transition-colors"
          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
        >
          Andy →
        </Link>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[60px] z-10 border-b border-[rgba(196,175,90,0.13)]"
        style={{ background: 'rgba(22,44,26,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <nav className="flex overflow-x-auto scrollbar-hide px-5 sm:px-8">
          {(['Pipeline', 'Projects', 'Tasks', 'Queue'] as const).map((label) => (
            <Link
              key={label}
              href="/"
              className="relative flex-none flex items-center px-4 whitespace-nowrap transition-all duration-150 border-b-2 border-b-transparent text-[12px] font-semibold tracking-[0.16em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[rgba(237,228,200,0.70)]"
              style={{ minHeight: '48px', fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {label}
            </Link>
          ))}
          <span
            className="relative flex-none flex items-center px-4 whitespace-nowrap border-b-2 border-b-[#C4AF5A] text-[12px] font-semibold tracking-[0.16em] uppercase text-[#EDE4C8]"
            style={{ minHeight: '48px', fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Tools
          </span>
        </nav>
      </div>

      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto">
        {/* Section header */}
        <div className="border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
          <p
            className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Tools
          </p>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none">Workflow Mapper</h2>
            {result && (
              <button
                onClick={reset}
                className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[#EDE4C8] transition-colors"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
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
                className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.50)] mb-2"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Audit notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste raw notes, transcript, or stream-of-consciousness from the audit call…"
                rows={14}
                className="w-full bg-[#162C1A] border border-[rgba(196,175,90,0.18)] rounded-[3px] px-4 py-3 text-[14px] text-[#EDE4C8] placeholder-[rgba(237,228,200,0.20)] focus:outline-none focus:border-[rgba(196,175,90,0.45)] resize-y"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
              />
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.50)] mb-2"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Avg. hourly labor cost (optional) — used to calculate $ ROI
              </label>
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[rgba(237,228,200,0.35)]">$</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 45"
                  min={0}
                  className="w-full bg-[#162C1A] border border-[rgba(196,175,90,0.18)] rounded-[3px] pl-7 pr-4 py-2.5 text-[14px] text-[#EDE4C8] placeholder-[rgba(237,228,200,0.20)] focus:outline-none focus:border-[rgba(196,175,90,0.45)]"
                  style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-[#E57373]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!notes.trim() || loading}
              className="self-start flex items-center gap-2 px-5 rounded-sm bg-[#C4AF5A] text-[#0E1B11] text-[12px] font-bold hover:bg-[#D4BF6A] transition-colors uppercase tracking-[0.12em] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ minHeight: '40px', fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {loading ? 'Generating…' : 'Generate Process Map'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Client header */}
            <div>
              <h3
                className="text-[1.75rem] font-bold text-[#EDE4C8] leading-tight"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                {result.clientName}
              </h3>
              <p
                className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.45)] mt-1"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {result.industry}
              </p>
              <p className="text-[14px] text-[rgba(237,228,200,0.70)] mt-3 leading-relaxed">{result.auditSummary}</p>
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
                <div key={label} className="bg-[#162C1A] border border-[rgba(196,175,90,0.13)] rounded-[3px] px-4 py-4">
                  <p
                    className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[rgba(237,228,200,0.40)] mb-1"
                    style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                  >
                    {label}
                  </p>
                  <p className="text-[1.5rem] font-bold text-[#EDE4C8] tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            {/* Top recommendation */}
            <div
              className="bg-[#162C1A] border border-[rgba(196,175,90,0.13)] rounded-[3px] px-5 py-4"
              style={{ borderLeft: '3px solid #C4AF5A' }}
            >
              <p
                className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#C4AF5A] mb-2"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Top Recommendation
              </p>
              <p className="text-[14px] text-[#EDE4C8] leading-relaxed">{result.topRecommendation}</p>
            </div>

            {/* Workflow cards */}
            <div className="flex flex-col gap-3">
              <p
                className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.40)]"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Workflows
              </p>
              {result.workflows.map((w) => {
                const isOpen = expanded.has(w.id);
                const priorityColor =
                  w.priority === 'High'
                    ? '#C4AF5A'
                    : w.priority === 'Medium'
                    ? 'rgba(196,175,90,0.55)'
                    : 'rgba(237,228,200,0.25)';

                return (
                  <div
                    key={w.id}
                    className="bg-[#162C1A] border border-[rgba(196,175,90,0.13)] rounded-[3px] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpand(w.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#1E3B23] transition-colors"
                    >
                      <span
                        className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-[2px] flex-none"
                        style={{ color: priorityColor, border: `1px solid ${priorityColor}` }}
                      >
                        {w.priority}
                      </span>
                      <span
                        className="flex-1 text-[14px] font-semibold text-[#EDE4C8] text-left"
                        style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                      >
                        {w.name}
                      </span>
                      <div className="flex items-center gap-3 flex-none">
                        <span
                          className="text-[12px] text-[rgba(237,228,200,0.45)] tabular-nums hidden sm:block"
                          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                        >
                          {w.estimatedHoursSavedPerMonth}h saved/mo
                        </span>
                        {w.yearlyCostSaved !== undefined && (
                          <span
                            className="text-[12px] text-[#C4AF5A] tabular-nums hidden sm:block"
                            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                          >
                            {fmtDollars(w.yearlyCostSaved)}/yr
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-[rgba(237,228,200,0.30)] transition-transform flex-none ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-[rgba(196,175,90,0.10)] flex flex-col gap-4">
                        <p className="text-[13px] text-[rgba(237,228,200,0.65)] leading-relaxed">{w.description}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1"
                              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                            >
                              Frequency
                            </p>
                            <p className="text-[13px] text-[#EDE4C8]">{w.frequency}</p>
                          </div>
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1"
                              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                            >
                              Hours / month
                            </p>
                            <p className="text-[13px] text-[#EDE4C8] tabular-nums">{w.estimatedHoursPerMonth}</p>
                          </div>
                          {w.monthlyCostSaved !== undefined && (
                            <>
                              <div>
                                <p
                                  className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1"
                                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                                >
                                  $ saved / month
                                </p>
                                <p className="text-[13px] text-[#C4AF5A] tabular-nums">{fmtDollars(w.monthlyCostSaved)}</p>
                              </div>
                              <div>
                                <p
                                  className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1"
                                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                                >
                                  $ saved / year
                                </p>
                                <p className="text-[13px] text-[#C4AF5A] tabular-nums">{fmtDollars(w.yearlyCostSaved ?? 0)}</p>
                              </div>
                            </>
                          )}
                        </div>

                        {w.currentTools.length > 0 && (
                          <div>
                            <p
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1.5"
                              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                            >
                              Current tools
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {w.currentTools.map((tool) => (
                                <span
                                  key={tool}
                                  className="text-[11px] px-2 py-0.5 rounded-[2px] bg-[rgba(196,175,90,0.08)] text-[rgba(237,228,200,0.55)] border border-[rgba(196,175,90,0.12)]"
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
                              className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1.5"
                              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                            >
                              Pain points
                            </p>
                            <ul className="flex flex-col gap-1">
                              {w.painPoints.map((point, i) => (
                                <li key={i} className="text-[13px] text-[rgba(237,228,200,0.55)] flex items-start gap-2">
                                  <span className="text-[rgba(196,175,90,0.40)] mt-0.5 flex-none">—</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1.5"
                            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                          >
                            Automation readiness
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#C4AF5A]"
                                style={{ width: `${w.automationReadiness * 10}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-bold text-[#EDE4C8] tabular-nums flex-none">
                              {w.automationReadiness}/10
                            </span>
                          </div>
                          <p className="text-[12px] text-[rgba(237,228,200,0.45)] mt-1">{w.automationReadinessReason}</p>
                        </div>

                        <div>
                          <p
                            className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[rgba(237,228,200,0.35)] mb-1.5"
                            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                          >
                            Recommended approach
                          </p>
                          <p className="text-[13px] text-[#EDE4C8] leading-relaxed">{w.recommendedApproach}</p>
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
