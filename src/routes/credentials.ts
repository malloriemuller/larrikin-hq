import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { CreateCredentialBody, UpdateCredentialBody } from '../types/index';

const router = Router();

// GET /api/credentials
router.get('/', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string | undefined;
    const credentials = await airtable.listCredentials(clientId);
    res.json(credentials);
  } catch (err) {
    console.error('[credentials] list error', err);
    res.status(500).json({ error: 'Failed to list credentials' });
  }
});

// GET /api/credentials/client/:clientId
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const credentials = await airtable.listCredentials(req.params.clientId);
    res.json(credentials);
  } catch (err) {
    console.error('[credentials] list by client error', { clientId: req.params.clientId, err });
    res.status(500).json({ error: 'Failed to list credentials for client' });
  }
});

// POST /api/credentials
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateCredentialBody;
    if (!body.Client || !body['Tool Name'] || !body['Username / Login'] || !body['Access Type']) {
      res.status(400).json({
        error: 'Client, Tool Name, Username / Login, and Access Type are required',
      });
      return;
    }
    const credential = await airtable.createCredential(body);
    res.status(201).json(credential);
  } catch (err) {
    console.error('[credentials] create error', err);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// PATCH /api/credentials/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateCredentialBody;
    const credential = await airtable.updateCredential(req.params.id, body);
    res.json(credential);
  } catch (err) {
    console.error('[credentials] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update credential' });
  }
});

export default router;
