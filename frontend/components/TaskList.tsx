'use client';

import { useState } from 'react';
import { Task, TaskStatus, TaskType, Assignee, Client, EngagementOverview, completeTask, updateTask } from '@/lib/api';

const PRIORITY_DOT: Record<string, string> = {
  High:   'oklch(0.55 0.18 25)',
  Medium: 'var(--ember)',
  Low:    'var(--border)',
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
    <div
      className={`flex items-start gap-4 px-5 py-4 ${isDone ? 'opacity-40' : ''}`}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={completing || isDone}
        aria-label="Mark complete"
        className="flex-none mt-1 disabled:cursor-default"
      >
        <span
          className="flex w-6 h-6 items-center justify-center transition-colors"
          style={{
            borderRadius: '3px',
            border: isDone
              ? '2px solid var(--ember)'
              : completing
              ? '2px solid var(--ember)'
              : '2px solid var(--border)',
            backgroundColor: isDone ? 'var(--ember)' : 'transparent',
            opacity: completing ? 0.5 : 1,
          }}
        >
          {isDone && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--background)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </button>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[16px] leading-snug ${isDone ? 'line-through' : 'font-semibold'}`}
          style={{
            color: isDone ? 'var(--faint)' : 'var(--foreground)',
            fontFamily: isDone ? undefined : 'var(--font-fraunces), serif',
          }}
        >
          {task.fields.Title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            {task.fields.Assignee}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--border)' }}>·</span>
          <span
            className="text-[12px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            {task.fields['Task Type']}
          </span>
          {task.fields['Due Date'] && (
            <>
              <span className="text-[12px]" style={{ color: 'var(--border)' }}>·</span>
              <span
                className="text-[12px] uppercase tracking-[0.08em]"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
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
          className="w-2 h-2 rounded-full mt-1.5"
          style={{ backgroundColor: PRIORITY_DOT[task.fields.Priority] ?? 'var(--border)' }}
          title={`Priority: ${task.fields.Priority}`}
        />
        {!isDone && (
          <select
            value={task.fields.Status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="text-[12px] font-semibold px-2 py-1.5 min-h-[36px] focus:outline-none uppercase tracking-[0.08em]"
            style={{
              border: '1px solid var(--border)',
              borderRadius: '3px',
              backgroundColor: 'var(--cream)',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-inter), sans-serif',
            }}
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

    const seen = new Map<string, Task[]>();
    for (const task of projectTasks) {
      const g = task.fields['Phase Group'] ?? '';
      if (!seen.has(g)) seen.set(g, []);
      seen.get(g)!.push(task);
    }

    let activeGroupName: string | null = null;
    let activeGroupTasks: Task[] = [];
    for (const [groupName, groupTasks] of seen) {
      if (groupTasks.some((t) => t.fields.Status !== 'Done')) {
        activeGroupName = groupName;
        activeGroupTasks = groupTasks;
        break;
      }
    }

    if (activeGroupName === null) continue;

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

  const filterSelectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    padding: '0 0.75rem',
    minHeight: '44px',
    backgroundColor: 'var(--cream)',
    color: 'var(--muted-foreground)',
    outline: 'none',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.10em',
    fontFamily: 'var(--font-inter), sans-serif',
  };

  const applyFilters = (t: Task) => {
    if (assigneeFilter && t.fields.Assignee !== assigneeFilter) return false;
    if (statusFilter && t.fields.Status !== statusFilter) return false;
    if (typeFilter && t.fields['Task Type'] !== typeFilter) return false;
    return true;
  };

  const isSequenced = engagements !== undefined && clients !== undefined;

  const FilterBar = () => (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value as Assignee | '')} style={filterSelectStyle}>
        <option value="">All assignees</option>
        <option value="Mallorie">Mallorie</option>
        <option value="Andy">Andy</option>
      </select>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')} style={filterSelectStyle}>
        <option value="">All statuses</option>
        <option>To Do</option>
        <option>In Progress</option>
        <option>Done</option>
        <option>Blocked</option>
      </select>
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TaskType | '')} style={filterSelectStyle}>
        <option value="">All types</option>
        <option>Onboarding</option>
        <option>Build</option>
        <option>Maintenance</option>
        <option>QA</option>
        <option>Admin</option>
      </select>
    </div>
  );

  if (isSequenced) {
    const rawGroups = buildClientGroups(engagements!, clients!, tasks);
    const visibleGroups = rawGroups
      .map((g) => ({ ...g, tasks: g.tasks.filter(applyFilters) }))
      .filter((g) => g.tasks.length > 0);

    return (
      <div>
        {showFilters && <FilterBar />}

        {visibleGroups.length === 0 ? (
          <p className="text-base text-center py-12 italic" style={{ color: 'var(--muted-foreground)' }}>
            No active tasks
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {visibleGroups.map((group) => (
              <div key={`${group.companyName}·${group.phaseGroupName}`}>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-3"
                  style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                >
                  {group.companyName}
                  <span style={{ color: 'oklch(0.68 0.16 50 / 0.4)' }}> · </span>
                  {group.phaseGroupName}
                </p>
                <div
                  className="overflow-hidden"
                  style={{
                    backgroundColor: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderTop: '3px solid var(--ember)',
                    borderRadius: 'var(--radius)',
                  }}
                >
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

  const filtered = tasks.filter(applyFilters);

  return (
    <div>
      {showFilters && <FilterBar />}

      <div
        className="overflow-hidden"
        style={{
          backgroundColor: 'var(--muted)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--ember)',
          borderRadius: 'var(--radius)',
        }}
      >
        {filtered.length === 0 ? (
          <p className="text-base text-center py-12 italic" style={{ color: 'var(--muted-foreground)' }}>
            No tasks
          </p>
        ) : (
          filtered.map((task) => <TaskRow key={task.id} task={task} onUpdate={onUpdate} />)
        )}
      </div>
    </div>
  );
}
