import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import * as onboarding from '../services/onboarding';
import { ProjectStatus, CreateProjectBody, UpdateProjectBody, PhaseType } from '../types/index';

const router = Router();

// GET /api/projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as ProjectStatus | undefined;
    const clientId = req.query.clientId as string | undefined;
    const projects = await airtable.listProjects({ status, clientId });
    res.json(projects);
  } catch (err) {
    console.error('[projects] list error', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await airtable.getProject(req.params.id);
    const phaseIds = (project.fields as Record<string, unknown>)['Project Phases'] as string[] | undefined ?? [];
    const taskIds = (project.fields as Record<string, unknown>)['Tasks'] as string[] | undefined ?? [];
    const [phases, tasks] = await Promise.all([
      Promise.all(phaseIds.map((id) => airtable.getPhase(id))),
      Promise.all(taskIds.map((id) => airtable.getTask(id))),
    ]);
    phases.sort((a, b) => ((a.fields.Order ?? 0) as number) - ((b.fields.Order ?? 0) as number));
    res.json({ ...project, phases, tasks });
  } catch (err) {
    console.error('[projects] get error', { id: req.params.id, err });
    res.status(404).json({ error: 'Project not found' });
  }
});

// POST /api/projects
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateProjectBody;
    if (!body.name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const project = await airtable.createProject(body);
    res.status(201).json(project);
  } catch (err) {
    console.error('[projects] create error', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PATCH /api/projects/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateProjectBody;
    const project = await airtable.updateProject(req.params.id, body);
    res.json(project);
  } catch (err) {
    console.error('[projects] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const project = await airtable.getProject(req.params.id);
    const phaseIds: string[] = project.fields['Project Phases'] ?? [];
    await Promise.all(phaseIds.map(id => airtable.deletePhase(id)));
    await airtable.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects] delete error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:id/communications-log
router.get('/:id/communications-log', async (req: Request, res: Response) => {
  try {
    const entries = await airtable.getCommunicationsLogByProjectId(req.params.id);
    res.json(entries);
  } catch (err) {
    console.error('[projects] comms log fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch communications log' });
  }
});

// GET /api/projects/:id/engagement
router.get('/:id/engagement', async (req: Request, res: Response) => {
  try {
    const project = await airtable.getProject(req.params.id);
    const phaseIds: string[] = project.fields['Project Phases'] ?? [];
    const phases = await Promise.all(phaseIds.map(id => airtable.getPhase(id)));
    phases.sort((a, b) => ((a.fields['Order'] ?? 0) as number) - ((b.fields['Order'] ?? 0) as number));
    res.json({ project, phases });
  } catch (err) {
    console.error('[projects] engagement fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch engagement' });
  }
});

// POST /api/projects/:id/activate-phase
router.post('/:id/activate-phase', async (req: Request, res: Response) => {
  try {
    const project = await airtable.getProject(req.params.id);
    const client = await airtable.getClient(project.fields['Client'][0]);
    const { phaseType } = req.body as { phaseType: PhaseType };
    if (!phaseType || !['Audit', 'Build', 'Retainer'].includes(phaseType)) {
      return res.status(400).json({ error: 'Invalid phaseType. Must be Audit, Build, or Retainer.' });
    }
    await onboarding.activatePhaseManually(client.fields.Email, phaseType, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects] activate-phase error:', err);
    res.status(500).json({ error: 'Failed to activate phase' });
  }
});

export default router;
