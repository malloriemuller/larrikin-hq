import Airtable, { FieldSet, Record as AirtableRecord, Records } from 'airtable';
import {
  AirtableClient,
  AirtableProject,
  AirtableProjectPhase,
  AirtableTask,
  AirtableEmailQueueEntry,
  AirtableCommunicationsLog,
  AirtableCredential,
  ClientStage,
  PhaseType,
  ProjectStatus,
  TaskStatus,
  TaskType,
  Assignee,
  EmailStatus,
  CreateClientBody,
  UpdateClientBody,
  CreateProjectBody,
  CreateProjectPhaseBody,
  UpdateProjectBody,
  CreateTaskBody,
  UpdateTaskBody,
  CreateCredentialBody,
  UpdateCredentialBody,
  EmailType,
} from '../types/index';

// ─── Setup ────────────────────────────────────────────────────────────────────

// Lazily initialised so the server starts without credentials — errors surface
// at request time rather than at boot, giving a clearer error message.
function base(tableName: string) {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID!)(tableName);
}

// ─── Generic Helpers ──────────────────────────────────────────────────────────

function toRecord<T extends { id: string; fields: Record<string, unknown> }>(
  raw: AirtableRecord<FieldSet>
): T {
  return { id: raw.id, fields: raw.fields } as T;
}

async function listRecords<T extends { id: string; fields: Record<string, unknown> }>(
  tableName: string,
  options: Airtable.SelectOptions<FieldSet> = {}
): Promise<T[]> {
  const records: T[] = [];
  await base(tableName)
    .select(options)
    .eachPage((page, fetchNextPage) => {
      page.forEach((record) => records.push(toRecord<T>(record)));
      fetchNextPage();
    });
  return records;
}

async function getRecord<T extends { id: string; fields: Record<string, unknown> }>(
  tableName: string,
  recordId: string
): Promise<T> {
  const record = await base(tableName).find(recordId);
  return toRecord<T>(record);
}

async function createRecord<T extends { id: string; fields: Record<string, unknown> }>(
  tableName: string,
  fields: Partial<FieldSet>
): Promise<T> {
  const record = await base(tableName).create(fields as FieldSet);
  return toRecord<T>(record);
}

async function updateRecord<T extends { id: string; fields: Record<string, unknown> }>(
  tableName: string,
  recordId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>
): Promise<T> {
  const record = await base(tableName).update(recordId, fields as FieldSet);
  return toRecord<T>(record);
}

async function deleteRecord(tableName: string, recordId: string): Promise<void> {
  await base(tableName).destroy(recordId);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listClients(stage?: ClientStage): Promise<AirtableClient[]> {
  const options: Airtable.SelectOptions<FieldSet> = {
    sort: [{ field: 'Created Date', direction: 'desc' }],
  };
  if (stage) {
    options.filterByFormula = `{Stage} = "${stage}"`;
  }
  return listRecords<AirtableClient>('Clients', options);
}

export async function getClient(id: string): Promise<AirtableClient> {
  return getRecord<AirtableClient>('Clients', id);
}

export async function findClientByEmail(email: string): Promise<AirtableClient | null> {
  const results = await listRecords<AirtableClient>('Clients', {
    filterByFormula: `LOWER({Email}) = "${email.toLowerCase()}"`,
    maxRecords: 1,
  });
  return results[0] ?? null;
}

export async function findClientByName(name: string): Promise<AirtableClient | null> {
  // Used by Fireflies webhook — match on Name or Company
  const results = await listRecords<AirtableClient>('Clients', {
    filterByFormula: `OR(
      FIND(LOWER("${name.toLowerCase()}"), LOWER({Name})),
      FIND(LOWER("${name.toLowerCase()}"), LOWER({Company}))
    )`,
    maxRecords: 1,
  });
  return results[0] ?? null;
}

export async function createClient(data: CreateClientBody): Promise<AirtableClient> {
  return createRecord<AirtableClient>('Clients', {
    ...data,
    Stage: data.Stage ?? 'Lead',
    'Created Date': new Date().toISOString().split('T')[0],
  });
}

export async function updateClient(id: string, data: UpdateClientBody): Promise<AirtableClient> {
  return updateRecord<AirtableClient>('Clients', id, data);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(filters?: {
  status?: ProjectStatus;
  clientId?: string;
}): Promise<AirtableProject[]> {
  const formulaParts: string[] = [];
  if (filters?.status) {
    formulaParts.push(`{Status} = "${filters.status}"`);
  }
  if (filters?.clientId) {
    formulaParts.push(`FIND("${filters.clientId}", ARRAYJOIN({Client}))`);
  }
  const options: Airtable.SelectOptions<FieldSet> = {};
  if (formulaParts.length > 0) {
    options.filterByFormula =
      formulaParts.length === 1 ? formulaParts[0] : `AND(${formulaParts.join(', ')})`;
  }
  return listRecords<AirtableProject>('Projects', options);
}

export async function getProject(id: string): Promise<AirtableProject> {
  return getRecord<AirtableProject>('Projects', id);
}

export async function createProject(data: CreateProjectBody): Promise<AirtableProject> {
  return createRecord<AirtableProject>('Projects', {
    'Name': data.name,
    'Client': [data.clientId],
    'Status': 'In Progress',
    'Start Date': data.startDate ?? new Date().toISOString().split('T')[0],
    ...(data.notes && { 'Notes': data.notes }),
    ...(data.scopeNotes && { 'v1 Scope Notes': data.scopeNotes }),
    ...(data.quotedPrice !== undefined && { 'Quoted Price': data.quotedPrice }),
    ...(data.targetEndDate && { 'Target End Date': data.targetEndDate }),
    ...(data.specUrl && { 'Spec URL': data.specUrl }),
  });
}

export async function updateProject(
  id: string,
  data: UpdateProjectBody
): Promise<AirtableProject> {
  return updateRecord<AirtableProject>('Projects', id, data);
}

export async function deleteProject(id: string): Promise<void> {
  return deleteRecord('Projects', id);
}

export async function deletePhase(id: string): Promise<void> {
  return deleteRecord('Project Phases', id);
}

// ─── Project Phases ───────────────────────────────────────────────────────────

export async function listPhasesByProject(projectId: string): Promise<AirtableProjectPhase[]> {
  return listRecords<AirtableProjectPhase>('Project Phases', {
    filterByFormula: `FIND("${projectId}", ARRAYJOIN({Project}))`,
    sort: [{ field: 'Order', direction: 'asc' }],
  });
}

export async function getPhase(id: string): Promise<AirtableProjectPhase> {
  return getRecord<AirtableProjectPhase>('Project Phases', id);
}

export async function createPhase(fields: {
  'Phase Name': string;
  Project: string[];
  Order: number;
  Status?: 'Pending' | 'Active' | 'Complete';
  'Target Date'?: string;
  'Billing Milestone'?: boolean;
  'Billing Amount'?: number;
}): Promise<AirtableProjectPhase> {
  return createRecord<AirtableProjectPhase>('Project Phases', {
    ...fields,
    Status: fields.Status ?? 'Pending',
    'Billing Milestone': fields['Billing Milestone'] ?? false,
  });
}

export async function createProjectPhase(data: CreateProjectPhaseBody): Promise<AirtableProjectPhase> {
  return createRecord<AirtableProjectPhase>('Project Phases', {
    'Phase Name': data.phaseName,
    'Project': [data.projectId],
    'Phase Type': data.phaseType,
    'Order': data.order,
    'Status': data.status ?? 'Pending',
    'Contract Status': data.contractStatus ?? 'Not Started',
    ...(data.contractDate && { 'Contract Date': data.contractDate }),
    ...(data.targetDate && { 'Target Date': data.targetDate }),
    ...(data.billingMilestone !== undefined && { 'Billing Milestone': data.billingMilestone }),
    ...(data.billingAmount !== undefined && { 'Billing Amount': data.billingAmount }),
  });
}

export async function updatePhase(
  id: string,
  fields: Partial<{
    'Phase Name': string;
    Status: 'Pending' | 'Active' | 'Complete';
    'Target Date': string;
    'Billing Milestone': boolean;
    'Billing Amount': number;
  }>
): Promise<AirtableProjectPhase> {
  return updateRecord<AirtableProjectPhase>('Project Phases', id, fields);
}

export async function updateProjectPhase(
  phaseId: string,
  fields: Partial<AirtableProjectPhase['fields']>
): Promise<AirtableProjectPhase> {
  return updateRecord<AirtableProjectPhase>('Project Phases', phaseId, fields);
}

export async function findActiveProjectByClientId(clientId: string): Promise<AirtableProject | null> {
  const records = await listRecords<AirtableProject>('Projects', {
    filterByFormula: `AND(FIND("${clientId}", ARRAYJOIN({Client})), OR({Status}="In Progress", {Status}="Not Started"))`,
    maxRecords: 1,
  });
  return records[0] ?? null;
}

export async function getPhasesByProjectId(projectId: string): Promise<AirtableProjectPhase[]> {
  const phases = await listRecords<AirtableProjectPhase>('Project Phases', {
    filterByFormula: `FIND("${projectId}", ARRAYJOIN({Project}))`,
  });
  return phases.sort((a, b) => a.fields['Order'] - b.fields['Order']);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function listTasks(filters?: {
  assignee?: Assignee;
  status?: TaskStatus;
  projectId?: string;
  taskType?: TaskType;
}): Promise<AirtableTask[]> {
  const formulaParts: string[] = [];
  if (filters?.assignee) {
    formulaParts.push(`{Assignee} = "${filters.assignee}"`);
  }
  if (filters?.status) {
    formulaParts.push(`{Status} = "${filters.status}"`);
  }
  if (filters?.projectId) {
    formulaParts.push(`FIND("${filters.projectId}", ARRAYJOIN({Project}))`);
  }
  if (filters?.taskType) {
    formulaParts.push(`{Task Type} = "${filters.taskType}"`);
  }
  const options: Airtable.SelectOptions<FieldSet> = {
    sort: [{ field: 'Due Date', direction: 'asc' }],
  };
  if (formulaParts.length > 0) {
    options.filterByFormula =
      formulaParts.length === 1 ? formulaParts[0] : `AND(${formulaParts.join(', ')})`;
  }
  return listRecords<AirtableTask>('Tasks', options);
}

export async function getTask(id: string): Promise<AirtableTask> {
  return getRecord<AirtableTask>('Tasks', id);
}

export async function createTask(data: CreateTaskBody): Promise<AirtableTask> {
  return createRecord<AirtableTask>('Tasks', {
    ...data,
    Status: data.Status ?? 'To Do',
    Priority: data.Priority ?? 'Medium',
  });
}

export async function updateTask(id: string, data: UpdateTaskBody): Promise<AirtableTask> {
  return updateRecord<AirtableTask>('Tasks', id, data);
}

export async function completeTask(id: string): Promise<AirtableTask> {
  return updateRecord<AirtableTask>('Tasks', id, {
    Status: 'Done',
    'Completed Date': new Date().toISOString().split('T')[0],
  });
}

// ─── Email Queue ──────────────────────────────────────────────────────────────

export async function listEmailQueue(status?: EmailStatus): Promise<AirtableEmailQueueEntry[]> {
  const options: Airtable.SelectOptions<FieldSet> = {
    sort: [{ field: 'Created Date', direction: 'desc' }],
  };
  if (status) {
    options.filterByFormula = `{Status} = "${status}"`;
  } else {
    options.filterByFormula = `{Status} = "Pending Review"`;
  }
  return listRecords<AirtableEmailQueueEntry>('Email Queue', options);
}

export async function getEmailQueueEntry(id: string): Promise<AirtableEmailQueueEntry> {
  return getRecord<AirtableEmailQueueEntry>('Email Queue', id);
}

export async function createEmailQueueEntry(fields: {
  Client: string[];
  Project?: string[];
  'Email Type': EmailType;
  To: string;
  Subject: string;
  Body: string;
  Status: EmailStatus;
  'Generation Failed': boolean;
}): Promise<AirtableEmailQueueEntry> {
  return createRecord<AirtableEmailQueueEntry>('Email Queue', {
    ...fields,
    'Created Date': new Date().toISOString().split('T')[0],
  });
}

export async function updateEmailQueueEntry(
  id: string,
  fields: Partial<{
    Subject: string;
    Body: string;
    Status: EmailStatus;
    'Sent Date': string;
  }>
): Promise<AirtableEmailQueueEntry> {
  return updateRecord<AirtableEmailQueueEntry>('Email Queue', id, fields);
}

export async function deleteEmailQueueEntry(id: string): Promise<void> {
  return deleteRecord('Email Queue', id);
}

// ─── Communications Log ───────────────────────────────────────────────────────

export async function listCommunicationsLog(clientId: string): Promise<AirtableCommunicationsLog[]> {
  return listRecords<AirtableCommunicationsLog>('Communications Log', {
    filterByFormula: `FIND("${clientId}", ARRAYJOIN({Client}))`,
    sort: [{ field: 'Date', direction: 'desc' }],
  });
}

export async function getCommunicationsLogByProjectId(projectId: string): Promise<AirtableCommunicationsLog[]> {
  // ARRAYJOIN on a linked field returns display names, not record IDs — filter in JS instead.
  const all = await listRecords<AirtableCommunicationsLog>('Communications Log', {});
  return all
    .filter(entry => (entry.fields['Project'] as string[] | undefined)?.includes(projectId) ?? false)
    .sort((a, b) => new Date(b.fields.Date).getTime() - new Date(a.fields.Date).getTime());
}

export async function createCommunicationsLogEntry(fields: {
  Client: string[];
  Project?: string[];
  Date: string;
  Type: 'Email' | 'Call' | 'Meeting' | 'Note';
  Summary: string;
  Author: Assignee;
}): Promise<AirtableCommunicationsLog> {
  return createRecord<AirtableCommunicationsLog>('Communications Log', fields);
}

// ─── Credentials ──────────────────────────────────────────────────────────────

export async function listCredentials(clientId?: string): Promise<AirtableCredential[]> {
  const options: Airtable.SelectOptions<FieldSet> = {};
  if (clientId) {
    options.filterByFormula = `FIND("${clientId}", ARRAYJOIN({Client}))`;
  }
  return listRecords<AirtableCredential>('Credentials', options);
}

export async function getCredential(id: string): Promise<AirtableCredential> {
  return getRecord<AirtableCredential>('Credentials', id);
}

export async function createCredential(data: CreateCredentialBody): Promise<AirtableCredential> {
  return createRecord<AirtableCredential>('Credentials', {
    ...data,
    Active: data.Active ?? true,
    'Date Added': new Date().toISOString().split('T')[0],
  });
}

export async function updateCredential(
  id: string,
  data: UpdateCredentialBody
): Promise<AirtableCredential> {
  return updateRecord<AirtableCredential>('Credentials', id, data);
}
