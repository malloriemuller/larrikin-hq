'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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

const STAGE_STYLES: Record<ClientStage, { bg: string; text: string }> = {
  Lead:      { bg: 'bg-[rgba(237,228,200,0.08)]',  text: 'text-[rgba(237,228,200,0.50)]' },
  Discovery: { bg: 'bg-[rgba(196,175,90,0.15)]',   text: 'text-[#C4AF5A]' },
  Proposal:  { bg: 'bg-[rgba(196,175,90,0.20)]',   text: 'text-[#D4BF6A]' },
  Delivery:  { bg: 'bg-[rgba(237,228,200,0.12)]',  text: 'text-[#EDE4C8]' },
  Retainer:  { bg: 'bg-[#C4AF5A]',                 text: 'text-[#0E1B11]' },
  Archived:  { bg: 'bg-[rgba(237,228,200,0.05)]',  text: 'text-[rgba(237,228,200,0.30)]' },
};

const TYPE_CONFIG: Record<CommsType, { icon: string; color: string; label: string }> = {
  Note:    { icon: '◆', color: '#C4AF5A',                     label: 'Note' },
  Email:   { icon: '▶', color: '#EDE4C8',                     label: 'Email' },
  Meeting: { icon: '●', color: '#6BAF88',                     label: 'Meeting' },
  Call:    { icon: '○', color: 'rgba(237,228,200,0.40)',       label: 'Call' },
};

const PROJECT_STATUS_DOT: Record<string, string> = {
  'In Progress': 'bg-[#6BAF88]',
  'Not Started': 'bg-[rgba(237,228,200,0.20)]',
  'Complete':    'bg-[#C4AF5A]',
  'On Hold':     'bg-[rgba(237,228,200,0.15)]',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: ClientStage }) {
  const { bg, text } = STAGE_STYLES[stage] ?? STAGE_STYLES.Lead;
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-[2px] text-[11px] font-semibold tracking-[0.16em] uppercase ${bg} ${text}`}
      style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
    >
      {stage}
    </span>
  );
}

function ProjectPill({ project }: { project: Project }) {
  const dot = PROJECT_STATUS_DOT[project.fields.Status] ?? 'bg-[rgba(237,228,200,0.20)]';
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[3px] border border-[rgba(196,175,90,0.13)] bg-[rgba(255,255,255,0.03)]">
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${dot}`} />
      <div className="min-w-0">
        <p
          className="text-[14px] font-semibold text-[#EDE4C8] leading-snug truncate"
          style={{ fontFamily: 'var(--font-playfair), serif' }}
        >
          {project.fields.Name}
        </p>
        <p
          className="text-[11px] uppercase tracking-[0.12em] text-[rgba(237,228,200,0.40)] mt-0.5"
          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
        >
          {project.fields.Type} · {project.fields.Status}
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
          style={{ fontFamily: 'var(--font-barlow), sans-serif', color: 'rgba(237,228,200,0.30)' }}
        >
          {formatDate(entry.fields.Date)}
        </span>
        <div className="flex-1 w-px bg-[rgba(196,175,90,0.10)] mt-1.5" />
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
            style={{ fontFamily: 'var(--font-barlow), sans-serif', color }}
          >
            {label}
          </span>
        </div>
        <p
          className="text-[15px] text-[rgba(237,228,200,0.85)] leading-relaxed"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
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
    <div className="min-h-screen bg-[#0E1B11]">
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b border-[rgba(196,175,90,0.13)] px-5 sm:px-8 flex items-center gap-4"
        style={{ minHeight: '60px', background: 'rgba(14,27,17,0.94)', backdropFilter: 'blur(12px)' }}
      >
        <Image
          src="/logo-green-gold.png"
          alt="Larrikin"
          width={0}
          height={0}
          sizes="160px"
          className="h-6 w-auto flex-none"
        />
        <div className="w-px h-4 bg-[rgba(196,175,90,0.20)] flex-none" />
        <Link
          href="/"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[#EDE4C8] transition-colors flex items-center gap-1.5"
          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
        >
          ← Pipeline
        </Link>
      </header>

      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-2xl mx-auto">
        {loading ? (
          <div
            className="text-[rgba(237,228,200,0.35)] text-base py-20 text-center tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Loading…
          </div>
        ) : error || !client ? (
          <p className="text-base text-[rgba(237,228,200,0.50)] py-20 text-center">{error ?? 'Client not found.'}</p>
        ) : (
          <>
            {/* Client header */}
            <div className="mb-8 pb-8 border-b border-[rgba(196,175,90,0.12)]">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1
                  className="text-[2.25rem] font-bold text-[#EDE4C8] leading-tight"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                >
                  {client.fields.Name}
                </h1>
                <StageBadge stage={client.fields.Stage} />
              </div>
              <p
                className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[rgba(237,228,200,0.45)] mb-3"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {client.fields.Company}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={`mailto:${client.fields.Email}`}
                  className="text-[14px] text-[rgba(237,228,200,0.55)] hover:text-[#EDE4C8] transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
                >
                  {client.fields.Email}
                </a>
                {client.fields.Phone && (
                  <span
                    className="text-[14px] text-[rgba(237,228,200,0.40)]"
                    style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
                  >
                    {client.fields.Phone}
                  </span>
                )}
              </div>
            </div>

            {/* Projects */}
            {client.projects && client.projects.length > 0 && (
              <div className="mb-8 pb-8 border-b border-[rgba(196,175,90,0.12)]">
                <p
                  className="text-[12px] font-semibold tracking-[0.20em] uppercase text-[#C4AF5A] mb-4"
                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
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
                className="text-[12px] font-semibold tracking-[0.20em] uppercase text-[#C4AF5A] mb-6"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Activity
              </p>
              {timeline.length === 0 ? (
                <p
                  className="text-base text-[rgba(237,228,200,0.35)] italic"
                  style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
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
