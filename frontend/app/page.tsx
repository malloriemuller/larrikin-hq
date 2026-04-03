'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PipelineBoard from '@/components/PipelineBoard';
import EmailQueuePanel from '@/components/EmailQueuePanel';
import TaskList from '@/components/TaskList';
import ProjectCard from '@/components/ProjectCard';
import ClientForm from '@/components/ClientForm';
import ProjectForm from '@/components/ProjectForm';
import TaskForm from '@/components/TaskForm';
import {
  listClients,
  listProjects,
  listTasks,
  listEmailQueue,
  getEngagement,
  activatePhase,
  updateProjectPhase,
  updateProject,
  deletePhase,
  generateEmailDraft,
  Client,
  Project,
  ProjectPhase,
  Task,
  EmailQueueEntry,
  EngagementOverview,
  EmailType,
} from '@/lib/api';

type Tab = 'pipeline' | 'projects' | 'tasks' | 'queue';

export default function MallorieDashboard() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<EngagementOverview[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emailQueue, setEmailQueue] = useState<EmailQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [clientData, projectList, taskData, queueData] = await Promise.all([
        listClients(),
        listProjects(),
        listTasks(),
        listEmailQueue(),
      ]);
      setClients(clientData);
      setTasks(taskData);
      setEmailQueue(queueData);

      const engagementData = await Promise.allSettled(
        projectList.map(p => getEngagement(p.id))
      );
      const resolved = engagementData
        .filter((r): r is PromiseFulfilledResult<EngagementOverview> => r.status === 'fulfilled')
        .map(r => r.value);
      const failed = engagementData.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('[loadAll] failed to load engagement(s):', failed);
      }
      setEngagements(resolved);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePhaseUpdate = async (phaseId: string, fields: Partial<ProjectPhase>) => {
    await updateProjectPhase(phaseId, fields);
    await loadAll();
  };

  const handleProjectUpdate = async (projectId: string, fields: Partial<Project>) => {
    await updateProject(projectId, fields);
    await loadAll();
  };

  const handleActivatePhase = async (
    projectId: string,
    phaseType: 'Audit' | 'Build' | 'Retainer'
  ) => {
    await activatePhase(projectId, phaseType);
    await loadAll();
  };

  const handleDeletePhase = async (phaseId: string) => {
    await deletePhase(phaseId);
    await loadAll();
  };

  const handleGenerateEmail = async (projectId: string, phaseId: string, emailType: string) => {
    try {
      await generateEmailDraft(projectId, emailType as EmailType);
      await loadAll();
      setTab('queue');
    } catch {
      alert(`Failed to generate draft for "${emailType}". Check the backend logs.`);
    }
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pendingQueueCount = emailQueue.length;
  const openTaskCount = tasks.filter((t) => t.fields.Status !== 'Done').length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'projects', label: 'Projects' },
    { id: 'tasks', label: 'Tasks', badge: openTaskCount > 0 ? openTaskCount : undefined },
    { id: 'queue', label: 'Queue', badge: pendingQueueCount > 0 ? pendingQueueCount : undefined },
  ];

  return (
    <div className="min-h-screen bg-[#0E1B11]">
      {showClientForm && (
        <ClientForm
          onSuccess={async () => { setShowClientForm(false); await loadAll(); }}
          onCancel={() => setShowClientForm(false)}
        />
      )}
      {showProjectForm && (
        <ProjectForm
          clients={clients}
          onSuccess={async () => { setShowProjectForm(false); await loadAll(); }}
          onCancel={() => setShowProjectForm(false)}
        />
      )}
      {showTaskForm && (
        <TaskForm
          projects={engagements.map(e => e.project)}
          onSuccess={async () => { setShowTaskForm(false); await loadAll(); }}
          onCancel={() => setShowTaskForm(false)}
        />
      )}

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
            Mallorie · HQ
          </span>
        </div>
        <Link
          href="/andy"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase text-[rgba(237,228,200,0.40)] hover:text-[#EDE4C8] transition-colors"
          style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
        >
          Andy →
        </Link>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[60px] z-10 border-b border-[rgba(196,175,90,0.13)]"
        style={{ background: 'rgba(22,44,26,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <nav className="flex overflow-x-auto scrollbar-hide px-5 sm:px-8">
          {tabs.map(({ id, label, badge }) => (
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
              {badge !== undefined && (
                <span className="text-[11px] bg-[#C4AF5A] text-[#0E1B11] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[18px] text-center tabular-nums">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto">
        {loading ? (
          <div
            className="text-[rgba(237,228,200,0.35)] text-sm py-20 text-center tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
          >
            Loading…
          </div>
        ) : (
          <>
            {tab === 'pipeline' && (
              <section>
                <div className="flex items-end justify-between border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
                      style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                    >
                      Client Pipeline
                    </p>
                    <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none">
                      {clients.length}
                      <span className="text-2xl font-normal text-[rgba(237,228,200,0.40)] ml-2">clients</span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowClientForm(true)}
                    className="flex items-center gap-2 px-4 rounded-sm bg-[#C4AF5A] text-[#0E1B11] text-[12px] font-bold hover:bg-[#D4BF6A] transition-colors uppercase tracking-[0.12em]"
                    style={{ minHeight: '40px', fontFamily: 'var(--font-barlow), sans-serif' }}
                  >
                    + New Client
                  </button>
                </div>
                <PipelineBoard clients={clients} />
              </section>
            )}

            {tab === 'projects' && (
              <section>
                <div className="flex items-end justify-between border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
                      style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                    >
                      Active Projects
                    </p>
                    <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none">
                      {engagements.length}
                      <span className="text-2xl font-normal text-[rgba(237,228,200,0.40)] ml-2">
                        {engagements.length === 1 ? 'project' : 'projects'}
                      </span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowProjectForm(true)}
                    className="flex items-center gap-2 px-4 rounded-sm bg-[#C4AF5A] text-[#0E1B11] text-[12px] font-bold hover:bg-[#D4BF6A] transition-colors uppercase tracking-[0.12em]"
                    style={{ minHeight: '40px', fontFamily: 'var(--font-barlow), sans-serif' }}
                  >
                    + New Project
                  </button>
                </div>
                {engagements.length === 0 ? (
                  <p className="text-base text-[rgba(237,228,200,0.40)] italic">No active projects</p>
                ) : (
                  <div className="flex flex-col gap-6">
                    {engagements.map(({ project, phases }) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        phases={phases}
                        tasks={tasks.filter(t => t.fields.Project?.includes(project.id))}
                        clientName={
                          clients.find(c => c.id === project.clientId)?.fields.Name ?? project.name
                        }
                        onPhaseUpdate={handlePhaseUpdate}
                        onProjectUpdate={handleProjectUpdate}
                        onActivatePhase={handleActivatePhase}
                        onGenerateEmail={handleGenerateEmail}
                        onRefresh={loadAll}
                        onDeletePhase={handleDeletePhase}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === 'tasks' && (
              <section>
                <div className="flex items-end justify-between border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
                      style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                    >
                      Task Board
                    </p>
                    <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none">
                      {openTaskCount}
                      <span className="text-2xl font-normal text-[rgba(237,228,200,0.40)] ml-2">open</span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-2 px-4 rounded-sm bg-[#C4AF5A] text-[#0E1B11] text-[12px] font-bold hover:bg-[#D4BF6A] transition-colors uppercase tracking-[0.12em]"
                    style={{ minHeight: '40px', fontFamily: 'var(--font-barlow), sans-serif' }}
                  >
                    + New Task
                  </button>
                </div>
                <TaskList
                    tasks={tasks}
                    onUpdate={loadAll}
                    showFilters={true}
                    engagements={engagements}
                    clients={clients}
                  />
              </section>
            )}

            {tab === 'queue' && (
              <section>
                <div className="border-b border-[rgba(196,175,90,0.12)] pb-5 mb-7">
                  <p
                    className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#C4AF5A] mb-2"
                    style={{ fontFamily: 'var(--font-barlow), sans-serif' }}
                  >
                    Email Queue
                  </p>
                  <h2 className="text-[2.25rem] font-bold text-[#EDE4C8] leading-none">
                    {pendingQueueCount > 0 ? (
                      <>
                        {pendingQueueCount}
                        <span className="text-2xl font-normal text-[rgba(237,228,200,0.40)] ml-2">pending review</span>
                      </>
                    ) : (
                      <span className="text-[rgba(237,228,200,0.40)]">All clear</span>
                    )}
                  </h2>
                </div>
                <EmailQueuePanel entries={emailQueue} onRefresh={loadAll} />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
