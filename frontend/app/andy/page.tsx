'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import TaskList from '@/components/TaskList';
import { listTasks, Task } from '@/lib/api';

type Tab = 'my-tasks' | 'maintenance' | 'qa';

export default function AndyDashboard() {
  const [tab, setTab] = useState<Tab>('my-tasks');
  const [allAndyTasks, setAllAndyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const tasks = await listTasks({ assignee: 'Andy' });
      setAllAndyTasks(tasks);
    } catch (err) {
      console.error('Failed to load Andy tasks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const myTasks = allAndyTasks.filter((t) => t.fields.Status !== 'Done');
  const maintenanceTasks = allAndyTasks.filter(
    (t) => t.fields['Task Type'] === 'Maintenance' && t.fields.Status !== 'Done'
  );
  const qaTasks = allAndyTasks.filter(
    (t) => t.fields['Task Type'] === 'QA' && t.fields.Status !== 'Done'
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'my-tasks', label: 'My Tasks', count: myTasks.length },
    { id: 'maintenance', label: 'Maintenance', count: maintenanceTasks.length },
    { id: 'qa', label: 'QA Checklist', count: qaTasks.length },
  ];

  const activeTasks =
    tab === 'my-tasks' ? myTasks : tab === 'maintenance' ? maintenanceTasks : qaTasks;

  const activeLabel =
    tab === 'my-tasks'
      ? `My Open Tasks (${myTasks.length})`
      : tab === 'maintenance'
      ? `Maintenance Queue (${maintenanceTasks.length})`
      : `QA Checklist (${qaTasks.length})`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 sm:px-8 flex items-center justify-between gap-4"
        style={{
          minHeight: '60px',
          background: 'oklch(0.985 0.005 80 / 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          <Logo />
          <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
          <span
            className="text-[13px] font-semibold tracking-[0.20em] uppercase"
            style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Andy · HQ
          </span>
        </div>
        <Link
          href="/"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          ← Mallorie
        </Link>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[60px] z-10"
        style={{
          background: 'oklch(0.95 0.01 80 / 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <nav className="flex overflow-x-auto scrollbar-hide px-5 sm:px-8">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="relative flex-none flex items-center gap-2 px-4 whitespace-nowrap transition-all duration-150 border-b-2 text-[12px] font-semibold tracking-[0.16em] uppercase"
              style={{
                minHeight: '48px',
                fontFamily: 'var(--font-inter), sans-serif',
                color: tab === id ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderBottomColor: tab === id ? 'var(--ember)' : 'transparent',
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="text-[11px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[18px] text-center tabular-nums"
                  style={{ backgroundColor: 'var(--ember)', color: 'var(--background)' }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-3xl mx-auto">
        {loading ? (
          <div
            className="text-base py-20 text-center tracking-widest uppercase"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Loading…
          </div>
        ) : (
          <section>
            <div className="pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
              <p
                className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
                style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
              >
                {tab === 'my-tasks' ? 'Task Board' : tab === 'maintenance' ? 'Maintenance' : 'QA'}
              </p>
              <h2
                className="text-[2.25rem] font-bold leading-none"
                style={{ color: 'var(--foreground)', fontFamily: 'var(--font-fraunces), serif' }}
              >
                {activeLabel}
              </h2>
            </div>
            <TaskList tasks={activeTasks} onUpdate={loadTasks} showFilters={false} />
          </section>
        )}
      </main>
    </div>
  );
}
