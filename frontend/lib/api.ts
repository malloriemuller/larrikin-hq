// Requests use relative paths so Next.js rewrites proxy them to the backend.
// No CORS required — the browser always talks to the same origin.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Types (mirrors backend) ──────────────────────────────────────────────────

export type ClientStage = 'Lead' | 'Discovery' | 'Proposal' | 'Delivery' | 'Retainer' | 'Archived';
export type ProjectType = 'Audit' | 'Build' | 'Retainer';
export type PhaseType = 'Audit' | 'Build' | 'Retainer';
export type ProjectStatus = 'Not Started' | 'In Progress' | 'Complete' | 'On Hold';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked';
export type TaskType = 'Onboarding' | 'Build' | 'Maintenance' | 'QA' | 'Admin';
export type Assignee = 'Mallorie' | 'Andy';
export type EmailStatus = 'Pending Review' | 'Approved' | 'Sent' | 'Auto-Sent';
export type EmailType =
  | 'Welcome Email'
  | 'Interview Guide'
  | 'Post-Interview Thank-You'
  | 'Pre-Meeting Preview'
  | 'Proposal Follow-Up'
  | 'Milestone Notification'
  | 'Post-Demo Email'
  | 'Retainer Onboarding Email';

export interface Client {
  id: string;
  fields: {
    Name: string;
    Company: string;
    Email: string;
    Phone?: string;
    Stage: ClientStage;
    Source?: string;
    Notes?: string;
    'Created Date'?: string;
  };
  projects?: Project[];
}

export type Project = {
  id: string;
  name: string;
  clientId: string;
  status: 'Not Started' | 'In Progress' | 'Complete' | 'On Hold';
  contractDate?: string;
  quotedPrice?: number;
  startDate?: string;
  targetEndDate?: string;
  notes?: string;
  scopeNotes?: string;
  specUrl?: string;
  phases?: string[];
  tasks?: string[];
};

export type ProjectPhase = {
  id: string;
  phaseName: string;
  phaseType: 'Audit' | 'Build' | 'Retainer';
  order: number;
  status: 'Pending' | 'Active' | 'Complete';
  contractStatus: 'Not Started' | 'Sent' | 'Signed';
  contractDate?: string;
  targetDate?: string;
  billingMilestone?: boolean;
  billingAmount?: number;
  tasks?: string[];
};

export type EngagementOverview = {
  project: Project;
  phases: ProjectPhase[];
};

export interface Task {
  id: string;
  fields: {
    Title: string;
    Project: string[];
    Phase?: string[];
    'Phase Group'?: string;
    Description?: string;
    Assignee: Assignee;
    'Task Type': TaskType;
    Status: TaskStatus;
    Priority: 'High' | 'Medium' | 'Low';
    'Due Date'?: string;
    'Completed Date'?: string;
  };
}

export interface EmailQueueEntry {
  id: string;
  fields: {
    Client: string[];
    Project?: string[];
    'Email Type': EmailType;
    To: string;
    Subject: string;
    Body: string;
    Status: EmailStatus;
    'Generation Failed': boolean;
    'Created Date'?: string;
    'Sent Date'?: string;
  };
}

export type CommsType = 'Email' | 'Call' | 'Meeting' | 'Note';

export interface CommunicationsLogEntry {
  id: string;
  fields: {
    Client: string[];
    Project?: string[];
    Date: string;
    Type: CommsType;
    Summary: string;
    Author: Assignee;
  };
}

export type CommsLogEntry = {
  id: string;
  date: string;
  type: 'Email' | 'Meeting' | 'Note' | 'Call';
  summary: string;
  author: string;
};

// ─── Transform helpers ────────────────────────────────────────────────────────
// The backend returns raw Airtable records with nested `fields` objects.
// These functions flatten them into the frontend types.

type RawRecord = { id: string; fields: Record<string, unknown> };

function toProject(raw: RawRecord): Project {
  const f = raw.fields;
  return {
    id: raw.id,
    name: f['Name'] as string,
    clientId: ((f['Client'] as string[]) ?? [])[0] ?? '',
    status: f['Status'] as Project['status'],
    contractDate: f['Contract Date'] as string | undefined,
    quotedPrice: f['Quoted Price'] as number | undefined,
    startDate: f['Start Date'] as string | undefined,
    targetEndDate: f['Target End Date'] as string | undefined,
    notes: f['Notes'] as string | undefined,
    scopeNotes: f['v1 Scope Notes'] as string | undefined,
    specUrl: f['Spec URL'] as string | undefined,
    phases: f['Project Phases'] as string[] | undefined,
    tasks: f['Tasks'] as string[] | undefined,
  };
}

function toProjectPhase(raw: RawRecord): ProjectPhase {
  const f = raw.fields;
  return {
    id: raw.id,
    phaseName: f['Phase Name'] as string,
    phaseType: f['Phase Type'] as ProjectPhase['phaseType'],
    order: f['Order'] as number,
    status: f['Status'] as ProjectPhase['status'],
    contractStatus: f['Contract Status'] as ProjectPhase['contractStatus'],
    contractDate: f['Contract Date'] as string | undefined,
    targetDate: f['Target Date'] as string | undefined,
    billingMilestone: f['Billing Milestone'] as boolean | undefined,
    billingAmount: f['Billing Amount'] as number | undefined,
    tasks: f['Tasks'] as string[] | undefined,
  };
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export const listClients = (stage?: ClientStage) =>
  request<Client[]>(`/api/clients${stage ? `?stage=${stage}` : ''}`);

export const createClient = (data: {
  Name: string;
  Company: string;
  Email: string;
  Phone?: string;
  Stage?: ClientStage;
  Source?: string;
}) => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) });

export const getClient = (id: string) => request<Client & { projects?: Project[] }>(`/api/clients/${id}`);

export const getClientTimeline = (id: string) =>
  request<CommunicationsLogEntry[]>(`/api/clients/${id}/timeline`);

export const updateClient = (id: string, data: Partial<Client['fields']>) =>
  request<Client>(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(params?: { status?: ProjectStatus; clientId?: string }): Promise<Project[]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const raw = await request<RawRecord[]>(`/api/projects${qs ? `?${qs}` : ''}`);
  return raw.map(toProject);
}

export async function getProject(id: string): Promise<Project> {
  const raw = await request<RawRecord>(`/api/projects/${id}`);
  return toProject(raw);
}

export async function createProject(data: {
  name: string;
  clientId: string;
  notes?: string;
  scopeNotes?: string;
  quotedPrice?: number;
  startDate?: string;
  targetEndDate?: string;
  specUrl?: string;
}): Promise<Project> {
  const raw = await request<RawRecord>('/api/projects', { method: 'POST', body: JSON.stringify(data) });
  return toProject(raw);
}

export async function updateProject(projectId: string, fields: Partial<Project>): Promise<Project> {
  const body: Record<string, unknown> = {};
  if (fields.name !== undefined) body['Name'] = fields.name;
  if (fields.status !== undefined) body['Status'] = fields.status;
  if (fields.quotedPrice !== undefined) body['Quoted Price'] = fields.quotedPrice;
  if (fields.startDate !== undefined) body['Start Date'] = fields.startDate;
  if (fields.targetEndDate !== undefined) body['Target End Date'] = fields.targetEndDate;
  if (fields.notes !== undefined) body['Notes'] = fields.notes;
  if (fields.scopeNotes !== undefined) body['v1 Scope Notes'] = fields.scopeNotes;
  if (fields.specUrl !== undefined) body['Spec URL'] = fields.specUrl;
  const raw = await request<RawRecord>(`/api/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(body) });
  return toProject(raw);
}

export async function getEngagement(projectId: string): Promise<EngagementOverview> {
  const raw = await request<{ project: RawRecord; phases: RawRecord[] }>(`/api/projects/${projectId}/engagement`);
  return {
    project: toProject(raw.project),
    phases: raw.phases.map(toProjectPhase),
  };
}

export async function activatePhase(
  projectId: string,
  phaseType: 'Audit' | 'Build' | 'Retainer'
): Promise<void> {
  return request(`/api/projects/${projectId}/activate-phase`, {
    method: 'POST',
    body: JSON.stringify({ phaseType }),
  });
}

export async function deletePhase(phaseId: string): Promise<void> {
  return request(`/api/phases/${phaseId}`, { method: 'DELETE' });
}

export async function updateProjectPhase(phaseId: string, fields: Partial<ProjectPhase>): Promise<ProjectPhase> {
  const body: Record<string, unknown> = {};
  if (fields.status !== undefined) body['Status'] = fields.status;
  if (fields.phaseName !== undefined) body['Phase Name'] = fields.phaseName;
  if (fields.targetDate !== undefined) body['Target Date'] = fields.targetDate;
  if (fields.billingMilestone !== undefined) body['Billing Milestone'] = fields.billingMilestone;
  if (fields.billingAmount !== undefined) body['Billing Amount'] = fields.billingAmount;
  if (fields.contractStatus !== undefined) body['Contract Status'] = fields.contractStatus;
  if (fields.contractDate !== undefined) body['Contract Date'] = fields.contractDate;
  const raw = await request<RawRecord>(`/api/phases/${phaseId}`, { method: 'PATCH', body: JSON.stringify(body) });
  return toProjectPhase(raw);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const listTasks = (params?: {
  assignee?: Assignee;
  status?: TaskStatus;
  projectId?: string;
  taskType?: TaskType;
}) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
};

export const createTask = (data: {
  Title: string;
  Project: string[];
  Phase?: string[];
  Description?: string;
  Assignee: Assignee;
  'Task Type': TaskType;
  Status?: TaskStatus;
  Priority?: 'High' | 'Medium' | 'Low';
  'Due Date'?: string;
}) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });

export const updateTask = (id: string, data: Partial<Task['fields']>) =>
  request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const completeTask = (id: string) =>
  request<Task>(`/api/tasks/${id}/complete`, { method: 'POST' });

// ─── Email Queue ──────────────────────────────────────────────────────────────

export const listEmailQueue = (status?: EmailStatus) =>
  request<EmailQueueEntry[]>(`/api/email-queue${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const updateEmailQueueEntry = (id: string, data: { Subject?: string; Body?: string }) =>
  request<EmailQueueEntry>(`/api/email-queue/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const sendEmail = (id: string) =>
  request<EmailQueueEntry>(`/api/email-queue/${id}/send`, { method: 'POST' });

export const discardEmail = (id: string) =>
  request<{ success: boolean }>(`/api/email-queue/${id}/discard`, { method: 'POST' });

export const generateEmailDraft = (projectId: string, emailType: EmailType) =>
  request<EmailQueueEntry>(`/api/email-queue/generate`, {
    method: 'POST',
    body: JSON.stringify({ projectId, emailType }),
  });

// ─── Communications Log ───────────────────────────────────────────────────────

function toCommsLogEntry(raw: RawRecord): CommsLogEntry {
  const f = raw.fields;
  return {
    id: raw.id,
    date: f['Date'] as string,
    type: f['Type'] as CommsLogEntry['type'],
    summary: f['Summary'] as string,
    author: f['Author'] as string,
  };
}

export async function getProjectCommsLog(projectId: string): Promise<CommsLogEntry[]> {
  const raw = await request<RawRecord[]>(`/api/projects/${projectId}/communications-log`);
  return raw.map(toCommsLogEntry);
}
