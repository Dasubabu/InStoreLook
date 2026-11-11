import express from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getShopRouter } from '../../src/commerce/server/index.js';

/**
 * Dedicated Vercel function for the traditional commerce contract.
 * A separate function is intentional: Vercel's generic api/[...path] catch-all
 * can be shadowed for nested /api/shop paths, while this file maps directly to
 * /api/shop/* in the production router.
 */
const app = express();
app.disable('x-powered-by');
const shopRouter = getShopRouter();

// Vercel's catch-all adapter exposes the wildcard segment as `req.query.path`.
// It is routing metadata, not a commerce query, and must not reach the strict
// public query validator (`/products?path=...` would otherwise be rejected).
app.use((req, _res, next) => {
  if (req.query && 'path' in req.query) delete req.query.path;
  next();
});

// Depending on the serverless adapter, req.url may retain the public prefix or
// contain only the path remaining after the function route. Mount all three
// forms without changing the public URL contract.
app.use('/api/shop', shopRouter);
app.use('/shop', shopRouter);
app.use(shopRouter);

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}
