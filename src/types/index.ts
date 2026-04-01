// ─── Enums ───────────────────────────────────────────────────────────────────

export type ClientStage =
  | 'Lead'
  | 'Discovery'
  | 'Proposal'
  | 'Delivery'
  | 'Retainer'
  | 'Archived';

export type ProjectType = 'Audit' | 'Build' | 'Retainer';

export type ProjectStatus = 'Not Started' | 'In Progress' | 'Complete' | 'On Hold';

export type ContractStatus = 'Not Required' | 'Pending' | 'Signed';

export type PhaseStatus = 'Pending' | 'Active' | 'Complete';

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type TaskType = 'Onboarding' | 'Build' | 'Maintenance' | 'QA' | 'Admin';

export type Assignee = 'Mallorie' | 'Andy';

export type EmailType =
  | 'Welcome Email'
  | 'Interview Guide'
  | 'Post-Interview Thank-You'
  | 'Pre-Meeting Preview'
  | 'Proposal Follow-Up'
  | 'Milestone Notification'
  | 'Post-Demo Email'
  | 'Retainer Onboarding Email'
  | 'Referral Outreach'
  | 'Post-Intro-Call'
  | 'Post-Audit-Call'
  | 'Post-Results-Meeting';

export type EmailStatus = 'Pending Review' | 'Approved' | 'Sent' | 'Auto-Sent';

export type CommsType = 'Email' | 'Call' | 'Meeting' | 'Note';

export type AccessType = 'Admin' | 'Editor' | 'View Only' | 'API Key';

// ─── Airtable Record Types ────────────────────────────────────────────────────
// These mirror the Airtable field structure exactly.
// Linked record fields are arrays of Airtable record IDs (string[]).

export interface AirtableClient {
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
}

export interface AirtableProject {
  id: string;
  fields: {
    Name: string;
    Client: string[]; // linked record IDs
    Type: ProjectType;
    Status: ProjectStatus;
    'Contract Status': ContractStatus;
    'Contract Date'?: string;
    'Quoted Price'?: number;
    'Start Date'?: string;
    'Target End Date'?: string;
    'v1 Scope Notes'?: string;
    'Spec URL'?: string;
    Notes?: string;
  };
}

export interface AirtableProjectPhase {
  id: string;
  fields: {
    'Phase Name': string;
    Project: string[]; // linked record IDs
    Order: number;
    Status: PhaseStatus;
    'Target Date'?: string;
    'Billing Milestone': boolean;
    'Billing Amount'?: number;
  };
}

export interface AirtableTask {
  id: string;
  fields: {
    Title: string;
    Project: string[]; // linked record IDs
    Phase?: string[]; // linked record IDs (optional)
    Description?: string;
    Assignee: Assignee;
    'Task Type': TaskType;
    Status: TaskStatus;
    Priority: TaskPriority;
    'Due Date'?: string;
    'Completed Date'?: string;
  };
}

export interface AirtableEmailQueueEntry {
  id: string;
  fields: {
    Client: string[]; // linked record IDs
    Project?: string[]; // linked record IDs (optional)
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

export interface AirtableCommunicationsLog {
  id: string;
  fields: {
    Client: string[]; // linked record IDs
    Project?: string[]; // linked record IDs (optional)
    Date: string;
    Type: CommsType;
    Summary: string;
    Author: Assignee;
  };
}

export interface AirtableCredential {
  id: string;
  fields: {
    Client: string[]; // linked record IDs
    'Tool Name': string;
    'Username / Login': string;
    'Access Type': AccessType;
    Notes?: string;
    'Date Added'?: string;
    Active: boolean;
  };
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface CreateClientBody {
  Name: string;
  Company: string;
  Email: string;
  Phone?: string;
  Stage?: ClientStage;
  Source?: string;
  Notes?: string;
}

export interface UpdateClientBody {
  Name?: string;
  Company?: string;
  Email?: string;
  Phone?: string;
  Stage?: ClientStage;
  Source?: string;
  Notes?: string;
}

export interface CreateProjectBody {
  Name: string;
  Client: string[]; // Airtable record ID(s)
  Type: ProjectType;
  Status?: ProjectStatus;
  'Contract Status'?: ContractStatus;
  'Contract Date'?: string;
  'Quoted Price'?: number;
  'Start Date'?: string;
  'Target End Date'?: string;
  'v1 Scope Notes'?: string;
  Notes?: string;
}

export interface UpdateProjectBody {
  Name?: string;
  Status?: ProjectStatus;
  'Contract Status'?: ContractStatus;
  'Contract Date'?: string;
  'Quoted Price'?: number;
  'Start Date'?: string;
  'Target End Date'?: string;
  'v1 Scope Notes'?: string;
  'Spec URL'?: string;
  Notes?: string;
}

export interface CreateTaskBody {
  Title: string;
  Project: string[]; // Airtable record ID(s)
  Phase?: string[]; // Airtable record ID(s)
  Description?: string;
  Assignee: Assignee;
  'Task Type': TaskType;
  Status?: TaskStatus;
  Priority?: TaskPriority;
  'Due Date'?: string;
}

export interface UpdateTaskBody {
  Title?: string;
  Description?: string;
  Assignee?: Assignee;
  'Task Type'?: TaskType;
  Status?: TaskStatus;
  Priority?: TaskPriority;
  'Due Date'?: string;
  'Completed Date'?: string;
  Phase?: string[];
}

export interface UpdateEmailQueueBody {
  Subject?: string;
  Body?: string;
  Status?: EmailStatus;
}

export interface CreateCredentialBody {
  Client: string[];
  'Tool Name': string;
  'Username / Login': string;
  'Access Type': AccessType;
  Notes?: string;
  Active?: boolean;
}

export interface UpdateCredentialBody {
  'Tool Name'?: string;
  'Username / Login'?: string;
  'Access Type'?: AccessType;
  Notes?: string;
  Active?: boolean;
}

// ─── Webhook Payload Types ────────────────────────────────────────────────────

export interface DocuSignWebhookPayload {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: number;
  generatedDateTime: string;
  data: {
    accountId: string;
    envelopeId: string;
    envelopeSummary: {
      status: string;
      emailSubject: string;
      sender: { userName: string; email: string };
      recipients: {
        signers: Array<{
          email: string;
          name: string;
          status: string;
        }>;
      };
      customFields?: {
        textCustomFields?: Array<{
          name: string;
          value: string;
        }>;
      };
    };
  };
}

export interface TallyWebhookPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: {
    responseId: string;
    submittedAt: string;
    fields: Array<{
      key: string;
      label: string;
      type: string;
      value: string | string[] | null;
    }>;
  };
}

export interface FirefliesWebhookPayload {
  meetingId: string;
  title: string;
  date: string;
  duration: number;
  summary?: string;
  transcript?: string;
  attendees?: Array<{ email: string; name: string }>;
}

// ─── Internal Service Types ───────────────────────────────────────────────────

export interface EmailDraftContext {
  clientName: string;
  company: string;
  projectName?: string;
  projectType?: ProjectType;
  additionalContext?: string;
  intakeResponses?: string;
  firefliesSummary?: string;
  referrerName?: string;
}

export interface OnboardingResult {
  clientId: string;
  projectId: string;
  phasesCreated: string[];
  tasksCreated: number;
  emailQueued?: string;
}
