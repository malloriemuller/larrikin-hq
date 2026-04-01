import * as airtable from './airtable';
import { generateEmailDraft, generateInterviewGuideWithSearch } from './claude';
import { sendEmail } from './gmail';
import { getPhaseTemplates } from '../templates/taskTemplates';
import { ProjectType, OnboardingResult, EmailType } from '../types/index';

// ─── Shared: create phases + tasks from template ──────────────────────────────

async function createPhasesAndTasks(
  projectId: string,
  projectType: ProjectType
): Promise<{ phasesCreated: string[]; tasksCreated: number }> {
  const phaseTemplates = getPhaseTemplates(projectType);
  const phasesCreated: string[] = [];
  let tasksCreated = 0;

  for (const phaseTemplate of phaseTemplates) {
    const phase = await airtable.createPhase({
      'Phase Name': phaseTemplate['Phase Name'],
      Project: [projectId],
      Order: phaseTemplate.Order,
      Status: phaseTemplate.Order === 1 ? 'Active' : 'Pending',
    });
    phasesCreated.push(phase.id);

    for (const taskTemplate of phaseTemplate.tasks) {
      await airtable.createTask({
        Title: taskTemplate.Title,
        Project: [projectId],
        Phase: [phase.id],
        Assignee: taskTemplate.Assignee,
        'Task Type': taskTemplate['Task Type'],
        Priority: taskTemplate.Priority,
        Status: 'To Do',
      });
      tasksCreated++;
    }
  }

  return { phasesCreated, tasksCreated };
}

// ─── Shared: generate + queue or auto-send email ──────────────────────────────

async function queueOrSendEmail({
  clientId,
  projectId,
  emailType,
  to,
  context,
  autoSend,
}: {
  clientId: string;
  projectId?: string;
  emailType: EmailType;
  to: string;
  context: { clientName: string; company: string; projectName?: string; projectType?: ProjectType; additionalContext?: string; intakeResponses?: string; firefliesSummary?: string; referrerName?: string };
  autoSend: boolean;
}): Promise<string> {
  const draft = await generateEmailDraft(emailType, context);

  const entry = await airtable.createEmailQueueEntry({
    Client: [clientId],
    Project: projectId ? [projectId] : undefined,
    'Email Type': emailType,
    To: to,
    Subject: draft.subject,
    Body: draft.body,
    Status: autoSend ? 'Auto-Sent' : 'Pending Review',
    'Generation Failed': draft.failed,
  });

  if (autoSend && !draft.failed) {
    try {
      await sendEmail({ to, subject: draft.subject, body: draft.body });
      await airtable.createCommunicationsLogEntry({
        Client: [clientId],
        Project: projectId ? [projectId] : undefined,
        Date: new Date().toISOString().split('T')[0],
        Type: 'Email',
        Summary: `Auto-sent: ${emailType} — ${draft.subject}`,
        Author: 'Mallorie',
      });
    } catch (sendErr) {
      console.error('[onboarding] auto-send failed — email queued for manual review', {
        emailType,
        clientId,
        error: sendErr,
      });
      // Downgrade to Pending Review so it surfaces in the queue
      await airtable.updateEmailQueueEntry(entry.id, { Status: 'Pending Review' });
      await airtable.createCommunicationsLogEntry({
        Client: [clientId],
        Project: projectId ? [projectId] : undefined,
        Date: new Date().toISOString().split('T')[0],
        Type: 'Note',
        Summary: `Auto-send failed — queued for manual review: ${emailType}`,
        Author: 'Mallorie',
      });
    }
  } else if (autoSend && draft.failed) {
    console.warn('[onboarding] draft generation failed — email queued for manual write', {
      emailType,
      clientId,
    });
  } else {
    // Queued for Mallorie's review
    await airtable.createCommunicationsLogEntry({
      Client: [clientId],
      Project: projectId ? [projectId] : undefined,
      Date: new Date().toISOString().split('T')[0],
      Type: 'Email',
      Summary: `Email queued for review: ${emailType} — ${draft.subject}`,
      Author: 'Mallorie',
    });
  }

  return entry.id;
}

// ─── Audit contract signed ────────────────────────────────────────────────────

export async function handleAuditContractSigned(
  clientEmail: string,
  envelopeId: string
): Promise<OnboardingResult> {
  // 1. Find or create client
  let client = await airtable.findClientByEmail(clientEmail);
  if (!client) {
    throw new Error(
      `[onboarding] no client record found for email ${clientEmail} (DocuSign envelope ${envelopeId})`
    );
  }

  // 2. Create project
  const project = await airtable.createProject({
    Name: `${client.fields.Company} — Audit`,
    Client: [client.id],
    Type: 'Audit',
    Status: 'In Progress',
    'Contract Status': 'Signed',
    'Contract Date': new Date().toISOString().split('T')[0],
  });

  // 3. Update client stage → Discovery
  await airtable.updateClient(client.id, { Stage: 'Discovery' });

  // 4. Create phases and tasks
  const { phasesCreated, tasksCreated } = await createPhasesAndTasks(project.id, 'Audit');

  // 5. Log onboarding event
  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Project: [project.id],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: `Audit contract signed — project created with ${phasesCreated.length} phases and ${tasksCreated} tasks. Client stage → Discovery.`,
    Author: 'Mallorie',
  });

  // 6. Auto-send welcome email
  const emailId = await queueOrSendEmail({
    clientId: client.id,
    projectId: project.id,
    emailType: 'Welcome Email',
    to: clientEmail,
    context: {
      clientName: client.fields.Name,
      company: client.fields.Company,
      projectName: project.fields.Name,
      projectType: 'Audit',
    },
    autoSend: true,
  });

  console.log('[onboarding] audit onboarding complete', {
    clientId: client.id,
    projectId: project.id,
    phasesCreated: phasesCreated.length,
    tasksCreated,
  });

  return { clientId: client.id, projectId: project.id, phasesCreated, tasksCreated, emailQueued: emailId };
}

// ─── Build contract signed ────────────────────────────────────────────────────

export async function handleBuildContractSigned(
  clientEmail: string,
  envelopeId: string
): Promise<OnboardingResult> {
  const client = await airtable.findClientByEmail(clientEmail);
  if (!client) {
    throw new Error(
      `[onboarding] no client record found for email ${clientEmail} (DocuSign envelope ${envelopeId})`
    );
  }

  // Find existing project in Proposal/Not Started state, or create one
  const existingProjects = await airtable.listProjects({ clientId: client.id });
  let project = existingProjects.find(
    (p) => p.fields.Type === 'Build' && p.fields.Status !== 'Complete'
  );

  if (project) {
    project = await airtable.updateProject(project.id, {
      Status: 'In Progress',
      'Contract Status': 'Signed',
      'Contract Date': new Date().toISOString().split('T')[0],
    });
  } else {
    project = await airtable.createProject({
      Name: `${client.fields.Company} — Build`,
      Client: [client.id],
      Type: 'Build',
      Status: 'In Progress',
      'Contract Status': 'Signed',
      'Contract Date': new Date().toISOString().split('T')[0],
    });
  }

  // Update client stage → Delivery
  await airtable.updateClient(client.id, { Stage: 'Delivery' });

  const { phasesCreated, tasksCreated } = await createPhasesAndTasks(project.id, 'Build');

  // Log onboarding event
  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Project: [project.id],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: `Build contract signed — project created with ${phasesCreated.length} phases and ${tasksCreated} tasks. Client stage → Delivery.`,
    Author: 'Mallorie',
  });

  // Auto-send build kickoff email
  const emailId = await queueOrSendEmail({
    clientId: client.id,
    projectId: project.id,
    emailType: 'Welcome Email',
    to: clientEmail,
    context: {
      clientName: client.fields.Name,
      company: client.fields.Company,
      projectName: project.fields.Name,
      projectType: 'Build',
    },
    autoSend: true,
  });

  console.log('[onboarding] build onboarding complete', {
    clientId: client.id,
    projectId: project.id,
  });

  return { clientId: client.id, projectId: project.id, phasesCreated, tasksCreated, emailQueued: emailId };
}

// ─── Retainer contract signed ─────────────────────────────────────────────────

export async function handleRetainerContractSigned(
  clientEmail: string,
  envelopeId: string
): Promise<OnboardingResult> {
  const client = await airtable.findClientByEmail(clientEmail);
  if (!client) {
    throw new Error(
      `[onboarding] no client record found for email ${clientEmail} (DocuSign envelope ${envelopeId})`
    );
  }

  const project = await airtable.createProject({
    Name: `${client.fields.Company} — Retainer`,
    Client: [client.id],
    Type: 'Retainer',
    Status: 'In Progress',
    'Contract Status': 'Signed',
    'Contract Date': new Date().toISOString().split('T')[0],
  });

  await airtable.updateClient(client.id, { Stage: 'Retainer' });

  const { phasesCreated, tasksCreated } = await createPhasesAndTasks(project.id, 'Retainer');

  // Log onboarding event
  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Project: [project.id],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: `Retainer contract signed — project created with ${phasesCreated.length} phases and ${tasksCreated} tasks. Client stage → Retainer.`,
    Author: 'Mallorie',
  });

  // Queue for Mallorie's review — not auto-sent
  const emailId = await queueOrSendEmail({
    clientId: client.id,
    projectId: project.id,
    emailType: 'Retainer Onboarding Email',
    to: clientEmail,
    context: {
      clientName: client.fields.Name,
      company: client.fields.Company,
      projectName: project.fields.Name,
      projectType: 'Retainer',
    },
    autoSend: false,
  });

  console.log('[onboarding] retainer onboarding complete', {
    clientId: client.id,
    projectId: project.id,
  });

  return { clientId: client.id, projectId: project.id, phasesCreated, tasksCreated, emailQueued: emailId };
}

// ─── Intake form submitted ────────────────────────────────────────────────────

export async function handleIntakeFormSubmitted(
  clientEmail: string,
  intakeResponses: string
): Promise<void> {
  const client = await airtable.findClientByEmail(clientEmail);
  if (!client) {
    console.error('[onboarding] intake form submitted for unknown client email', { clientEmail });
    return;
  }

  // Store intake responses in client Notes
  const existingNotes = client.fields.Notes ?? '';
  const updatedNotes = existingNotes
    ? `${existingNotes}\n\n--- Intake Form ---\n${intakeResponses}`
    : `--- Intake Form ---\n${intakeResponses}`;
  await airtable.updateClient(client.id, { Notes: updatedNotes });

  // Log intake form received
  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: 'Intake form submitted — responses saved to client notes.',
    Author: 'Mallorie',
  });

  // Generate interview guide with web search and queue for Mallorie's review
  const mallorieEmail = process.env.MALLORIE_EMAIL ?? 'hello@thelarrikin.ai';
  const guide = await generateInterviewGuideWithSearch(
    client.fields.Name,
    client.fields.Company,
    intakeResponses
  );

  const guideEntry = await airtable.createEmailQueueEntry({
    Client: [client.id],
    'Email Type': 'Interview Guide',
    To: mallorieEmail,
    Subject: guide.subject,
    Body: guide.body,
    Status: 'Pending Review',
    'Generation Failed': guide.failed,
  });

  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: `Interview guide generated (web search included) and queued for review — ${guide.subject}`,
    Author: 'Mallorie',
  });

  console.log('[onboarding] intake form processed with web research', {
    clientId: client.id,
    guideQueued: guideEntry.id,
  });
}

// ─── Fireflies session ended ──────────────────────────────────────────────────
//
// Meeting type is detected from keywords anywhere in the title (case-insensitive):
//   title contains "intro"   → Post-Intro-Call (queued for review)
//   title contains "audit"   → Post-Audit-Call (auto-sent, includes summary)
//   title contains "results" → Post-Results-Meeting (queued for review)
//   title contains "session" → Post-Interview Thank-You (queued, build sessions)
//   title contains "demo"    → Post-Demo Email (queued, build delivery)
//
// Client is matched by attendee email — the non-Mallorie attendee in the invite.
// This means Calendly event names like "Larrikin Intro Chat" work fine as-is.

export async function handleFirefliesSessionEnded(
  meetingTitle: string,
  firefliesSummary?: string,
  attendees?: Array<{ email: string; name: string }>
): Promise<void> {
  // ── Detect meeting type from title keywords ──
  type MeetingKind = 'intro' | 'audit' | 'results' | 'session' | 'demo';
  const title = meetingTitle.toLowerCase();

  let kind: MeetingKind;
  if (title.includes('intro')) {
    kind = 'intro';
  } else if (title.includes('audit')) {
    kind = 'audit';
  } else if (title.includes('results')) {
    kind = 'results';
  } else if (title.includes('demo')) {
    kind = 'demo';
  } else if (title.includes('session')) {
    kind = 'session';
  } else {
    console.error('[onboarding] Fireflies meeting title contained no recognised keyword', {
      meetingTitle,
    });
    return;
  }

  // ── Find client by attendee email ──
  // Filter out Mallorie's own email(s) and try each remaining attendee.
  const mallorieEmail = (process.env.MALLORIE_EMAIL ?? 'hello@thelarrikin.ai').toLowerCase();
  const mallorieGmail = (process.env.GMAIL_FROM_ADDRESS ?? '').toLowerCase();

  const clientAttendees = (attendees ?? []).filter(
    (a) => a.email.toLowerCase() !== mallorieEmail && a.email.toLowerCase() !== mallorieGmail
  );

  let client = null;
  for (const attendee of clientAttendees) {
    client = await airtable.findClientByEmail(attendee.email);
    if (client) break;
  }

  // Fallback: if no attendee email matched, log and bail out
  if (!client) {
    console.error('[onboarding] Fireflies: no matching client found in attendee list', {
      meetingTitle,
      attendees: clientAttendees.map((a) => a.email),
    });
    return;
  }

  const projects = await airtable.listProjects({ clientId: client.id });
  const activeProject = projects.find((p) => p.fields.Status === 'In Progress');

  // Log meeting ended
  await airtable.createCommunicationsLogEntry({
    Client: [client.id],
    Project: activeProject?.id ? [activeProject.id] : undefined,
    Date: new Date().toISOString().split('T')[0],
    Type: 'Meeting',
    Summary: `Meeting ended: ${meetingTitle}`,
    Author: 'Mallorie',
  });

  const baseContext = {
    clientName: client.fields.Name,
    company: client.fields.Company,
    projectName: activeProject?.fields.Name,
  };

  switch (kind) {
    case 'intro':
      await queueOrSendEmail({
        clientId: client.id,
        projectId: activeProject?.id,
        emailType: 'Post-Intro-Call',
        to: client.fields.Email,
        context: baseContext,
        autoSend: false,
      });
      console.log('[onboarding] Fireflies intro call — Post-Intro-Call queued', {
        meetingTitle, clientId: client.id,
      });
      break;

    case 'audit':
      // Auto-send the post-audit email — this is the "you'll hear back in 5 days" touchpoint
      await queueOrSendEmail({
        clientId: client.id,
        projectId: activeProject?.id,
        emailType: 'Post-Audit-Call',
        to: client.fields.Email,
        context: { ...baseContext, firefliesSummary },
        autoSend: true,
      });
      console.log('[onboarding] Fireflies audit call — Post-Audit-Call auto-sent', {
        meetingTitle, clientId: client.id,
      });
      break;

    case 'results':
      await queueOrSendEmail({
        clientId: client.id,
        projectId: activeProject?.id,
        emailType: 'Post-Results-Meeting',
        to: client.fields.Email,
        context: baseContext,
        autoSend: false,
      });
      console.log('[onboarding] Fireflies results meeting — Post-Results-Meeting queued', {
        meetingTitle, clientId: client.id,
      });
      break;

    case 'demo':
      await queueOrSendEmail({
        clientId: client.id,
        projectId: activeProject?.id,
        emailType: 'Post-Demo Email',
        to: client.fields.Email,
        context: baseContext,
        autoSend: false,
      });
      console.log('[onboarding] Fireflies demo meeting — Post-Demo Email queued', {
        meetingTitle, clientId: client.id,
      });
      break;

    case 'session':
      await queueOrSendEmail({
        clientId: client.id,
        projectId: activeProject?.id,
        emailType: 'Post-Interview Thank-You',
        to: client.fields.Email,
        context: baseContext,
        autoSend: false,
      });
      console.log('[onboarding] Fireflies session — Post-Interview Thank-You queued', {
        meetingTitle, clientId: client.id,
      });
      break;
  }
}

// ─── Referral outreach queued ─────────────────────────────────────────────────
// Called from the clients API when Mallorie wants to queue an outreach email
// for a newly created Lead. The email is always queued for her review — never
// auto-sent — because the referrer name should be verified before it goes out.

export async function handleReferralOutreachQueued(
  clientId: string,
  referrerName?: string
): Promise<{ emailId: string }> {
  const client = await airtable.getClient(clientId);

  const emailId = await queueOrSendEmail({
    clientId: client.id,
    emailType: 'Referral Outreach',
    to: client.fields.Email,
    context: {
      clientName: client.fields.Name,
      company: client.fields.Company,
      referrerName,
    },
    autoSend: false,
  });

  console.log('[onboarding] referral outreach queued for review', {
    clientId: client.id,
    emailId,
  });

  return { emailId };
}

// ─── Phase completed ──────────────────────────────────────────────────────────

export async function handlePhaseCompleted(
  projectId: string,
  phaseName: string
): Promise<void> {
  // When QA is marked complete, queue Post-Demo Email as a reminder
  // (primary trigger is Fireflies; this is the manual fallback)
  if (phaseName !== 'QA') return;

  const project = await airtable.getProject(projectId);
  const clientId = (project.fields.Client as string[])[0];
  if (!clientId) return;

  const client = await airtable.getClient(clientId);

  await airtable.createCommunicationsLogEntry({
    Client: [clientId],
    Project: [projectId],
    Date: new Date().toISOString().split('T')[0],
    Type: 'Note',
    Summary: 'QA phase marked complete — Post-Demo Email queued for review.',
    Author: 'Mallorie',
  });

  await queueOrSendEmail({
    clientId: client.id,
    projectId,
    emailType: 'Post-Demo Email',
    to: client.fields.Email,
    context: {
      clientName: client.fields.Name,
      company: client.fields.Company,
      projectName: project.fields.Name,
    },
    autoSend: false,
  });

  console.log('[onboarding] QA complete — Post-Demo Email queued for review', { projectId });
}
