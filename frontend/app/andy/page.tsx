'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="min-h-screen bg-[#0E1B11]">
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b border-[rgba(196,175,90,0.13)] px-5 sm:px-8 flex items-center justify-between gap-4"
        style={{ minHeight: '60px', background: 'rgba(14,27,17,0.94)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-4">
          <Image
            src="/logo-green-gold.png"
            alt="Larrikin"
            width={0}
            height={0}
            sizes="160px"
            className="h-6 w-auto"
          />
          <div className="w-px h-4 bg-[rgba(196,175,90,0.20)]" />
          <span
            className="text-[13px] font-semibold tracking-[0.20em] text-[#C4AF5A] uppercase"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Andy · HQ
          </span>
        </div>
        <Link
          href="/"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[#EDE4C8] transition-colors"
          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
        >
          ← Mallorie
        </Link>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[60px] z-10 border-b border-[rgba(196,175,90,0.13)]"
        style={{ background: 'rgba(22,44,26,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <nav className="flex overflow-x-auto scrollbar-hide px-5 sm:px-8">
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex-none flex items-center gap-2 px-4 whitespace-nowrap transition-all duration-150 border-b-2 text-[12px] font-semibold tracking-[0.16em] uppercase ${
                tab === id
                  ? 'text-[#EDE4C8] border-b-[#C4AF5A]'
                  : 'text-[rgba(237,228,200,0.40)] border-b-transparent hover:text-[rgba(237,228,200,0.70)]'
              }`}
              style={{ minHeight: '48px', fontFamily: 'var(--font-barlow), sans-serif' }}
            >
              {label}
              {count > 0 && (
                <span className="text-[11px] bg-[#C4AF5A] text-[#0E1B11] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[18px] text-center tabular-nums">
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
            className="text-[rgba(237,228,200,0.35)] text-base py-20 text-center tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Loading…
          </div>
        ) : (
          <section>
            <div className="border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
              <p
                className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
                style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
              >
                {tab === 'my-tasks' ? 'Task Board' : tab === 'maintenance' ? 'Maintenance' : 'QA'}
              </p>
              <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none" style={{ fontFamily: 'var(--font-playfair), serif' }}>
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
