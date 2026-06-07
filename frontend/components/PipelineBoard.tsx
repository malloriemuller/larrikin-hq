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

const STAGE_DOT_COLOR: Record<ClientStage, string> = {
  Lead:     'var(--border)',
  Discovery:'var(--ember)',
  Proposal: 'oklch(0.72 0.15 50)',
  Delivery: 'var(--foreground)',
  Retainer: 'var(--foreground)',
  Archived: 'var(--faint)',
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
  const [stageState, setStageState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [stageError, setStageError] = useState<string>('');

  const nextStage = NEXT_STAGE[client.fields.Stage];
  const days = daysSince(client.fields['Created Date']);

  const handleProposalFollowUp = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setProposalState('loading'); setProposalError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/queue-proposal-followup`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error ?? `Server error ${res.status}`); }
      setProposalState('sent'); onProposalFollowUpQueued?.();
      setTimeout(() => setProposalState('idle'), 3000);
    } catch (err) { setProposalError(err instanceof Error ? err.message : 'Request failed'); setProposalState('error'); setTimeout(() => setProposalState('idle'), 5000); }
  };

  const handleMoveStage = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!nextStage) return;
    setStageState('loading'); setStageError('');
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Stage: nextStage }) });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error ?? `Server error ${res.status}`); }
      onStageMoved?.();
    } catch (err) { setStageError(err instanceof Error ? err.message : 'Request failed'); setStageState('error'); setTimeout(() => setStageState('idle'), 5000); }
  };

  const handleOutreach = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setOutreachState('loading'); setOutreachError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/queue-outreach`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error ?? `Server error ${res.status}`); }
      setOutreachState('sent'); onOutreachQueued?.();
      setTimeout(() => setOutreachState('idle'), 3000);
    } catch (err) { setOutreachError(err instanceof Error ? err.message : 'Request failed'); setOutreachState('error'); setTimeout(() => setOutreachState('idle'), 5000); }
  };

  const handleAuditKickoff = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setKickoffState('loading'); setKickoffError('');
    try {
      const res = await fetch(`/api/clients/${client.id}/audit-kickoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as { error?: string }).error ?? `Server error ${res.status}`); }
      setKickoffState('sent'); onAuditKickoffComplete?.();
      setTimeout(() => setKickoffState('idle'), 3000);
    } catch (err) { setKickoffError(err instanceof Error ? err.message : 'Request failed'); setKickoffState('error'); setTimeout(() => setKickoffState('idle'), 5000); }
  };

  return (
    <Link
      href={`/clients/${client.id}`}
      className="block px-3.5 py-3 transition-colors"
      style={{
        backgroundColor: 'var(--muted)',
        borderLeft: '3px solid var(--ember)',
        borderRadius: '3px',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="font-bold text-[15px] leading-snug truncate"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
          >
            {client.fields.Name}
          </p>
          <p
            className="text-[12px] truncate uppercase tracking-[0.10em] mt-0.5"
            style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            {client.fields.Company}
          </p>
        </div>
        {days !== null && (
          <span
            className="text-[11px] font-semibold whitespace-nowrap flex-none mt-0.5 tabular-nums"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            {days}d
          </span>
        )}
      </div>
      {client.fields.Source && (
        <p className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--faint)' }}>
          via {client.fields.Source}
        </p>
      )}

      {showOutreach && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {outreachState === 'sent' ? (
            <p className="text-[11px]" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>Outreach queued ✓</p>
          ) : outreachState === 'error' ? (
            <p className="text-[11px]" style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}>{outreachError}</p>
          ) : (
            <button onClick={handleOutreach} disabled={outreachState === 'loading'} className="text-[11px] transition-opacity hover:opacity-60 disabled:opacity-40" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>
              {outreachState === 'loading' ? 'Sending…' : 'Send Referral Outreach'}
            </button>
          )}
        </div>
      )}
      {showAuditKickoff && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {kickoffState === 'sent' ? (
            <p className="text-[11px]" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>Audit kicked off ✓</p>
          ) : kickoffState === 'error' ? (
            <p className="text-[11px]" style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}>{kickoffError}</p>
          ) : (
            <button onClick={handleAuditKickoff} disabled={kickoffState === 'loading'} className="text-[11px] transition-opacity hover:opacity-60 disabled:opacity-40" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>
              {kickoffState === 'loading' ? 'Starting…' : 'Send Audit Kickoff'}
            </button>
          )}
        </div>
      )}
      {showProposalFollowUp && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {proposalState === 'sent' ? (
            <p className="text-[11px]" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>Follow-up queued ✓</p>
          ) : proposalState === 'error' ? (
            <p className="text-[11px]" style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}>{proposalError}</p>
          ) : (
            <button onClick={handleProposalFollowUp} disabled={proposalState === 'loading'} className="text-[11px] transition-opacity hover:opacity-60 disabled:opacity-40" style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}>
              {proposalState === 'loading' ? 'Queuing…' : 'Send Proposal Follow-Up'}
            </button>
          )}
        </div>
      )}
      {nextStage && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {stageState === 'error' ? (
            <p className="text-[10px]" style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}>{stageError}</p>
          ) : (
            <button onClick={handleMoveStage} disabled={stageState === 'loading'} className="text-[10px] transition-opacity hover:opacity-60 disabled:opacity-40" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
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
    <div
      className="overflow-hidden"
      style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 min-h-[52px] text-left transition-colors"
        style={{ backgroundColor: 'var(--muted)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cream)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-none"
            style={{ backgroundColor: STAGE_DOT_COLOR[stage] }}
          />
          <span
            className="text-[13px] font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            {stage}
          </span>
          {clients.length > 0 && (
            <span
              className="text-[12px] tabular-nums"
              style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              {clients.length}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform flex-none ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--faint)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="px-4 pb-4 pt-3 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
        >
          {clients.length === 0 ? (
            <p className="text-sm text-center italic py-2" style={{ color: 'var(--faint)' }}>Empty</p>
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
      <div
        className="hidden sm:block overflow-hidden"
        style={{ border: '1px solid var(--border)', borderRadius: '3px' }}
      >
        {STAGES.map((stage, i) => (
          <div
            key={stage}
            className="flex items-start transition-colors"
            style={{
              backgroundColor: 'var(--background)',
              borderTop: i > 0 ? '1px solid var(--border)' : undefined,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--background)')}
          >
            {/* Stage label */}
            <div
              className="flex-none w-36 px-5 py-4"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ backgroundColor: STAGE_DOT_COLOR[stage] }}
                />
                <span
                  className="text-[12px] font-semibold tracking-[0.16em] uppercase"
                  style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  {stage}
                </span>
              </div>
              <p
                className="text-[12px] pl-3.5 tabular-nums"
                style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {byStage[stage].length}
              </p>
            </div>

            {/* Client cards */}
            <div className="flex-1 flex flex-wrap gap-2 px-4 py-4 min-h-[64px] items-start content-start">
              {byStage[stage].length === 0 ? (
                <p className="text-sm self-center italic" style={{ color: 'var(--faint)' }}>—</p>
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
