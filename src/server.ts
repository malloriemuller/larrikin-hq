import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import clientsRouter from './routes/clients';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import emailQueueRouter from './routes/emailQueue';
import credentialsRouter from './routes/credentials';
import phasesRouter from './routes/phases';
import webhooksRouter from './routes/webhooks';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = Array.from(
  new Set(['http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean) as string[])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Raw body needed for webhook signature validation — must come before json middleware
app.use('/webhooks', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/clients', clientsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/email-queue', emailQueueRouter);
app.use('/api/credentials', credentialsRouter);
app.use('/api/phases', phasesRouter);
app.use('/webhooks', webhooksRouter);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Larrikin HQ API running on port ${PORT}`);
});

export default app;
