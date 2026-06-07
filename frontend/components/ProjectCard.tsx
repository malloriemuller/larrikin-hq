'use client';

import { useState, useRef } from 'react';
import { Project, ProjectPhase, Task, CommsLogEntry, getProjectCommsLog } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  phases: ProjectPhase[];
  tasks: Task[];
  clientName: string;
  onPhaseUpdate: (phaseId: string, fields: Partial<ProjectPhase>) => Promise<void>;
  onProjectUpdate: (projectId: string, fields: Partial<Project>) => Promise<void>;
  onActivatePhase: (projectId: string, phaseType: 'Audit' | 'Build' | 'Retainer') => Promise<void>;
  onGenerateEmail: (projectId: string, phaseId: string, emailType: string) => Promise<void>;
  onRefresh: () => void;
  onDeletePhase?: (phaseId: string) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_EMAIL_TYPES: Record<string, string[]> = {
  Audit: ['Referral Outreach', 'Welcome Email', 'Post-Intro-Call', 'Post-Interview Thank-You', 'Pre-Meeting Preview', 'Post-Audit-Call', 'Post-Results-Meeting'],
  Build: ['Build Kickoff', 'Milestone Notification', 'Post-Demo Email'],
  Retainer: ['Retainer Onboarding Email', 'Milestone Notification'],
};

const PHASE_ORDER: Array<'Audit' | 'Build' | 'Retainer'> = ['Audit', 'Build', 'Retainer'];

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  value,
  type = 'text',
  onSave,
  display,
}: {
  value: string;
  type?: 'text' | 'number' | 'date';
  onSave: (val: string) => Promise<void>;
  display?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function commit() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        disabled={saving}
        className="inline-block w-auto min-w-[80px] px-1.5 py-0.5 text-[13px] focus:outline-none disabled:opacity-50"
        style={{
          borderRadius: '2px',
          border: '1px solid var(--ember)',
          color: 'var(--foreground)',
          backgroundColor: 'var(--cream)',
          fontFamily: 'var(--font-inter), sans-serif',
        }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 cursor-pointer group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={startEdit}
    >
      {display ?? <span style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{value || '—'}</span>}
      <span
        className="text-[10px] transition-opacity"
        style={{ color: 'var(--muted-foreground)', opacity: hovering ? 1 : 0 }}
        aria-hidden
      >✎</span>
    </span>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadOnlyField({ children }: { children: React.ReactNode }) {
  const [hovering, setHovering] = useState(false);
  return (
    <span
      className="inline-flex items-center gap-1"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {children}
      <span
        className="text-[10px] transition-opacity"
        style={{ color: 'var(--muted-foreground)', opacity: hovering ? 1 : 0 }}
        aria-hidden
      >🔒</span>
    </span>
  );
}

// ─── Contract status pill ─────────────────────────────────────────────────────

function ContractStatusPill({ status }: { status: ProjectPhase['contractStatus'] }) {
  const styles: Record<string, { bg: string; color: string }> = {
    'Not Started': { bg: 'oklch(0.92 0.008 75)',              color: 'var(--faint)' },
    'Sent':        { bg: 'oklch(0.97 0.04 75 / 0.6)',         color: 'oklch(0.55 0.12 55)' },
    'Signed':      { bg: 'oklch(0.95 0.04 145 / 0.25)',       color: 'oklch(0.45 0.1 145)' },
  };
  const s = styles[status] ?? styles['Not Started'];
  return (
    <span
      className="inline-block px-2 py-0.5 uppercase tracking-[0.05em]"
      style={{ background: s.bg, color: s.color, fontSize: '11px', fontFamily: 'var(--font-inter), sans-serif', borderRadius: '2px' }}
    >
      {status}
    </span>
  );
}

// ─── Phase status badge ───────────────────────────────────────────────────────

function PhaseBadge({ status }: { status: 'Active' | 'Complete' | 'Pending' | 'Upcoming' }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Active:   { bg: 'oklch(0.68 0.16 50 / 0.12)', color: 'var(--ember)' },
    Complete: { bg: 'oklch(0.95 0.04 145 / 0.25)', color: 'oklch(0.45 0.1 145)' },
    Pending:  { bg: 'oklch(0.92 0.008 75)',         color: 'var(--faint)' },
    Upcoming: { bg: 'oklch(0.92 0.008 75)',         color: 'var(--faint)' },
  };
  const s = styles[status] ?? styles['Upcoming'];
  return (
    <span
      className="inline-block px-2 py-0.5 uppercase tracking-[0.05em]"
      style={{ background: s.bg, color: s.color, fontSize: '11px', fontFamily: 'var(--font-inter), sans-serif', borderRadius: '2px' }}
    >
      {status}
    </span>
  );
}

// ─── Task list with Phase Group grouping ──────────────────────────────────────

function PhaseTaskList({
  tasks,
  onStatusCycle,
}: {
  tasks: Task[];
  onStatusCycle: (taskId: string, current: Task['fields']['Status']) => Promise<void>;
}) {
  const groups: Array<{ group: string; tasks: Task[] }> = [];
  const seen = new Map<string, Task[]>();
  for (const task of tasks) {
    const g = task.fields['Phase Group'] ?? '';
    if (!seen.has(g)) {
      const arr: Task[] = [];
      seen.set(g, arr);
      groups.push({ group: g, tasks: arr });
    }
    seen.get(g)!.push(task);
  }

  const statusNext: Record<string, Task['fields']['Status']> = {
    'To Do': 'In Progress',
    'In Progress': 'Done',
    'Done': 'To Do',
    'Blocked': 'To Do',
  };

  const statusDot: Record<string, string> = {
    'To Do':       'var(--faint)',
    'In Progress': 'var(--ember)',
    'Done':        'oklch(0.45 0.1 145)',
    'Blocked':     'var(--error)',
  };

  return (
    <div className="flex flex-col gap-3 mt-3">
      {groups.map(({ group, tasks: groupTasks }) => (
        <div key={group}>
          {group && (
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-1.5"
              style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              {group}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {groupTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between gap-2">
                <button
                  onClick={() => onStatusCycle(task.id, task.fields.Status)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0 group/task"
                  title={`${task.fields.Status} → ${statusNext[task.fields.Status]}`}
                >
                  <span
                    className="flex-none w-2 h-2 rounded-full transition-opacity group-hover/task:opacity-70"
                    style={{ background: statusDot[task.fields.Status] ?? 'var(--faint)' }}
                  />
                  <span
                    className="truncate text-[13px] transition-colors group-hover/task:opacity-80"
                    style={{
                      color: task.fields.Status === 'Done' ? 'var(--faint)' : 'var(--foreground)',
                      textDecoration: task.fields.Status === 'Done' ? 'line-through' : 'none',
                      fontFamily: 'var(--font-inter), sans-serif',
                    }}
                  >
                    {task.fields.Title}
                  </span>
                </button>
                <span
                  className="flex-none text-[11px] px-1.5 py-0.5"
                  style={{
                    background: 'var(--border)',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-inter), sans-serif',
                    borderRadius: '2px',
                  }}
                >
                  {task.fields.Assignee}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Phase delete button ──────────────────────────────────────────────────────

function PhaseDeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirm(false); }
  }

  if (!confirm) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setConfirm(true); }}
        className="w-5 h-5 flex items-center justify-center transition-colors hover:opacity-70"
        style={{
          color: 'var(--faint)',
          fontSize: '16px',
          lineHeight: 1,
          borderRadius: '2px',
          fontFamily: 'var(--font-inter), sans-serif',
        }}
        title="Delete phase"
      >
        ×
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        onClick={handleConfirm}
        disabled={deleting}
        className="px-2 min-h-[20px] text-[11px] font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: 'oklch(0.55 0.18 25 / 0.1)',
          color: 'var(--error)',
          border: '1px solid oklch(0.55 0.18 25 / 0.25)',
          borderRadius: '2px',
          fontFamily: 'var(--font-inter), sans-serif',
        }}
      >
        {deleting ? '…' : 'Delete'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="px-2 min-h-[20px] text-[11px] transition-opacity hover:opacity-70"
        style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Active phase panel ───────────────────────────────────────────────────────

function ActivePhasePanel({
  phase,
  tasks,
  projectId,
  onPhaseUpdate,
  onGenerateEmail,
  onRefresh,
  onDeletePhase,
}: {
  phase: ProjectPhase;
  tasks: Task[];
  projectId: string;
  onPhaseUpdate: (phaseId: string, fields: Partial<ProjectPhase>) => Promise<void>;
  onGenerateEmail: (projectId: string, phaseId: string, emailType: string) => Promise<void>;
  onRefresh: () => void;
  onDeletePhase?: (phaseId: string) => Promise<void>;
}) {
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cyclingTask, setCyclingTask] = useState<string | null>(null);

  const phaseTasks = tasks.filter(t => t.fields.Phase?.includes(phase.id));
  const allDone = phaseTasks.length > 0 && phaseTasks.every(t => t.fields.Status === 'Done');
  const emailTypes = PHASE_EMAIL_TYPES[phase.phaseType] ?? [];

  async function handleMarkComplete() {
    setCompleting(true);
    try {
      await onPhaseUpdate(phase.id, { status: 'Complete' });
      onRefresh();
    } finally {
      setCompleting(false);
    }
  }

  async function handleTaskStatusCycle(taskId: string, current: Task['fields']['Status']) {
    const next: Record<string, Task['fields']['Status']> = {
      'To Do': 'In Progress', 'In Progress': 'Done', 'Done': 'To Do', 'Blocked': 'To Do',
    };
    setCyclingTask(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: next[current] }),
      });
      onRefresh();
    } finally {
      setCyclingTask(null);
    }
  }

  return (
    <div
      className="px-4 py-3 mb-2"
      style={{
        borderLeft: '3px dashed var(--ember)',
        background: 'oklch(0.68 0.16 50 / 0.05)',
        borderRadius: '2px',
      }}
    >
      {/* Phase header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          className="font-medium"
          style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '15px', color: 'var(--foreground)' }}
        >
          {phase.phaseType}
        </span>
        <div className="flex items-center gap-2">
          <PhaseBadge status="Active" />
          {onDeletePhase && <PhaseDeleteButton onDelete={() => onDeletePhase(phase.id)} />}
        </div>
      </div>

      {/* Contract status */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-[13px]"
        style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <span className="flex items-center gap-1.5">
          <span>Contract:</span>
          <ReadOnlyField><ContractStatusPill status={phase.contractStatus} /></ReadOnlyField>
        </span>
        {phase.contractDate && (
          <ReadOnlyField>
            <span style={{ color: 'var(--muted-foreground)' }}>{phase.contractDate}</span>
          </ReadOnlyField>
        )}
      </div>

      {/* Editable fields */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-2 mb-3 text-[13px]"
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <span className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
          <span>Target:</span>
          <EditableField
            value={phase.targetDate ?? ''}
            type="date"
            onSave={val => onPhaseUpdate(phase.id, { targetDate: val || undefined })}
            display={
              <span style={{ color: phase.targetDate ? 'var(--foreground)' : 'var(--faint)' }}>
                {phase.targetDate ?? 'Not set'}
              </span>
            }
          />
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
          <span>Billing:</span>
          <EditableField
            value={phase.billingAmount != null ? String(phase.billingAmount) : ''}
            type="number"
            onSave={val => onPhaseUpdate(phase.id, { billingAmount: val ? Number(val) : undefined })}
            display={
              <span style={{ color: phase.billingAmount != null ? 'var(--foreground)' : 'var(--faint)' }}>
                {phase.billingAmount != null ? `$${phase.billingAmount.toLocaleString()}` : 'Not set'}
              </span>
            }
          />
          <label className="flex items-center gap-1 cursor-pointer" style={{ color: 'var(--muted-foreground)' }}>
            <input
              type="checkbox"
              checked={phase.billingMilestone ?? false}
              onChange={e => onPhaseUpdate(phase.id, { billingMilestone: e.target.checked })}
              className="w-3 h-3"
              style={{ accentColor: 'var(--ember)' }}
            />
            <span className="text-[11px]">Milestone</span>
          </label>
        </span>
      </div>

      {/* Task divider */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: '4px' }} />

      {/* Tasks */}
      {phaseTasks.length > 0 ? (
        <PhaseTaskList tasks={phaseTasks} onStatusCycle={handleTaskStatusCycle} />
      ) : (
        <p className="text-[12px] mt-2" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
          No tasks
        </p>
      )}

      {/* Action row */}
      <div
        className="flex items-center justify-between gap-2 mt-4 pt-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {emailTypes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setEmailMenuOpen(v => !v)}
              className="flex items-center gap-1 px-3 min-h-[32px] text-[12px] transition-opacity hover:opacity-70"
              style={{
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Generate email ▾
            </button>
            {emailMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-20 min-w-[200px] py-1"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  boxShadow: '0 4px 16px oklch(0 0 0 / 0.1)',
                }}
              >
                {emailTypes.map(type => (
                  <button
                    key={type}
                    onClick={async () => {
                      setEmailMenuOpen(false);
                      await onGenerateEmail(projectId, phase.id, type);
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:opacity-70"
                    style={{ color: 'var(--foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {allDone && (
          <button
            onClick={handleMarkComplete}
            disabled={completing}
            className="flex items-center gap-1.5 px-3 min-h-[32px] text-[12px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'oklch(0.95 0.04 145 / 0.2)',
              color: 'oklch(0.45 0.1 145)',
              border: '1px solid oklch(0.45 0.1 145 / 0.3)',
              borderRadius: '2px',
              fontFamily: 'var(--font-inter), sans-serif',
            }}
          >
            {completing ? 'Completing…' : 'Mark Complete →'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Complete phase panel ─────────────────────────────────────────────────────

function CompletePhasePanel({
  phase,
  tasks,
  onDeletePhase,
}: {
  phase: ProjectPhase;
  tasks: Task[];
  onDeletePhase?: (phaseId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const phaseTasks = tasks.filter(t => t.fields.Phase?.includes(phase.id));

  return (
    <div
      className="px-4 py-2.5 mb-2 cursor-pointer"
      style={{ borderLeft: '3px solid oklch(0.6 0.05 145)', borderRadius: '2px' }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            className="font-medium"
            style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '15px', color: 'var(--foreground)' }}
          >
            {phase.phaseType}
          </span>
          <span style={{ color: 'oklch(0.45 0.1 145)', fontSize: '13px' }}>✓</span>
          {phase.contractDate && (
            <span className="text-[12px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}>
              {phase.contractDate}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {phase.billingMilestone && phase.billingAmount != null && (
            <span className="text-[12px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}>
              ${phase.billingAmount.toLocaleString()}
            </span>
          )}
          <PhaseBadge status="Complete" />
          {onDeletePhase && <PhaseDeleteButton onDelete={() => onDeletePhase(phase.id)} />}
        </div>
      </div>

      {expanded && phaseTasks.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {phaseTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: 'oklch(0.45 0.1 145)' }} />
              <span
                className="text-[13px]"
                style={{ color: 'var(--faint)', textDecoration: 'line-through', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {task.fields.Title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Unactivated phase slot ───────────────────────────────────────────────────

function UnactivatedPhaseSlot({
  phaseType,
  isPreviousComplete,
  projectId,
  onActivatePhase,
}: {
  phaseType: 'Audit' | 'Build' | 'Retainer';
  isPreviousComplete: boolean;
  projectId: string;
  onActivatePhase: (projectId: string, phaseType: 'Audit' | 'Build' | 'Retainer') => Promise<void>;
}) {
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    try {
      await onActivatePhase(projectId, phaseType);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div
      className="px-4 py-2.5 mb-2 opacity-50"
      style={{ borderLeft: '3px dashed var(--border)', borderRadius: '2px' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-medium"
          style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '15px', color: 'var(--foreground)' }}
        >
          {phaseType}
        </span>
        <div className="flex items-center gap-2">
          {isPreviousComplete && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-2.5 min-h-[24px] text-[11px] transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ember)',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              {activating ? 'Activating…' : `+ Activate ${phaseType}`}
            </button>
          )}
          <PhaseBadge status="Upcoming" />
        </div>
      </div>
      <p className="text-[12px] mt-1" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
        Starting TBD
      </p>
    </div>
  );
}

// ─── Pending phase panel ──────────────────────────────────────────────────────

function PendingPhasePanel({
  phase,
  isPreviousComplete,
  projectId,
  onActivatePhase,
  onDeletePhase,
}: {
  phase: ProjectPhase;
  isPreviousComplete: boolean;
  projectId: string;
  onActivatePhase: (projectId: string, phaseType: 'Audit' | 'Build' | 'Retainer') => Promise<void>;
  onDeletePhase?: (phaseId: string) => Promise<void>;
}) {
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    try {
      await onActivatePhase(projectId, phase.phaseType);
    } finally {
      setActivating(false);
    }
  }

  return (
    <div
      className="px-4 py-2.5 mb-2 opacity-50"
      style={{ borderLeft: '3px dashed var(--border)', borderRadius: '2px' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-medium"
          style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: '15px', color: 'var(--foreground)' }}
        >
          {phase.phaseType}
        </span>
        <div className="flex items-center gap-2">
          {isPreviousComplete && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-2.5 min-h-[24px] text-[11px] transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ember)',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              {activating ? `Activating…` : `+ Activate ${phase.phaseType}`}
            </button>
          )}
          <PhaseBadge status="Upcoming" />
          {onDeletePhase && <PhaseDeleteButton onDelete={() => onDeletePhase(phase.id)} />}
        </div>
      </div>
      <p className="text-[12px] mt-1" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
        {phase.targetDate ? `Starting ${phase.targetDate}` : 'Starting TBD'}
      </p>
    </div>
  );
}

// ─── Progress trail ───────────────────────────────────────────────────────────

function ProgressTrail({ phases }: { phases: ProjectPhase[] }) {
  const byType = new Map(phases.map(p => [p.phaseType, p]));

  return (
    <div className="flex items-center gap-1 mb-4">
      {PHASE_ORDER.map((type, i) => {
        const phase = byType.get(type);
        const isComplete = phase?.status === 'Complete';
        const isActive = phase?.status === 'Active';
        const isLast = i === PHASE_ORDER.length - 1;

        return (
          <div key={type} className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-none">
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  color: isActive ? 'var(--ember)' : isComplete ? 'oklch(0.45 0.1 145)' : 'var(--faint)',
                }}
              >
                {isComplete ? '✓ ' : isActive ? '● ' : '○ '}
                {type}
              </span>
            </div>
            {!isLast && (
              <div
                className="flex-1 h-px mx-1"
                style={{ background: isComplete ? 'oklch(0.68 0.16 50 / 0.35)' : 'var(--border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity section ─────────────────────────────────────────────────────────

const TYPE_PILL_STYLES: Record<string, { bg: string; color: string }> = {
  Email:   { bg: 'oklch(0.68 0.16 50 / 0.1)',       color: 'var(--ember)' },
  Meeting: { bg: 'oklch(0.95 0.04 145 / 0.2)',       color: 'oklch(0.45 0.1 145)' },
  Note:    { bg: 'oklch(0.94 0.02 275 / 0.2)',        color: 'oklch(0.5 0.12 270)' },
  Call:    { bg: 'oklch(0.92 0.008 75)',              color: 'var(--muted-foreground)' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ActivitySection({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<CommsLogEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!open && entries === null) {
      setLoading(true);
      try {
        const data = await getProjectCommsLog(projectId);
        setEntries(data);
      } finally {
        setLoading(false);
      }
    }
    setOpen(v => !v);
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-opacity hover:opacity-70"
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--faint)' }}
        >
          Activity
        </span>
        <div className="flex items-center gap-2">
          {entries !== null && (
            <span className="text-[11px]" style={{ color: 'var(--faint)' }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
          <span
            className="text-[11px] transition-transform inline-block"
            style={{
              color: 'var(--faint)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4">
          {loading ? (
            <p className="text-[12px] py-2" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
              Loading…
            </p>
          ) : entries === null || entries.length === 0 ? (
            <p className="text-[12px] py-2" style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}>
              No activity yet
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entries.map(entry => {
                const pill = TYPE_PILL_STYLES[entry.type] ?? TYPE_PILL_STYLES['Note'];
                return (
                  <div key={entry.id} className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex-none px-1.5 py-0.5 uppercase tracking-[0.05em]"
                      style={{ fontSize: '11px', background: pill.bg, color: pill.color, fontFamily: 'var(--font-inter), sans-serif', borderRadius: '2px' }}
                    >
                      {entry.type}
                    </span>
                    <span
                      className="flex-1 truncate text-[12px]"
                      style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      {entry.summary}
                    </span>
                    <span
                      className="flex-none text-[12px]"
                      style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      {formatDate(entry.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function ProjectCard({
  project,
  phases,
  tasks,
  clientName,
  onPhaseUpdate,
  onProjectUpdate,
  onActivatePhase,
  onGenerateEmail,
  onRefresh,
  onDeletePhase,
}: ProjectCardProps) {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
  const [activating, setActivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  async function handleActivate(type: 'Audit' | 'Build' | 'Retainer') {
    setActivating(type);
    setActivated(null);
    setActivateError(null);
    try {
      await onActivatePhase(project.id, type);
      setActivated(type);
      setTimeout(() => setActivated(null), 3000);
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Activation failed — check backend logs.');
    } finally {
      setActivating(null);
    }
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      <div className="p-5">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3
            className="font-bold text-xl leading-tight"
            style={{ fontFamily: 'var(--font-fraunces), serif', color: 'var(--foreground)' }}
          >
            {clientName}
          </h3>
          <PhaseBadge
            status={
              sortedPhases.some(p => p.status === 'Active')
                ? 'Active'
                : sortedPhases.length > 0 && sortedPhases.every(p => p.status === 'Complete')
                ? 'Complete'
                : 'Pending'
            }
          />
        </div>

        {/* Sub-header */}
        <p
          className="text-[12px] mb-4"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          {project.startDate ? `Started ${project.startDate}` : 'Not started'}
          {project.quotedPrice != null && (
            <span> · Quoted: ${project.quotedPrice.toLocaleString()}</span>
          )}
        </p>

        {/* Progress trail */}
        <ProgressTrail phases={sortedPhases} />

        {/* Phase panels */}
        {sortedPhases.length === 0 ? (
          <div className="py-4 text-center">
            <p
              className="text-[13px] mb-3"
              style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              No phases yet
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PHASE_ORDER.map(type => {
                const isLoading = activating === type;
                const isDone = activated === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleActivate(type)}
                    disabled={activating !== null}
                    className="px-3 min-h-[32px] text-[12px] transition-all disabled:opacity-50"
                    style={{
                      border: `1px solid ${isDone ? 'oklch(0.45 0.1 145 / 0.4)' : isLoading ? 'oklch(0.68 0.16 50 / 0.5)' : 'var(--border)'}`,
                      borderRadius: '2px',
                      color: isDone ? 'oklch(0.45 0.1 145)' : isLoading ? 'var(--ember)' : 'var(--muted-foreground)',
                      backgroundColor: 'transparent',
                      fontFamily: 'var(--font-inter), sans-serif',
                    }}
                  >
                    {isLoading ? `Activating ${type}…` : isDone ? `✓ ${type} activated` : `+ Activate ${type}`}
                  </button>
                );
              })}
            </div>
            {activateError && (
              <p
                className="text-[11px] mt-3 px-2"
                style={{ color: 'var(--error)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {activateError}
              </p>
            )}
          </div>
        ) : (
          PHASE_ORDER.map((phaseType, i) => {
            const phase = sortedPhases.find(p => p.phaseType === phaseType);
            const prevPhase = i > 0 ? sortedPhases.find(p => p.phaseType === PHASE_ORDER[i - 1]) : undefined;
            const isPreviousComplete = prevPhase?.status === 'Complete';

            if (phase?.status === 'Active') {
              return (
                <ActivePhasePanel
                  key={phase.id}
                  phase={phase}
                  tasks={tasks}
                  projectId={project.id}
                  onPhaseUpdate={onPhaseUpdate}
                  onGenerateEmail={onGenerateEmail}
                  onRefresh={onRefresh}
                  onDeletePhase={onDeletePhase}
                />
              );
            }
            if (phase?.status === 'Complete') {
              return <CompletePhasePanel key={phase.id} phase={phase} tasks={tasks} onDeletePhase={onDeletePhase} />;
            }
            if (phase) {
              return (
                <PendingPhasePanel
                  key={phase.id}
                  phase={phase}
                  isPreviousComplete={isPreviousComplete}
                  projectId={project.id}
                  onActivatePhase={onActivatePhase}
                  onDeletePhase={onDeletePhase}
                />
              );
            }
            return (
              <UnactivatedPhaseSlot
                key={phaseType}
                phaseType={phaseType}
                isPreviousComplete={isPreviousComplete}
                projectId={project.id}
                onActivatePhase={onActivatePhase}
              />
            );
          })
        )}
      </div>
      <ActivitySection projectId={project.id} />
    </div>
  );
}
