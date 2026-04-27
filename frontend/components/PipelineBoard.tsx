'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Client, ClientStage } from '@/lib/api';

const STAGES: ClientStage[] = ['Lead', 'Discovery', 'Proposal', 'Delivery', 'Retainer'];

const NEXT_STAGE: Partial<Record<ClientStage, ClientStage>> = {
  Lead:      'Discovery',
  Discovery: 'Proposal',
  Proposal:  'Delivery',
  Delivery:  'Retainer',
  Retainer:  'Archived',
};

const STAGE_DOT: Record<ClientStage, string> = {
  Lead:     'bg-[rgba(237,228,200,0.25)]',
  Discovery:'bg-[#C4AF5A]',
  Proposal: 'bg-[#D4BF6A]',
  Delivery: 'bg-[#EDE4C8]',
  Retainer: 'bg-[#EDE4C8]',
  Archived: 'bg-[rgba(237,228,200,0.15)]',
};

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function ClientCard({
  client,
  showOutreach = false,
  showAuditKickoff = false,
  showProposalFollowUp = false,
  onOutreachQueued,
  onAuditKickoffComplete,
  onStageMoved,
  onProposalFollowUpQueued,
}: {
  client: Client;
  showOutreach?: boolean;
  showAuditKickoff?: boolean;
  showProposalFollowUp?: boolean;
  onOutreachQueued?: () => void;
  onAuditKickoffComplete?: () => void;
  onStageMoved?: () => void;
  onProposalFollowUpQueued?: () => void;
}) {
  const [outreachState, setOutreachState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [outreachError, setOutreachError] = useState<string>('');
  const [kickoffState, setKickoffState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [kickoffError, setKickoffError] = useState<string>('');
  const [proposalState, setProposalState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [proposalError, setProposalError] = useState<string>('');

  const handleProposalFollowUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProposalState('loading');
    setProposalError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/queue-proposal-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setProposalState('sent');
      onProposalFollowUpQueued?.();
      setTimeout(() => setProposalState('idle'), 3000);
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : 'Request failed');
      setProposalState('error');
      setTimeout(() => setProposalState('idle'), 5000);
    }
  };
  const [stageState, setStageState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [stageError, setStageError] = useState<string>('');

  const nextStage = NEXT_STAGE[client.fields.Stage];

  const handleMoveStage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nextStage) return;
    setStageState('loading');
    setStageError('');
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stage: nextStage }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      onStageMoved?.();
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Request failed');
      setStageState('error');
      setTimeout(() => setStageState('idle'), 5000);
    }
  };
  const days = daysSince(client.fields['Created Date']);

  const handleOutreach = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOutreachState('loading');
    setOutreachError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/queue-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setOutreachState('sent');
      onOutreachQueued?.();
      setTimeout(() => setOutreachState('idle'), 3000);
    } catch (err) {
      setOutreachError(err instanceof Error ? err.message : 'Request failed');
      setOutreachState('error');
      setTimeout(() => setOutreachState('idle'), 5000);
    }
  };

  const handleAuditKickoff = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setKickoffState('loading');
    setKickoffError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/audit-kickoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }
      setKickoffState('sent');
      onAuditKickoffComplete?.();
      setTimeout(() => setKickoffState('idle'), 3000);
    } catch (err) {
      setKickoffError(err instanceof Error ? err.message : 'Request failed');
      setKickoffState('error');
      setTimeout(() => setKickoffState('idle'), 5000);
    }
  };

  return (
    <Link
      href={`/clients/${client.id}`}
      className="block bg-[#162C1A] rounded-[3px] px-3.5 py-3 hover:bg-[#1E3B23] transition-colors"
      style={{ borderLeft: '3px solid #C4AF5A' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="font-bold text-[15px] text-[#EDE4C8] leading-snug truncate"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            {client.fields.Name}
          </p>
          <p
            className="text-[12px] truncate uppercase tracking-[0.10em] mt-0.5"
            style={{ fontFamily: 'var(--font-barlow), sans-serif', color: 'rgba(237,228,200,0.55)' }}
          >
            {client.fields.Company}
          </p>
        </div>
        {days !== null && (
          <span
            className="text-[11px] font-semibold whitespace-nowrap flex-none mt-0.5 tabular-nums"
            style={{ fontFamily: 'var(--font-barlow), sans-serif', color: 'rgba(237,228,200,0.35)' }}
          >
            {days}d
          </span>
        )}
      </div>
      {client.fields.Source && (
        <p className="text-[11px] mt-1.5 truncate" style={{ color: 'rgba(237,228,200,0.30)' }}>
          via {client.fields.Source}
        </p>
      )}
      {showOutreach && (
        <div className="mt-2 pt-2 border-t border-[rgba(196,175,90,0.10)]">
          {outreachState === 'sent' ? (
            <p className="text-[11px] text-[#C4AF5A]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              Outreach queued ✓
            </p>
          ) : outreachState === 'error' ? (
            <p className="text-[11px] text-[#E57373]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              {outreachError}
            </p>
          ) : (
            <button
              onClick={handleOutreach}
              disabled={outreachState === 'loading'}
              className="text-[11px] text-[rgba(196,175,90,0.60)] hover:text-[#C4AF5A] transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {outreachState === 'loading' ? 'Sending…' : 'Send Referral Outreach'}
            </button>
          )}
        </div>
      )}
      {showAuditKickoff && (
        <div className="mt-2 pt-2 border-t border-[rgba(196,175,90,0.10)]">
          {kickoffState === 'sent' ? (
            <p className="text-[11px] text-[#C4AF5A]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              Audit kicked off ✓
            </p>
          ) : kickoffState === 'error' ? (
            <p className="text-[11px] text-[#E57373]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              {kickoffError}
            </p>
          ) : (
            <button
              onClick={handleAuditKickoff}
              disabled={kickoffState === 'loading'}
              className="text-[11px] text-[rgba(196,175,90,0.60)] hover:text-[#C4AF5A] transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {kickoffState === 'loading' ? 'Starting…' : 'Send Audit Kickoff'}
            </button>
          )}
        </div>
      )}
      {showProposalFollowUp && (
        <div className="mt-2 pt-2 border-t border-[rgba(196,175,90,0.10)]">
          {proposalState === 'sent' ? (
            <p className="text-[11px] text-[#C4AF5A]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              Follow-up queued ✓
            </p>
          ) : proposalState === 'error' ? (
            <p className="text-[11px] text-[#E57373]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              {proposalError}
            </p>
          ) : (
            <button
              onClick={handleProposalFollowUp}
              disabled={proposalState === 'loading'}
              className="text-[11px] text-[rgba(196,175,90,0.60)] hover:text-[#C4AF5A] transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {proposalState === 'loading' ? 'Queuing…' : 'Send Proposal Follow-Up'}
            </button>
          )}
        </div>
      )}
      {nextStage && (
        <div className="mt-2 pt-2 border-t border-[rgba(196,175,90,0.07)]">
          {stageState === 'error' ? (
            <p className="text-[10px] text-[#E57373]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
              {stageError}
            </p>
          ) : (
            <button
              onClick={handleMoveStage}
              disabled={stageState === 'loading'}
              className="text-[10px] text-[rgba(237,228,200,0.25)] hover:text-[rgba(237,228,200,0.50)] transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {stageState === 'loading' ? 'Moving…' : `Move to ${nextStage} →`}
            </button>
          )}
        </div>
      )}
    </Link>
  );
}

function MobileStageSection({
  stage,
  clients,
  onOutreachQueued,
  onAuditKickoffComplete,
  onStageMoved,
  onProposalFollowUpQueued,
}: {
  stage: ClientStage;
  clients: Client[];
  onOutreachQueued?: () => void;
  onAuditKickoffComplete?: () => void;
  onStageMoved?: () => void;
  onProposalFollowUpQueued?: () => void;
}) {
  const [open, setOpen] = useState(clients.length > 0);

  return (
    <div className="border border-[rgba(196,175,90,0.13)] rounded-[3px] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 min-h-[52px] text-left bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-none ${STAGE_DOT[stage]}`} />
          <span
            className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#EDE4C8]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            {stage}
          </span>
          {clients.length > 0 && (
            <span
              className="text-[12px] text-[rgba(237,228,200,0.40)] tabular-nums"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {clients.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[rgba(237,228,200,0.30)] transition-transform flex-none ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-2 border-t border-[rgba(196,175,90,0.10)] bg-[rgba(255,255,255,0.01)]">
          {clients.length === 0 ? (
            <p className="text-sm text-[rgba(237,228,200,0.30)] py-2 text-center italic">Empty</p>
          ) : (
            clients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                showOutreach={stage === 'Lead'}
                showAuditKickoff={stage === 'Lead' || stage === 'Discovery'}
                showProposalFollowUp={stage === 'Proposal'}
                onOutreachQueued={onOutreachQueued}
                onAuditKickoffComplete={onAuditKickoffComplete}
                onStageMoved={onStageMoved}
                onProposalFollowUpQueued={onProposalFollowUpQueued}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface PipelineBoardProps {
  clients: Client[];
  onOutreachQueued?: () => void;
  onAuditKickoffComplete?: () => void;
  onStageMoved?: () => void;
  onProposalFollowUpQueued?: () => void;
}

export default function PipelineBoard({ clients, onOutreachQueued, onAuditKickoffComplete, onStageMoved, onProposalFollowUpQueued }: PipelineBoardProps) {
  const byStage = STAGES.reduce<Record<ClientStage, Client[]>>(
    (acc, stage) => {
      acc[stage] = clients.filter((c) => c.fields.Stage === stage);
      return acc;
    },
    {} as Record<ClientStage, Client[]>
  );

  return (
    <>
      {/* Mobile: vertical accordion */}
      <div className="flex flex-col gap-2 sm:hidden">
        {STAGES.map((stage) => (
          <MobileStageSection
            key={stage}
            stage={stage}
            clients={byStage[stage]}
            onOutreachQueued={onOutreachQueued}
            onAuditKickoffComplete={onAuditKickoffComplete}
            onStageMoved={onStageMoved}
            onProposalFollowUpQueued={onProposalFollowUpQueued}
          />
        ))}
      </div>

      {/* Desktop: table rows */}
      <div className="hidden sm:block border border-[rgba(196,175,90,0.13)] rounded-[3px] overflow-hidden divide-y divide-[rgba(196,175,90,0.08)]">
        {STAGES.map((stage) => (
          <div key={stage} className="flex items-start bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
            {/* Stage label */}
            <div className="flex-none w-36 px-5 py-4 border-r border-[rgba(196,175,90,0.08)]">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-none ${STAGE_DOT[stage]}`} />
                <span
                  className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[rgba(237,228,200,0.55)]"
                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                >
                  {stage}
                </span>
              </div>
              <p
                className="text-[12px] text-[rgba(237,228,200,0.30)] pl-3.5 tabular-nums"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {byStage[stage].length}
              </p>
            </div>

            {/* Client cards */}
            <div className="flex-1 flex flex-wrap gap-2 px-4 py-4 min-h-[64px] items-start content-start">
              {byStage[stage].length === 0 ? (
                <p className="text-sm text-[rgba(237,228,200,0.20)] self-center italic">—</p>
              ) : (
                byStage[stage].map((client) => (
                  <div key={client.id} className="w-44">
                    <ClientCard
                      client={client}
                      showOutreach={stage === 'Lead'}
                      showAuditKickoff={stage === 'Lead' || stage === 'Discovery'}
                      showProposalFollowUp={stage === 'Proposal'}
                      onOutreachQueued={onOutreachQueued}
                      onAuditKickoffComplete={onAuditKickoffComplete}
                      onStageMoved={onStageMoved}
                      onProposalFollowUpQueued={onProposalFollowUpQueued}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
