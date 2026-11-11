# InStoreLook

InStoreLook is a traditional, India-first fashion shopping platform. The core
experience is standard e-commerce: catalog discovery, search and filters,
product details and supplied image galleries, wishlist, comparison, cart,
guest checkout, order history, catalog administration, and nearby-store
discovery. AI is optional and never required for shopping.

## Live project

[Open InStoreLook](https://instorelook.vercel.app)

## Project root

Run commands from:

```text
C:\Users\sunny\Downloads\instorelook (4)\instorelook (3)
```

## Local development

Prerequisite: Node.js 20+ (the current workspace uses Node 24).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The default presentation catalog is deterministic sample data and is visibly
labelled. It is not live retailer inventory and its images, prices, stock and
ratings are not commercial claims.

The sample storefront remains browseable when no commerce database is present.
Wishlist and comparison work locally; server-backed cart, orders and checkout
stay visibly unavailable until PostgreSQL and the required server variables are
configured.

## Checks

```bash
npm run lint
npm test
npm run test:components
npm run build
```

`bun run lint` and `bun run test` are equivalent when the real Bun executable is
installed. The workspace wrapper may report that Bun is unavailable; use the
npm commands above instead.

## Architecture

- Frontend: React 19, TypeScript, Vite, Tailwind-style CSS and Motion.
- Local backend: Express with `/api/shop`, `/api/customer`, seller and optional
  AI routes.
- Production commerce target: PostgreSQL with normalized products, variants,
  media, sessions, carts, orders, reservations and import jobs.
- Search: indexed PostgreSQL full-text candidates with a deterministic SQLite
  development fallback; only bounded pages are sent to the browser.
- Media: supplied product images only, lazy thumbnail loading and honest source
  disclosures. No image is fabricated when a view is missing.
- Maps: consent-based browser geolocation, manual coordinates, configured city
  search and server-side map-place lookup. External map businesses are not
  treated as inventory-confirmed sellers.
- Payments: disabled by default; demo checkout is explicitly non-paid. Stripe
  is server-only and payment status changes only after a verified webhook.

Read [DEPLOYMENT.md](./DEPLOYMENT.md) for environment variables and deployment
boundaries, [docs/commerce-contract.md](./docs/commerce-contract.md) for the
API contract, and [docs/technical-architecture.md](./docs/technical-architecture.md)
for the system design.

## Deployment

The Vite frontend can be deployed with:

```text
Build command: npm run build:web
Output directory: dist
```

Vercel frontend deployment does not create a PostgreSQL database or configure
Stripe/maps. Set server-side `SHOP_*`, Stripe and provider variables before
claiming those integrations work. Never commit `.env`, database files, uploads,
tokens or provider secrets.
