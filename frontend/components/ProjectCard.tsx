'use client';

import { useState } from 'react';
import { Project, Phase, updateProject, updatePhase, createPhase } from '@/lib/api';

interface ProjectCardProps {
  project: Project;
  phases?: Phase[];
  onTriggerEmail?: (emailType: string) => void;
  onUpdate?: () => void;
}

const PHASE_EMAILS: Record<string, string[]> = {
  'Discovery':  ['Pre-Meeting Preview'],
  'Proposal':   ['Proposal Follow-Up', 'Pre-Meeting Preview'],
  'Onboarding': [],
  'Build':      ['Milestone Notification'],
  'QA':         [],
  'Launch':     ['Post-Demo Email'],
  'Retainer':   ['Retainer Onboarding Email'],
};

const PHASE_STATUS_OPTIONS = ['Pending', 'Active', 'Complete'] as const;
const PHASE_OPTIONS = ['Discovery', 'Proposal', 'Onboarding', 'Build', 'QA', 'Launch', 'Retainer'] as const;

const editInputCls =
  'w-full min-h-[36px] px-2 rounded-[3px] border border-[rgba(196,175,90,0.18)] bg-[rgba(0,0,0,0.25)] text-sm text-[#EDE4C8] placeholder-[rgba(237,228,200,0.25)] focus:outline-none focus:border-[rgba(196,175,90,0.45)] transition-colors';

// ─── Phase edit panel ────────────────────────────────────────────────────────

function PhaseEditPanel({ phase, onClose, onSaved }: { phase: Phase; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<'Pending' | 'Active' | 'Complete'>(phase.fields.Status);
  const [targetDate, setTargetDate] = useState(phase.fields['Target Date'] ?? '');
  const [billingAmount, setBillingAmount] = useState(phase.fields['Billing Amount'] != null ? String(phase.fields['Billing Amount']) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updatePhase(phase.id, {
        Status: status,
        'Target Date': targetDate || undefined,
        'Billing Amount': billingAmount ? Number(billingAmount) : undefined,
      });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[rgba(0,0,0,0.20)] border border-[rgba(196,175,90,0.15)] rounded-[3px] px-3 py-3 mt-2 flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-[#C4AF5A] uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
        {phase.fields['Phase Name']}
      </p>
      <div className="flex gap-1">
        {PHASE_STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`flex-1 min-h-[32px] text-xs rounded-[3px] border transition-colors ${
              status === s
                ? 'bg-[#C4AF5A] border-[#C4AF5A] text-[#0E1B11] font-semibold'
                : 'border-[rgba(196,175,90,0.20)] text-[rgba(237,228,200,0.55)] hover:border-[rgba(196,175,90,0.45)]'
            }`}>
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Target Date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={editInputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Billing Amount</label>
          <input type="number" value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} placeholder="0" className={editInputCls} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 min-h-[36px] rounded-[3px] border border-[rgba(196,175,90,0.20)] text-xs text-[rgba(237,228,200,0.50)] hover:text-[#EDE4C8] transition-colors">Cancel</button>
        <button onClick={save} disabled={saving} className="flex-1 min-h-[36px] rounded-[3px] bg-[#C4AF5A] text-[#0E1B11] text-xs font-bold hover:bg-[#D4BF6A] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Project edit panel ──────────────────────────────────────────────────────

function ProjectEditPanel({ project, onClose, onSaved }: { project: Project; onClose: () => void; onSaved: () => void }) {
  const f = project.fields;
  const [quotedPrice, setQuotedPrice] = useState(f['Quoted Price'] != null ? String(f['Quoted Price']) : '');
  const [startDate, setStartDate] = useState(f['Start Date'] ?? '');
  const [endDate, setEndDate] = useState(f['Target End Date'] ?? '');
  const [scopeNotes, setScopeNotes] = useState(f['v1 Scope Notes'] ?? '');
  const [specUrl, setSpecUrl] = useState(f['Spec URL'] ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProject(project.id, {
        'Quoted Price': quotedPrice ? Number(quotedPrice) : undefined,
        'Start Date': startDate || undefined,
        'Target End Date': endDate || undefined,
        'v1 Scope Notes': scopeNotes || undefined,
        'Spec URL': specUrl.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-[rgba(196,175,90,0.10)] mt-3 pt-3 flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-[rgba(237,228,200,0.40)] uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Project Details</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Quoted Price</label>
          <input type="number" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} placeholder="0" className={editInputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={editInputCls} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Target End Date</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={editInputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>v1 Scope Notes</label>
        <textarea value={scopeNotes} onChange={(e) => setScopeNotes(e.target.value)} rows={3} placeholder="Scope notes…" className={`${editInputCls} resize-none`} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Spec / Build Doc URL</label>
        <input type="url" value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} placeholder="https://docs.google.com/…" className={editInputCls} />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 min-h-[36px] rounded-[3px] border border-[rgba(196,175,90,0.20)] text-xs text-[rgba(237,228,200,0.50)] hover:text-[#EDE4C8] transition-colors">Cancel</button>
        <button onClick={save} disabled={saving} className="flex-1 min-h-[36px] rounded-[3px] bg-[#C4AF5A] text-[#0E1B11] text-xs font-bold hover:bg-[#D4BF6A] transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ─── Add phase form ──────────────────────────────────────────────────────────

function AddPhaseForm({ projectId, nextOrder, onClose, onSaved }: { projectId: string; nextOrder: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState<string>(PHASE_OPTIONS[0]);
  const [targetDate, setTargetDate] = useState('');
  const [billingAmount, setBillingAmount] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) return;
    setSaving(true);
    try {
      await createPhase({
        'Phase Name': name,
        Project: [projectId],
        Order: nextOrder,
        Status: 'Pending',
        'Target Date': targetDate || undefined,
        'Billing Milestone': isMilestone,
        'Billing Amount': billingAmount ? Number(billingAmount) : undefined,
      });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[rgba(0,0,0,0.20)] border border-[rgba(196,175,90,0.15)] rounded-[3px] px-3 py-3 mt-2 flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-[#C4AF5A] uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>New Phase</p>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Phase</label>
        <select value={name} onChange={(e) => setName(e.target.value)} className={editInputCls} autoFocus>
          {PHASE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Target Date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={editInputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[rgba(237,228,200,0.45)] font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>Billing Amount</label>
          <input type="number" value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} placeholder="0" className={editInputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isMilestone} onChange={(e) => setIsMilestone(e.target.checked)} className="w-4 h-4 accent-[#C4AF5A]" />
        <span className="text-sm text-[rgba(237,228,200,0.55)]">Billing milestone</span>
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 min-h-[36px] rounded-[3px] border border-[rgba(196,175,90,0.20)] text-xs text-[rgba(237,228,200,0.50)] hover:text-[#EDE4C8] transition-colors">Cancel</button>
        <button onClick={save} disabled={saving || !name} className="flex-1 min-h-[36px] rounded-[3px] bg-[#C4AF5A] text-[#0E1B11] text-xs font-bold hover:bg-[#D4BF6A] transition-colors disabled:opacity-50">
          {saving ? 'Adding…' : 'Add Phase'}
        </button>
      </div>
    </div>
  );
}

// ─── Main card ───────────────────────────────────────────────────────────────

export default function ProjectCard({ project, phases = [], onTriggerEmail, onUpdate }: ProjectCardProps) {
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);

  const activePhase = phases.find((p) => p.fields.Status === 'Active');
  const emailTriggers = activePhase
    ? (PHASE_EMAILS[activePhase.fields['Phase Name']] ?? [])
    : [];

  const f = project.fields;
  const hasProjectDetails = f['Quoted Price'] || f['Start Date'] || f['Target End Date'] || f['Spec URL'];

  function togglePhase(id: string) {
    setEditingPhaseId((prev) => (prev === id ? null : id));
    setShowProjectEdit(false);
    setShowAddPhase(false);
  }

  function toggleProjectEdit() {
    setShowProjectEdit((prev) => !prev);
    setEditingPhaseId(null);
    setShowAddPhase(false);
  }

  const typeStripe = project.fields.Type === 'Audit' ? '#C4AF5A' : '#3D6B4F';

  return (
    <div className="rounded-[3px] overflow-hidden border border-[rgba(196,175,90,0.13)] hover:border-[rgba(196,175,90,0.28)] transition-colors bg-[#162C1A]">
      {/* Type stripe */}
      <div style={{ height: '3px', background: typeStripe }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-semibold tracking-[0.20em] uppercase text-[rgba(237,228,200,0.40)] mb-1.5"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {project.fields.Type}
            </p>
            <h3 className="font-bold text-[#EDE4C8] text-xl leading-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              {project.fields.Name}
            </h3>
            {f['Target End Date'] && !showProjectEdit && (
              <p
                className="text-[12px] text-[rgba(237,228,200,0.45)] mt-1 tracking-[0.08em] uppercase"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                Target {f['Target End Date']}
              </p>
            )}
          </div>
          <button
            onClick={toggleProjectEdit}
            title="Edit project details"
            className={`w-7 h-7 rounded-[3px] border flex items-center justify-center flex-none transition-colors ${
              showProjectEdit
                ? 'bg-[#C4AF5A] border-[#C4AF5A] text-[#0E1B11]'
                : 'border-[rgba(196,175,90,0.20)] text-[rgba(237,228,200,0.40)] hover:border-[rgba(196,175,90,0.45)] hover:text-[#EDE4C8]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15H9v-2z" />
            </svg>
          </button>
        </div>

        {/* Project detail summary */}
        {!showProjectEdit && hasProjectDetails && (
          <div
            className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[12px] text-[rgba(237,228,200,0.50)] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            {f['Quoted Price'] && <span>${f['Quoted Price'].toLocaleString()}</span>}
            {f['Start Date'] && <span>Start {f['Start Date']}</span>}
            {f['Spec URL'] && (
              <a
                href={f['Spec URL']}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4AF5A] hover:text-[#EDE4C8] transition-colors normal-case"
              >
                Build doc ↗
              </a>
            )}
          </div>
        )}

        {/* No phases empty state */}
        {phases.length === 0 && !showProjectEdit && (
          <div className="mb-4">
            {showAddPhase ? (
              <AddPhaseForm projectId={project.id} nextOrder={1} onClose={() => setShowAddPhase(false)} onSaved={() => onUpdate?.()} />
            ) : (
              <button
                onClick={() => { setShowAddPhase(true); setShowProjectEdit(false); setEditingPhaseId(null); }}
                className="w-full min-h-[44px] rounded-[3px] border border-dashed border-[rgba(196,175,90,0.18)] text-sm text-[rgba(237,228,200,0.35)] hover:border-[rgba(196,175,90,0.40)] hover:text-[rgba(237,228,200,0.65)] transition-colors"
              >
                + Add first phase
              </button>
            )}
          </div>
        )}

        {/* Phase timeline */}
        {phases.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center">
              {phases.map((phase, i) => {
                const isComplete = phase.fields.Status === 'Complete';
                const isActive = phase.fields.Status === 'Active';
                const isLast = i === phases.length - 1;
                const isEditing = editingPhaseId === phase.id;

                return (
                  <div key={phase.id} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 flex-none">
                      <button
                        onClick={() => togglePhase(phase.id)}
                        title={`Edit ${phase.fields['Phase Name']}`}
                        className={`flex items-center justify-center rounded-full transition-all ${
                          isEditing ? 'ring-2 ring-[#C4AF5A] ring-offset-1 ring-offset-[#162C1A]' : ''
                        } ${
                          isActive
                            ? 'w-5 h-5 bg-[#EDE4C8]'
                            : isComplete
                            ? 'w-4 h-4 bg-[#C4AF5A]'
                            : 'w-4 h-4 border-2 border-[rgba(196,175,90,0.25)] bg-transparent hover:border-[rgba(196,175,90,0.55)]'
                        }`}
                      >
                        {isComplete && (
                          <svg className="w-2.5 h-2.5 text-[#0E1B11]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isActive && <div className="w-2 h-2 rounded-full bg-[#0E1B11]" />}
                      </button>
                      <span
                        className={`text-[9px] text-center leading-tight max-w-[52px] truncate uppercase tracking-[0.08em] ${
                          isActive ? 'text-[#EDE4C8] font-bold' : isComplete ? 'text-[#C4AF5A] font-semibold' : 'text-[rgba(237,228,200,0.30)]'
                        }`}
                        style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                      >
                        {phase.fields['Phase Name']}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-px mx-1 mb-4 ${isComplete ? 'bg-[rgba(196,175,90,0.40)]' : 'bg-[rgba(196,175,90,0.12)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {editingPhaseId && (
              <PhaseEditPanel phase={phases.find((p) => p.id === editingPhaseId)!} onClose={() => setEditingPhaseId(null)} onSaved={() => onUpdate?.()} />
            )}

            {showAddPhase ? (
              <AddPhaseForm projectId={project.id} nextOrder={phases.length + 1} onClose={() => setShowAddPhase(false)} onSaved={() => onUpdate?.()} />
            ) : (
              !editingPhaseId && !showProjectEdit && (
                <button
                  onClick={() => { setShowAddPhase(true); setEditingPhaseId(null); setShowProjectEdit(false); }}
                  className="mt-2 text-[12px] uppercase tracking-[0.10em] text-[rgba(237,228,200,0.30)] hover:text-[#EDE4C8] transition-colors"
                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                >
                  + Add phase
                </button>
              )
            )}
          </div>
        )}

        {/* Active phase callout */}
        {activePhase && !editingPhaseId && (
          <div className="bg-[rgba(196,175,90,0.10)] border border-[rgba(196,175,90,0.20)] rounded-[3px] px-3 py-2.5 mb-4">
            <p className="text-sm text-[#EDE4C8]">
              <span className="font-semibold text-[#C4AF5A]">Active —</span>{' '}
              {activePhase.fields['Phase Name']}
              {activePhase.fields['Target Date'] && (
                <span
                  className="text-[rgba(237,228,200,0.50)] text-[12px] ml-1 uppercase tracking-[0.08em]"
                  style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                >
                  · Due {activePhase.fields['Target Date']}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Project edit panel */}
        {showProjectEdit && (
          <ProjectEditPanel project={project} onClose={() => setShowProjectEdit(false)} onSaved={() => onUpdate?.()} />
        )}

        {/* Email triggers */}
        {!showProjectEdit && !editingPhaseId && onTriggerEmail && emailTriggers.length > 0 && (
          <div className="border-t border-[rgba(196,175,90,0.10)] pt-3 mt-1">
            <p
              className="text-[11px] uppercase tracking-[0.22em] text-[rgba(237,228,200,0.35)] mb-2 font-semibold"
              style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              Queue Email Draft
            </p>
            <div className="flex flex-col gap-1.5">
              {emailTriggers.map((type) => (
                <button
                  key={type}
                  onClick={() => onTriggerEmail(type)}
                  className="flex items-center min-h-[40px] px-3 rounded-[3px] border border-[rgba(196,175,90,0.15)] text-sm text-[rgba(237,228,200,0.60)] hover:border-[rgba(196,175,90,0.40)] hover:text-[#EDE4C8] transition-colors text-left"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
