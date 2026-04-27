import { Router, Request, Response } from 'express';
import { generateWorkflowMap } from '../services/claude';

const router = Router();

router.post('/workflow-mapper', async (req: Request, res: Response) => {
  const { notes, hourlyRate } = req.body as { notes?: string; hourlyRate?: number };
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    res.status(400).json({ error: 'notes is required' });
    return;
  }
  try {
    const result = await generateWorkflowMap(notes, hourlyRate);
    if (result === null) {
      res.status(422).json({ error: 'Could not parse workflow map from notes' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('[tools] workflow-mapper error', err);
    res.status(500).json({ error: 'Failed to generate workflow map' });
  }
});

export default router;
