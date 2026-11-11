import express from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import aiRouter from '../../src/api/routes/ai.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

// Vercel can pass the original /api/ai path to a dedicated function while the
// local Express server mounts the router at /api/ai. Normalize both shapes so
// the same analysis implementation works locally and in production.
app.use((req, _res, next) => {
  if (req.url?.startsWith('/api/ai')) {
    req.url = req.url.slice('/api/ai'.length) || '/';
  }
  next();
});
app.use('/', aiRouter);

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}
