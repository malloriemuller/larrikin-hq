'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
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
            Mallorie · HQ
          </span>
        </div>
        <Link
          href="/andy"
          className="text-[12px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
          style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-inter), sans-serif' }}
        >
          Andy →
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
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex-none flex items-center gap-2 px-4 whitespace-nowrap transition-all duration-150 border-b-2 text-[12px] font-semibold tracking-[0.16em] uppercase`}
              style={{
                minHeight: '48px',
                fontFamily: 'var(--font-inter), sans-serif',
                color: tab === id ? 'var(--foreground)' : 'var(--muted-foreground)',
                borderBottomColor: tab === id ? 'var(--ember)' : 'transparent',
              }}
            >
              {label}
              {badge !== undefined && (
                <span
                  className="text-[11px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[18px] text-center tabular-nums"
                  style={{ backgroundColor: 'var(--ember)', color: 'var(--background)' }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
          <Link
            href="/tools/workflow-mapper"
            className="relative flex-none flex items-center px-4 whitespace-nowrap transition-all duration-150 border-b-2 border-b-transparent text-[12px] font-semibold tracking-[0.16em] uppercase hover:opacity-80"
            style={{ minHeight: '48px', fontFamily: 'var(--font-inter), sans-serif', color: 'var(--muted-foreground)' }}
          >
            Tools
          </Link>
        </nav>
      </div>

      {/* Content */}
      <main className="px-5 py-8 sm:px-8 sm:py-10 max-w-4xl mx-auto">
        {loading ? (
          <div
            className="text-sm py-20 text-center tracking-widest uppercase"
            style={{ color: 'var(--faint)', fontFamily: 'var(--font-inter), sans-serif' }}
          >
            Loading…
          </div>
        ) : (
          <>
            {tab === 'pipeline' && (
              <section>
                <div className="flex items-end justify-between pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
                      style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      Client Pipeline
                    </p>
                    <h2 className="text-[2.25rem] font-bold leading-none" style={{ color: 'var(--foreground)' }}>
                      {clients.length}
                      <span className="text-2xl font-normal ml-2" style={{ color: 'var(--muted-foreground)' }}>clients</span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowClientForm(true)}
                    className="flex items-center gap-2 px-5 text-[12px] font-bold transition-opacity hover:opacity-90 uppercase tracking-[0.12em]"
                    style={{
                      minHeight: '40px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      backgroundColor: 'var(--ink)',
                      color: 'var(--background)',
                      borderRadius: '9999px',
                    }}
                  >
                    + New Client
                  </button>
                </div>
                <PipelineBoard
                  clients={clients}
                  onOutreachQueued={() => { loadAll(); setTab('queue'); }}
                  onAuditKickoffComplete={() => loadAll()}
                  onStageMoved={() => loadAll()}
                  onProposalFollowUpQueued={() => { loadAll(); setTab('queue'); }}
                />
              </section>
            )}

            {tab === 'projects' && (
              <section>
                <div className="flex items-end justify-between pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
                      style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      Active Projects
                    </p>
                    <h2 className="text-[2.25rem] font-bold leading-none" style={{ color: 'var(--foreground)' }}>
                      {engagements.length}
                      <span className="text-2xl font-normal ml-2" style={{ color: 'var(--muted-foreground)' }}>
                        {engagements.length === 1 ? 'project' : 'projects'}
                      </span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowProjectForm(true)}
                    className="flex items-center gap-2 px-5 text-[12px] font-bold transition-opacity hover:opacity-90 uppercase tracking-[0.12em]"
                    style={{
                      minHeight: '40px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      backgroundColor: 'var(--ink)',
                      color: 'var(--background)',
                      borderRadius: '9999px',
                    }}
                  >
                    + New Project
                  </button>
                </div>
                {engagements.length === 0 ? (
                  <p className="text-base italic" style={{ color: 'var(--muted-foreground)' }}>No active projects</p>
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
                <div className="flex items-end justify-between pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p
                      className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
                      style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                    >
                      Task Board
                    </p>
                    <h2 className="text-[2.25rem] font-bold leading-none" style={{ color: 'var(--foreground)' }}>
                      {openTaskCount}
                      <span className="text-2xl font-normal ml-2" style={{ color: 'var(--muted-foreground)' }}>open</span>
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="flex items-center gap-2 px-5 text-[12px] font-bold transition-opacity hover:opacity-90 uppercase tracking-[0.12em]"
                    style={{
                      minHeight: '40px',
                      fontFamily: 'var(--font-inter), sans-serif',
                      backgroundColor: 'var(--ink)',
                      color: 'var(--background)',
                      borderRadius: '9999px',
                    }}
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
                <div className="pb-5 mb-7" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p
                    className="text-[12px] font-semibold tracking-[0.22em] uppercase mb-2"
                    style={{ color: 'var(--ember)', fontFamily: 'var(--font-inter), sans-serif' }}
                  >
                    Email Queue
                  </p>
                  <h2 className="text-[2.25rem] font-bold leading-none" style={{ color: 'var(--foreground)' }}>
                    {pendingQueueCount > 0 ? (
                      <>
                        {pendingQueueCount}
                        <span className="text-2xl font-normal ml-2" style={{ color: 'var(--muted-foreground)' }}>pending review</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--muted-foreground)' }}>All clear</span>
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
