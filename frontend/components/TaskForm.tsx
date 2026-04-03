'use client';

import { useState } from 'react';
import { createTask, Project, TaskType, Assignee } from '@/lib/api';

const TASK_TYPES: TaskType[] = ['Onboarding', 'Build', 'Maintenance', 'QA', 'Admin'];
const ASSIGNEES: Assignee[] = ['Mallorie', 'Andy'];
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

interface TaskFormProps {
  projects: Project[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({ projects, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [assignee, setAssignee] = useState<Assignee>('Mallorie');
  const [taskType, setTaskType] = useState<TaskType>('Build');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) {
      setError('Title and project are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createTask({
        Title: title.trim(),
        Project: [projectId],
        Assignee: assignee,
        'Task Type': taskType,
        Priority: priority,
        'Due Date': dueDate || undefined,
        Description: description.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(12,30,20,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-md bg-[#F7E6B8] rounded-[4px] border border-[rgba(12,30,20,0.14)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-[rgba(12,30,20,0.10)] px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7D2A] mb-0.5" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>New Task</div>
            <h2 className="text-lg font-bold text-[#0C1E14]">Add a task</h2>
          </div>
          <button onClick={onCancel} className="text-[rgba(12,30,20,0.35)] hover:text-[#0C1E14] transition-colors text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <Field label="Title *">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" className={inputCls} required autoFocus />
          </Field>

          <Field label="Project *">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls} required>
              {projects.length === 0 && <option value="">No active projects</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <select value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)} className={inputCls}>
                {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)} className={inputCls}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes…" className={`${inputCls} resize-none`} />
          </Field>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 min-h-[44px] rounded-sm border border-[rgba(12,30,20,0.14)] text-sm text-[rgba(12,30,20,0.50)] hover:text-[#0C1E14] hover:border-[rgba(12,30,20,0.35)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || projects.length === 0} className="flex-1 min-h-[44px] rounded-sm bg-[#0C1E14] text-[#F7E6B8] text-sm font-semibold hover:bg-[#1a3a24] transition-colors disabled:opacity-50">
              {saving ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(12,30,20,0.45)]" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full min-h-[40px] px-3 rounded-sm border border-[rgba(12,30,20,0.14)] bg-[rgba(12,30,20,0.04)] text-sm text-[#0C1E14] placeholder-[rgba(12,30,20,0.30)] focus:outline-none focus:border-[rgba(12,30,20,0.35)] transition-colors';
