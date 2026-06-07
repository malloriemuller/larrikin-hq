'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  getClient,
  getClientTimeline,
  Client,
  Project,
  CommunicationsLogEntry,
  CommsType,
  ClientStage,
} from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAGE_STYLES: Record<ClientStage, { bg: string; color: string }> = {
  Lead:      { bg: 'oklch(0.92 0.008 75)',            color: 'var(--muted-foreground)' },
  Discovery: { bg: 'oklch(0.68 0.16 50 / 0.12)',     color: 'var(--ember)' },
  Proposal:  { bg: 'oklch(0.68 0.16 50 / 0.18)',     color: 'oklch(0.65 0.15 50)' },
  Delivery:  { bg: 'oklch(0.9 0.01 70)',              color: 'var(--foreground)' },
  Retainer:  { bg: 'var(--ember)',                    color: 'var(--background)' },
  Archived:  { bg: 'oklch(0.94 0.006 75)',            color: 'var(--faint)' },
};

const TYPE_CONFIG: Record<CommsType, { icon: string; color: string; label: string }> = {
  Note:    { icon: '◆', color: 'var(--ember)',         label: 'Note' },
  Email:   { icon: '▶', color: 'var(--foreground)',    label: 'Email' },
  Meeting: { icon: '●', color: 'oklch(0.5 0.1 155)',   label: 'Meeting' },
  Call:    { icon: '○', color: 'var(--muted-foreground)', label: 'Call' },
};

const PROJECT_STATUS_DOT: Record<string, string> = {
  'In Progress': 'oklch(0.5 0.1 155)',
  'Not Started': 'var(--border)',
  'Complete':    'var(--ember)',
  'On Hold':     'var(--faint)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: ClientStage }) {
  const { bg, color } = STAGE_STYLES[stage] ?? STAGE_STYLES.Lead;
  return (
    <span
      className="inline-block px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase"
      style={{
        background: bg,
        color,
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-inter), sans-serif',
      }}
    >
      {stage}
    </span>
  );
}

function ProjectPill({ project }: { project: Project }) {
  const dotColor = PROJECT_STATUS_DOT[project.status] ?? 'var(--border)';
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5"
      style={{
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--muted)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-none"
        style={{ backgroundColor: dotColor }}
      />
      <div className="min-w-0">
        <p
          className="text-[14px] font-semibold leading-snug truncate"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
        >
          {project.name}
        </p>
        <p
          className="text-[11px] uppercase tracking-[0.12em] mt-0.5"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          {project.status}
        </p>
      </div>
    </div>
  );
}

function TimelineEntry({ entry }: { entry: CommunicationsLogEntry }) {
  const { icon, color, label } = TYPE_CONFIG[entry.fields.Type] ?? TYPE_CONFIG.Note;
  return (
    <div className="flex gap-4 group">
      {/* Date + connector */}
      <div className="flex flex-col items-end flex-none w-[96px]">
        <span
          className="text-[11px] font-semibold tabular-nums text-right w-full"
          style={{ fontFamily: 'var(--font-inter), sans-serif', color: 'var(--faint)' }}
        >
          {formatDate(entry.fields.Date)}
        </span>
        <div className="flex-1 w-px mt-1.5" style={{ backgroundColor: 'var(--border)' }} />
      </div>

      {/* Icon */}
      <div className="flex-none w-5 flex flex-col items-center pt-0.5">
        <span className="text-[9px] leading-none mt-px" style={{ color }}>
          {icon}
        </span>
        <div className="flex-1 w-px bg-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-7 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ fontFamily: 'var(--font-inter), sans-serif', color }}
          >
            {label}
          </span>
        </div>
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          {entry.fields.Summary}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<(Client & { projects?: Project[] }) | null>(null);
  const [timeline, setTimeline] = useState<CommunicationsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [clientData, timelineData] = await Promise.all([
        getClient(id),
        getClientTimeline(id),
      ]);
      setClient(clientData);
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load client', err);
      setError('Could not load client.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 sm:px-8 flex items-center gap-4"
        style={{
          minHeight: '60px',
          background: 'oklch(0.985 0.005 80 / 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Logo className="flex-none" />
        <div className="w-px h-4 flex-none" style={{ backgroundColor: 'var(--border)' }} />
        <Link
          href="/"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-60 flex items-center gap-1.5"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          ← Pipeline
        </Link>
      </header>

      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto">
        {loading ? (
          <div
            className="text-base py-20 text-center tracking-widest uppercase"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Loading…
          </div>
        ) : error || !client ? (
          <p className="text-base py-20 text-center" style={{ color: 'var(--muted-foreground)' }}>
            {error ?? 'Client not found.'}
          </p>
        ) : (
          <>
            {/* Client header */}
            <div className="mb-8 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1
                  className="text-[2.25rem] font-bold leading-tight"
                  style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
                >
                  {client.fields.Name}
                </h1>
                <StageBadge stage={client.fields.Stage} />
              </div>
              <p
                className="text-[13px] font-semibold uppercase tracking-[0.14em] mb-3"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {client.fields.Company}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={`mailto:${client.fields.Email}`}
                  className="text-[14px] transition-opacity hover:opacity-70"
                  style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  {client.fields.Email}
                </a>
                {client.fields.Phone && (
                  <span
                    className="text-[14px]"
                    style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                  >
                    {client.fields.Phone}
                  </span>
                )}
              </div>
            </div>

            {/* Projects */}
            {client.projects && client.projects.length > 0 && (
              <div className="mb-8 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
                <p
                  className="text-[12px] font-semibold tracking-[0.20em] uppercase mb-4"
                  style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  Projects
                </p>
                <div className="flex flex-col gap-2">
                  {client.projects.map((p) => (
                    <ProjectPill key={p.id} project={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <p
                className="text-[12px] font-semibold tracking-[0.20em] uppercase mb-6"
                style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                Activity
              </p>
              {timeline.length === 0 ? (
                <p
                  className="text-base italic"
                  style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  No activity recorded yet.
                </p>
              ) : (
                <div>
                  {timeline.map((entry) => (
                    <TimelineEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
