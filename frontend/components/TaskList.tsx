'use client';

import { useState } from 'react';
import { Task, TaskStatus, TaskType, Assignee, completeTask, updateTask } from '@/lib/api';

const PRIORITY_DOT: Record<string, string> = {
  High:   'bg-red-400',
  Medium: 'bg-[#C4AF5A]',
  Low:    'bg-[rgba(237,228,200,0.20)]',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  'To Do':      'To Do',
  'In Progress':'In Progress',
  Done:         'Done',
  Blocked:      'Blocked',
};

interface TaskRowProps {
  task: Task;
  onUpdate: () => void;
}

function TaskRow({ task, onUpdate }: TaskRowProps) {
  const [completing, setCompleting] = useState(false);
  const isDone = task.fields.Status === 'Done';

  async function handleComplete() {
    if (isDone || completing) return;
    setCompleting(true);
    try {
      await completeTask(task.id);
      onUpdate();
    } finally {
      setCompleting(false);
    }
  }

  async function handleStatusChange(status: TaskStatus) {
    await updateTask(task.id, { Status: status });
    onUpdate();
  }

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-[rgba(196,175,90,0.08)] last:border-0 ${isDone ? 'opacity-40' : ''}`}>
      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={completing || isDone}
        aria-label="Mark complete"
        className="flex-none mt-1 disabled:cursor-default"
      >
        <span
          className={`flex w-6 h-6 rounded-[3px] border-2 items-center justify-center transition-colors ${
            isDone
              ? 'bg-[#C4AF5A] border-[#C4AF5A] text-[#0E1B11]'
              : completing
              ? 'border-[#C4AF5A] opacity-50'
              : 'border-[rgba(196,175,90,0.30)] hover:border-[rgba(196,175,90,0.65)]'
          }`}
        >
          {isDone && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </button>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[16px] leading-snug ${isDone ? 'line-through text-[rgba(237,228,200,0.30)]' : 'font-semibold text-[#EDE4C8]'}`}
          style={!isDone ? { fontFamily: 'var(--font-playfair), serif' } : {}}
        >
          {task.fields.Title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
          <span
            className="text-[12px] font-semibold text-[#C4AF5A] uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            {task.fields.Assignee}
          </span>
          <span className="text-[rgba(237,228,200,0.25)] text-[12px]">·</span>
          <span
            className="text-[12px] text-[rgba(237,228,200,0.45)] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            {task.fields['Task Type']}
          </span>
          {task.fields['Due Date'] && (
            <>
              <span className="text-[rgba(237,228,200,0.25)] text-[12px]">·</span>
              <span
                className="text-[12px] text-[rgba(237,228,200,0.45)] uppercase tracking-[0.08em]"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {task.fields['Due Date']}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Priority + status */}
      <div className="flex-none flex flex-col items-end gap-2">
        <span
          className={`w-2 h-2 rounded-full mt-1.5 ${PRIORITY_DOT[task.fields.Priority] ?? 'bg-[rgba(237,228,200,0.20)]'}`}
          title={`Priority: ${task.fields.Priority}`}
        />
        {!isDone && (
          <select
            value={task.fields.Status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="text-[12px] font-semibold border border-[rgba(196,175,90,0.18)] rounded-[3px] px-2 py-1.5 min-h-[36px] focus:outline-none focus:border-[rgba(196,175,90,0.45)] bg-[rgba(0,0,0,0.25)] text-[rgba(237,228,200,0.70)] uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  onUpdate: () => void;
  filters?: {
    assignee?: Assignee;
    status?: TaskStatus;
    taskType?: TaskType;
  };
  showFilters?: boolean;
}

export default function TaskList({ tasks, onUpdate, showFilters = false }: TaskListProps) {
  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');

  const filtered = tasks.filter((t) => {
    if (assigneeFilter && t.fields.Assignee !== assigneeFilter) return false;
    if (statusFilter && t.fields.Status !== statusFilter) return false;
    if (typeFilter && t.fields['Task Type'] !== typeFilter) return false;
    return true;
  });

  const filterSelectClass =
    'flex-1 min-w-0 text-[12px] font-semibold border border-[rgba(196,175,90,0.18)] rounded-[3px] px-3 min-h-[44px] bg-[rgba(0,0,0,0.25)] text-[rgba(237,228,200,0.65)] focus:outline-none focus:border-[rgba(196,175,90,0.45)] uppercase tracking-[0.10em]';

  return (
    <div>
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as Assignee | '')} className={filterSelectClass}>
            <option value="">All assignees</option>
            <option value="Mallorie">Mallorie</option>
            <option value="Andy">Andy</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')} className={filterSelectClass}>
            <option value="">All statuses</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>Done</option>
            <option>Blocked</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TaskType | '')} className={filterSelectClass}>
            <option value="">All types</option>
            <option>Onboarding</option>
            <option>Build</option>
            <option>Maintenance</option>
            <option>QA</option>
            <option>Admin</option>
          </select>
        </div>
      )}

      <div className="bg-[#162C1A] rounded-[3px] border border-[rgba(196,175,90,0.13)]" style={{ borderTop: '3px solid #C4AF5A' }}>
        {filtered.length === 0 ? (
          <p className="text-base text-[rgba(237,228,200,0.35)] text-center py-12 italic">No tasks</p>
        ) : (
          filtered.map((task) => <TaskRow key={task.id} task={task} onUpdate={onUpdate} />)
        )}
      </div>
    </div>
  );
}
