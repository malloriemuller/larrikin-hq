'use client';

import { useState } from 'react';
import { Task, TaskStatus, TaskType, Assignee, Client, EngagementOverview, completeTask, updateTask } from '@/lib/api';

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

// ─── Sequenced client-grouped view ────────────────────────────────────────────

interface ClientGroup {
  companyName: string;
  phaseGroupName: string;
  tasks: Task[];
}

function buildClientGroups(
  engagements: EngagementOverview[],
  clients: Client[],
  tasks: Task[]
): ClientGroup[] {
  const groups: ClientGroup[] = [];

  for (const engagement of engagements) {
    const projectTasks = tasks.filter(
      (t) => t.fields.Project?.includes(engagement.project.id)
    );

    // Group by Phase Group preserving insertion order
    const seen = new Map<string, Task[]>();
    for (const task of projectTasks) {
      const g = task.fields['Phase Group'] ?? '';
      if (!seen.has(g)) seen.set(g, []);
      seen.get(g)!.push(task);
    }

    // Find first group with at least one incomplete task
    let activeGroupName: string | null = null;
    let activeGroupTasks: Task[] = [];
    for (const [groupName, groupTasks] of seen) {
      if (groupTasks.some((t) => t.fields.Status !== 'Done')) {
        activeGroupName = groupName;
        activeGroupTasks = groupTasks;
        break;
      }
    }

    if (activeGroupName === null) continue; // all tasks done — skip client

    const client = clients.find((c) => c.id === engagement.project.clientId);
    const companyName = client?.fields.Company ?? engagement.project.name;

    groups.push({ companyName, phaseGroupName: activeGroupName, tasks: activeGroupTasks });
  }

  return groups;
}

// ─── Props + component ────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  onUpdate: () => void;
  showFilters?: boolean;
  engagements?: EngagementOverview[];
  clients?: Client[];
}

export default function TaskList({
  tasks,
  onUpdate,
  showFilters = false,
  engagements,
  clients,
}: TaskListProps) {
  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');

  const filterSelectClass =
    'flex-1 min-w-0 text-[12px] font-semibold border border-[rgba(196,175,90,0.18)] rounded-[3px] px-3 min-h-[44px] bg-[rgba(0,0,0,0.25)] text-[rgba(237,228,200,0.65)] focus:outline-none focus:border-[rgba(196,175,90,0.45)] uppercase tracking-[0.10em]';

  const applyFilters = (t: Task) => {
    if (assigneeFilter && t.fields.Assignee !== assigneeFilter) return false;
    if (statusFilter && t.fields.Status !== statusFilter) return false;
    if (typeFilter && t.fields['Task Type'] !== typeFilter) return false;
    return true;
  };

  // ── Sequenced mode (engagements + clients provided) ──
  const isSequenced = engagements !== undefined && clients !== undefined;

  if (isSequenced) {
    const rawGroups = buildClientGroups(engagements!, clients!, tasks);
    const visibleGroups = rawGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter(applyFilters) }))
      .filter((g) => g.tasks.length > 0);

    return (
      <div>
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2 mb-6" style={{ fontFamily: 'var(--font-barlow), sans-serif' }}>
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

        {visibleGroups.length === 0 ? (
          <p className="text-base text-[rgba(237,228,200,0.35)] text-center py-12 italic">
            No active tasks
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <div key={`${group.companyName}·${group.phaseGroupName}`}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3"
                  style={{ color: '#C4AF5A', fontFamily: 'var(--font-barlow), sans-serif' }}
                >
                  {group.companyName}
                  <span style={{ color: 'rgba(196,175,90,0.40)' }}> · </span>
                  {group.phaseGroupName}
                </p>
                <div className="bg-[#162C1A] rounded-[3px] border border-[rgba(196,175,90,0.13)]" style={{ borderTop: '3px solid #C4AF5A' }}>
                  {group.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} onUpdate={onUpdate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Flat mode (Andy's dashboard + fallback) ──
  const filtered = tasks.filter(applyFilters);

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
