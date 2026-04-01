import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { handlePhaseCompleted } from '../services/onboarding';

const router = Router();

// POST /api/phases
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 'Phase Name': phaseName, Project, Order, Status, 'Target Date': targetDate, 'Billing Milestone': billingMilestone, 'Billing Amount': billingAmount } = req.body;
    if (!phaseName || !Project || Order == null) {
      res.status(400).json({ error: 'Phase Name, Project, and Order are required' });
      return;
    }
    const phase = await airtable.createPhase({ 'Phase Name': phaseName, Project, Order, Status, 'Target Date': targetDate, 'Billing Milestone': billingMilestone, 'Billing Amount': billingAmount });
    res.status(201).json(phase);
  } catch (err) {
    console.error('[phases] create error', err);
    res.status(500).json({ error: 'Failed to create phase' });
  }
});

// PATCH /api/phases/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const phase = await airtable.updatePhase(req.params.id, req.body);
    res.json(phase);

    // If a phase was just marked Complete, trigger any downstream actions async
    if (req.body.Status === 'Complete') {
      const projectId = (phase.fields.Project as string[])?.[0];
      const phaseName = phase.fields['Phase Name'] as string;
      if (projectId && phaseName) {
        handlePhaseCompleted(projectId, phaseName).catch((err) =>
          console.error('[phases] post-completion hook failed', { id: req.params.id, err })
        );
      }
    }
  } catch (err) {
    console.error('[phases] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

export default router;
