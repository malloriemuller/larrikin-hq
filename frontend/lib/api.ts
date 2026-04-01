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

export interface Project {
  id: string;
  fields: {
    Name: string;
    Client: string[];
    Type: ProjectType;
    Status: ProjectStatus;
    'Contract Status': string;
    'Contract Date'?: string;
    'Quoted Price'?: number;
    'Start Date'?: string;
    'Target End Date'?: string;
    'v1 Scope Notes'?: string;
    'Spec URL'?: string;
    Notes?: string;
  };
  phases?: Phase[];
  tasks?: Task[];
}

export interface Phase {
  id: string;
  fields: {
    'Phase Name': string;
    Project: string[];
    Order: number;
    Status: 'Pending' | 'Active' | 'Complete';
    'Target Date'?: string;
    'Billing Milestone': boolean;
    'Billing Amount'?: number;
  };
}

export interface Task {
  id: string;
  fields: {
    Title: string;
    Project: string[];
    Phase?: string[];
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

export const listProjects = (params?: { status?: ProjectStatus; clientId?: string }) => {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<Project[]>(`/api/projects${qs ? `?${qs}` : ''}`);
};

export const getProject = (id: string) => request<Project>(`/api/projects/${id}`);

export const updateProject = (id: string, data: Partial<Project['fields']>) =>
  request<Project>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const createPhase = (data: {
  'Phase Name': string;
  Project: string[];
  Order: number;
  Status?: 'Pending' | 'Active' | 'Complete';
  'Target Date'?: string;
  'Billing Milestone'?: boolean;
  'Billing Amount'?: number;
}) => request<Phase>('/api/phases', { method: 'POST', body: JSON.stringify(data) });

export const updatePhase = (id: string, data: Partial<Phase['fields']>) =>
  request<Phase>(`/api/phases/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

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
