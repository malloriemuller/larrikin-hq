import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { handleReferralOutreachQueued } from '../services/onboarding';
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
// Queues a referral outreach email for Mallorie's review.
// Body: { referrerName?: string }
router.post('/:id/queue-outreach', async (req: Request, res: Response) => {
  try {
    const { referrerName } = req.body as { referrerName?: string };
    const result = await handleReferralOutreachQueued(req.params.id, referrerName);
    res.status(201).json({ message: 'Outreach email queued for review', emailId: result.emailId });
  } catch (err) {
    console.error('[clients] queue-outreach error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to queue outreach email' });
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
