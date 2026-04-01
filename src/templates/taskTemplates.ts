import { ProjectType, TaskType, Assignee } from '../types/index';

export interface TaskTemplate {
  Title: string;
  Assignee: Assignee;
  'Task Type': TaskType;
  Priority: 'High' | 'Medium' | 'Low';
  phaseName: string;
}

export interface PhaseTemplate {
  'Phase Name': string;
  Order: number;
  tasks: TaskTemplate[];
}

// ─── Audit: Discovery + Proposal phases ──────────────────────────────────────

const AUDIT_PHASES: PhaseTemplate[] = [
  {
    'Phase Name': 'Discovery',
    Order: 1,
    tasks: [
      { Title: 'Send pre-consultation intake form', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Conduct consultation call', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Send audit proposal', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Confirm contract signed + payment received', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Schedule audit interviews', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'Medium', phaseName: 'Discovery' },
      { Title: 'Conduct Session 1', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Conduct Session 2', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Discovery' },
      { Title: 'Collect client tool access + credentials', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'Medium', phaseName: 'Discovery' },
    ],
  },
  {
    'Phase Name': 'Proposal',
    Order: 2,
    tasks: [
      { Title: 'Process Fireflies transcripts', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Proposal' },
      { Title: 'Complete audit document', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Proposal' },
      { Title: 'Build ROI model', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Proposal' },
      { Title: 'Andy internal review', Assignee: 'Andy', 'Task Type': 'QA', Priority: 'Medium', phaseName: 'Proposal' },
      { Title: 'Schedule results meeting', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'Medium', phaseName: 'Proposal' },
      { Title: 'Conduct results meeting', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Proposal' },
      { Title: 'Send proposal + contract', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'High', phaseName: 'Proposal' },
    ],
  },
];

// ─── Build: Onboarding → Build → QA → Launch ─────────────────────────────────

const BUILD_PHASES: PhaseTemplate[] = [
  {
    'Phase Name': 'Onboarding',
    Order: 1,
    tasks: [
      { Title: 'Define v1 build scope in writing', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Onboarding' },
      { Title: 'Add spec doc URL to project', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Onboarding' },
      { Title: 'Set milestone schedule', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Onboarding' },
      { Title: 'Collect client tool access + credentials', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'High', phaseName: 'Onboarding' },
      { Title: 'Send build kickoff email', Assignee: 'Mallorie', 'Task Type': 'Onboarding', Priority: 'High', phaseName: 'Onboarding' },
    ],
  },
  {
    'Phase Name': 'Build',
    Order: 2,
    tasks: [
      { Title: 'Build v1', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'High', phaseName: 'Build' },
      { Title: 'Mid-build async Loom check-in', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'Medium', phaseName: 'Build' },
    ],
  },
  {
    'Phase Name': 'QA',
    Order: 3,
    tasks: [
      { Title: 'Andy internal QA', Assignee: 'Andy', 'Task Type': 'QA', Priority: 'High', phaseName: 'QA' },
      { Title: 'Create user guide', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'Medium', phaseName: 'QA' },
      { Title: 'Create Loom walkthrough', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'Medium', phaseName: 'QA' },
    ],
  },
  {
    'Phase Name': 'Launch',
    Order: 4,
    tasks: [
      { Title: 'Schedule demo meeting', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'High', phaseName: 'Launch' },
      { Title: 'Conduct demo meeting', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'High', phaseName: 'Launch' },
      { Title: 'Send post-demo email', Assignee: 'Mallorie', 'Task Type': 'Build', Priority: 'High', phaseName: 'Launch' },
    ],
  },
];

// ─── Retainer: Retainer phase ─────────────────────────────────────────────────

const RETAINER_PHASES: PhaseTemplate[] = [
  {
    'Phase Name': 'Retainer',
    Order: 1,
    tasks: [
      { Title: 'Retainer contract signed', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'High', phaseName: 'Retainer' },
      { Title: 'Set up request intake', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'High', phaseName: 'Retainer' },
      { Title: 'Schedule 30-day referral ask task', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'Medium', phaseName: 'Retainer' },
      { Title: 'Schedule 90-day case study request task', Assignee: 'Mallorie', 'Task Type': 'Admin', Priority: 'Medium', phaseName: 'Retainer' },
    ],
  },
];

// ─── Export ───────────────────────────────────────────────────────────────────

export function getPhaseTemplates(projectType: ProjectType): PhaseTemplate[] {
  switch (projectType) {
    case 'Audit':
      return AUDIT_PHASES;
    case 'Build':
      return BUILD_PHASES;
    case 'Retainer':
      return RETAINER_PHASES;
    default:
      throw new Error(`Unknown project type: ${projectType}`);
  }
}
