import express from 'express';
import cors from 'cors';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mongoRouter } from '../src/api/mongoRoutes.js';
import aiRouter from '../src/api/routes/ai.js';
import { getShopRouter } from '../src/commerce/server/index.js';

/**
 * Vercel entry point for auth, seller inventory, stores, and catalog aliases.
 * The more specific api/customer/[...path].ts function remains the only
 * serverless entry point for the legacy customer URL surface, so this catch-all
 * does not create a second customer catch-all.
 */
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: '*' }));
// /api/shop owns its raw Stripe webhook parser and must mount before the
// catch-all JSON parser below. It fails closed until production PostgreSQL and
// optional payment configuration are supplied.
const shopRouter = getShopRouter();
app.use((req, _res, next) => {
  if (req.query && 'path' in req.query) delete req.query.path;
  next();
});
// Vercel's catch-all adapter has used both /api-prefixed and stripped request
// paths across runtime versions. Supporting both prefixes keeps the public
// /api/shop contract stable without changing the local Express mount.
app.use('/api/shop', shopRouter);
app.use('/shop', shopRouter);
app.use(express.json({ limit: '10mb' }));
app.use('/api/ai', aiRouter);
app.use('/api', mongoRouter);

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}
