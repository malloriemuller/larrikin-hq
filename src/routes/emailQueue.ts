import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { sendEmail } from '../services/gmail';
import { generateEmailDraft } from '../services/claude';
import { EmailStatus, EmailType, UpdateEmailQueueBody } from '../types/index';

const router = Router();

// GET /api/email-queue
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as EmailStatus | undefined;
    const entries = await airtable.listEmailQueue(status);
    res.json(entries);
  } catch (err) {
    console.error('[email-queue] list error', err);
    res.status(500).json({ error: 'Failed to list email queue' });
  }
});

// GET /api/email-queue/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const entry = await airtable.getEmailQueueEntry(req.params.id);
    res.json(entry);
  } catch (err) {
    console.error('[email-queue] get error', { id: req.params.id, err });
    res.status(404).json({ error: 'Email queue entry not found' });
  }
});

// PATCH /api/email-queue/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateEmailQueueBody;
    const entry = await airtable.updateEmailQueueEntry(req.params.id, {
      Subject: body.Subject,
      Body: body.Body,
      Status: body.Status,
    });
    res.json(entry);
  } catch (err) {
    console.error('[email-queue] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update email queue entry' });
  }
});

// POST /api/email-queue/:id/send
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const entry = await airtable.getEmailQueueEntry(req.params.id);

    if (entry.fields.Status === 'Sent' || entry.fields.Status === 'Auto-Sent') {
      res.status(400).json({ error: 'Email has already been sent' });
      return;
    }

    await sendEmail({
      to: entry.fields.To,
      subject: entry.fields.Subject,
      body: entry.fields.Body,
    });

    const updated = await airtable.updateEmailQueueEntry(req.params.id, {
      Status: 'Sent',
      'Sent Date': new Date().toISOString().split('T')[0],
    });

    // Log to communications log
    const clientId = entry.fields.Client[0];
    if (clientId) {
      await airtable.createCommunicationsLogEntry({
        Client: [clientId],
        Project: entry.fields.Project,
        Date: new Date().toISOString().split('T')[0],
        Type: 'Email',
        Summary: `Sent: ${entry.fields['Email Type']} — ${entry.fields.Subject}`,
        Author: 'Mallorie',
      });
    }

    res.json(updated);
  } catch (err) {
    console.error('[email-queue] send error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/email-queue/generate
// Manually trigger a Claude draft for a project — queues for Mallorie's review
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { projectId, emailType } = req.body as { projectId: string; emailType: EmailType };

    if (!projectId || !emailType) {
      res.status(400).json({ error: 'projectId and emailType are required' });
      return;
    }

    const project = await airtable.getProject(projectId);
    const clientId = project.fields.Client[0];
    if (!clientId) {
      res.status(400).json({ error: 'Project has no linked client' });
      return;
    }

    const client = await airtable.getClient(clientId);

    const draft = await generateEmailDraft(emailType, {
      clientName: client.fields.Name,
      company: client.fields.Company,
      projectName: project.fields.Name,
    });

    const entry = await airtable.createEmailQueueEntry({
      Client: [clientId],
      Project: [projectId],
      'Email Type': emailType,
      To: client.fields.Email,
      Subject: draft.subject,
      Body: draft.body,
      Status: 'Pending Review',
      'Generation Failed': draft.failed,
    });

    console.log('[email-queue] manual draft generated', {
      emailType,
      projectId,
      clientId,
      failed: draft.failed,
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('[email-queue] generate error', { body: req.body, err });
    res.status(500).json({ error: 'Failed to generate email draft' });
  }
});

// POST /api/email-queue/:id/discard
router.post('/:id/discard', async (req: Request, res: Response) => {
  try {
    await airtable.deleteEmailQueueEntry(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[email-queue] discard error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to discard email queue entry' });
  }
});

export default router;
