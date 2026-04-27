import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { handleReferralOutreachQueued, activatePhaseManually, handleProposalFollowUpQueued } from '../services/onboarding';
import { generateCompanyResearchGuide } from '../services/claude';
import { sendEmail } from '../services/gmail';
import { ClientStage, CreateClientBody, UpdateClientBody } from '../types/index';

const router = Router();

// GET /api/clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const stage = req.query.stage as ClientStage | undefined;
    const clients = await airtable.listClients(stage);
    res.json(clients);
  } catch (err) {
    console.error('[clients] list error', err);
    res.status(500).json({ error: 'Failed to list clients' });
  }
});

// GET /api/clients/:id/timeline
router.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const log = await airtable.listCommunicationsLog(req.params.id);
    res.json(log);
  } catch (err) {
    console.error('[clients] timeline error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to load timeline' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await airtable.getClient(req.params.id);
    const projects = await airtable.listProjects({ clientId: req.params.id });
    res.json({ ...client, projects });
  } catch (err) {
    console.error('[clients] get error', { id: req.params.id, err });
    res.status(404).json({ error: 'Client not found' });
  }
});

// POST /api/clients
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateClientBody;
    if (!body.Name || !body.Company || !body.Email) {
      res.status(400).json({ error: 'Name, Company, and Email are required' });
      return;
    }
    const client = await airtable.createClient(body);
    res.status(201).json(client);
  } catch (err) {
    console.error('[clients] create error', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// POST /api/clients/:id/queue-outreach
// Queues a referral outreach email for Mallorie's review, then generates a
// company research guide in the background and sends it directly to Mallorie.
// Body: { referrerName?: string }
router.post('/:id/queue-outreach', async (req: Request, res: Response) => {
  try {
    const { referrerName } = req.body as { referrerName?: string };
    const client = await airtable.getClient(req.params.id);
    const result = await handleReferralOutreachQueued(req.params.id, referrerName);
    res.status(201).json({ message: 'Outreach email queued for review', emailId: result.emailId });

    // Generate company research guide in the background (web search takes 30-60s)
    const mallorieEmail = process.env.MALLORIE_EMAIL ?? 'hello@thelarrikin.ai';
    generateCompanyResearchGuide(client.fields.Name, client.fields.Company)
      .then((guide) => {
        if (!guide.body) return;
        return sendEmail({ to: mallorieEmail, subject: guide.subject, body: guide.body });
      })
      .then(() => {
        console.log('[clients] queue-outreach company research guide sent', { clientId: client.id });
      })
      .catch((err) => {
        console.error('[clients] queue-outreach guide generation failed (non-fatal)', { clientId: client.id, err });
      });
  } catch (err) {
    console.error('[clients] queue-outreach error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to queue outreach email' });
  }
});

// POST /api/clients/:id/queue-proposal-followup
// Queues a Proposal Follow-Up email for Mallorie's review. Never auto-sent.
router.post('/:id/queue-proposal-followup', async (req: Request, res: Response) => {
  try {
    const result = await handleProposalFollowUpQueued(req.params.id);
    res.status(201).json({ message: 'Proposal follow-up queued for review', emailId: result.emailId });
  } catch (err) {
    console.error('[clients] queue-proposal-followup error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to queue proposal follow-up' });
  }
});

// POST /api/clients/:id/audit-kickoff
// Activates the Audit phase for a Lead client:
//   1. Finds or creates a project for the client
//   2. Activates the Audit phase (creates phase record, tasks, advances stage, sends Welcome Email)
router.post('/:id/audit-kickoff', async (req: Request, res: Response) => {
  try {
    const client = await airtable.getClient(req.params.id);

    // Activate Audit phase — find-or-creates project, creates tasks, advances stage
    await activatePhaseManually(client.fields.Email, 'Audit');

    res.json({ success: true });
  } catch (err) {
    console.error('[clients] audit-kickoff error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to trigger audit kickoff' });
  }
});

// PATCH /api/clients/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateClientBody;
    const client = await airtable.updateClient(req.params.id, body);
    res.json(client);
  } catch (err) {
    console.error('[clients] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update client' });
  }
});

export default router;
