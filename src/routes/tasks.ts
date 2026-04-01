import { Router, Request, Response } from 'express';
import * as airtable from '../services/airtable';
import { Assignee, TaskStatus, TaskType, CreateTaskBody, UpdateTaskBody } from '../types/index';

const router = Router();

// GET /api/tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      assignee: req.query.assignee as Assignee | undefined,
      status: req.query.status as TaskStatus | undefined,
      projectId: req.query.projectId as string | undefined,
      taskType: req.query.taskType as TaskType | undefined,
    };
    const tasks = await airtable.listTasks(filters);
    res.json(tasks);
  } catch (err) {
    console.error('[tasks] list error', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateTaskBody;
    if (!body.Title || !body.Project || !body.Assignee || !body['Task Type']) {
      res.status(400).json({ error: 'Title, Project, Assignee, and Task Type are required' });
      return;
    }
    const task = await airtable.createTask(body);
    res.status(201).json(task);
  } catch (err) {
    console.error('[tasks] create error', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body as UpdateTaskBody;
    const task = await airtable.updateTask(req.params.id, body);
    res.json(task);
  } catch (err) {
    console.error('[tasks] update error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /api/tasks/:id/complete
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const task = await airtable.completeTask(req.params.id);
    res.json(task);
  } catch (err) {
    console.error('[tasks] complete error', { id: req.params.id, err });
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

export default router;
