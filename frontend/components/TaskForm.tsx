'use client';

import { useState } from 'react';
import { createTask, Project, TaskType, Assignee } from '@/lib/api';

const TASK_TYPES: TaskType[] = ['Onboarding', 'Build', 'Maintenance', 'QA', 'Admin'];
const ASSIGNEES: Assignee[] = ['Mallorie', 'Andy'];
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '40px',
  padding: '0 0.75rem',
  backgroundColor: 'var(--cream)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--foreground)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'var(--ember)',
  boxShadow: '0 0 0 3px oklch(0.68 0.16 50 / 0.12)',
};

interface TaskFormProps {
  projects: Project[];
  onSuccess: () => void;
  onCancel: () => void;
}

function Input({ value, onChange, placeholder, type = 'text', required, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
    />
  );
}

function SelectInput({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
    >
      {children}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        minHeight: 'unset',
        padding: '0.5rem 0.75rem',
        resize: 'none',
        ...(focused ? focusStyle : {}),
      }}
    />
  );
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
      style={{ background: 'oklch(0 0 0 / 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-0.5"
              style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
            >
              New Task
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
            >
              Add a task
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-2xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <Field label="Title *">
            <Input value={title} onChange={setTitle} placeholder="What needs doing?" required autoFocus />
          </Field>

          <Field label="Project *">
            <SelectInput value={projectId} onChange={setProjectId}>
              {projects.length === 0 && <option value="">No active projects</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <SelectInput value={assignee} onChange={v => setAssignee(v as Assignee)}>
                {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </SelectInput>
            </Field>
            <Field label="Type">
              <SelectInput value={taskType} onChange={v => setTaskType(v as TaskType)}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectInput>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <SelectInput value={priority} onChange={v => setPriority(v as 'High' | 'Medium' | 'Low')}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </SelectInput>
            </Field>
            <Field label="Due Date">
              <Input type="date" value={dueDate} onChange={setDueDate} />
            </Field>
          </div>

          <Field label="Description">
            <TextArea value={description} onChange={setDescription} rows={2} placeholder="Optional notes…" />
          </Field>

          {error && (
            <p
              className="text-sm px-3 py-2"
              style={{
                color: 'var(--error)',
                backgroundColor: 'oklch(0.55 0.18 25 / 0.08)',
                border: '1px solid oklch(0.55 0.18 25 / 0.2)',
                borderRadius: 'var(--radius)',
              }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] text-sm transition-opacity hover:opacity-70"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || projects.length === 0}
              className="flex-1 min-h-[44px] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                borderRadius: '9999px',
                backgroundColor: 'var(--ink)',
                color: 'var(--background)',
                fontFamily: 'var(--font-inter), sans-serif',
                border: 'none',
                cursor: (saving || projects.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
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
      <label
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
