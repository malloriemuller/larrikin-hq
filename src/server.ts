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
import toolsRouter from './routes/tools';

const app = express();
const PORT = process.env.PORT ?? 3001;

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

// Hard response timeout — any route that hasn't responded in 20s gets a 503.
// Belt-and-suspenders on top of the Airtable SDK requestTimeout.
app.use((_req, res, next) => {
  res.setTimeout(20000, () => {
    if (!res.headersSent) {
      console.error('[server] request timed out', { url: _req.url });
      res.status(503).json({ error: 'Request timed out' });
    }
  });
  next();
});

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
app.use('/api/tools', toolsRouter);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.get('/', (_req, res) => {
  res.send('Larrikin HQ API is running');
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Larrikin HQ API running on port ${PORT}`);
  console.log('[startup] env check', {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY ? 'set' : 'MISSING',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ? 'set' : 'MISSING',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    FRONTEND_URL: process.env.FRONTEND_URL ?? '(not set)',
  });
});

export default app;
