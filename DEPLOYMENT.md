# InStoreLook deployment guide

## What is ready

InStoreLook is a traditional React/Vite fashion-shopping application. The
shopper surface includes catalog discovery, combined search filters, product
media, wishlist, comparison, cart, guest checkout, order history, nearby-store
discovery, and a restricted catalog-admin surface. Express is the local runtime;
the Vercel entrypoints provide public catalog/location APIs. Optional AI never
gates standard shopping.

The shopper routes are shareable clean paths:

- `/` — shopper home
- `/search` and `/search?category=Tops` — discovery
- `/product/:id` — product detail
- `/store/:id` — store detail
- `/stores` — store discovery map/list
- `/saved` — local wishlist
- `/cart` — server-backed guest cart
- `/checkout` — address and configured payment/demo checkout
- `/orders` — guest-session order history
- `/compare` — local product comparison snapshots
- `/admin` — restricted catalog summary/import tools

The default presentation deployment uses the explicit sample catalog. Customer-
facing prices are India-first and formatted in `₹`. Sample products, images,
prices, stock, ratings, and store listings are clearly labelled and are not
claims of live retailer inventory, brand partnership, or product authenticity.

The traditional commerce API is `/api/shop`. Its public read-only sample catalog
(`info`, `products`, `facets`, and `suggestions`) remains available on the demo
deployment without a database, so the storefront does not become an error page.
Guest sessions, carts, orders, and checkout use PostgreSQL in production with
server-side price/stock calculation, HttpOnly guest sessions, CSRF protection,
same-origin mutation checks, bounded authorized imports, and idempotent checkout.
SQLite is development-only unless the explicit local-demo guard is enabled.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Checks:

```bash
bun run lint
bun run test
npm run lint
npm run test
npm run build
```

`bun` is optional. In environments without the real Bun executable, use the
equivalent npm commands and report that Bun could not be run; do not substitute
an unverified command wrapper.

## Deploy the demo catalog to Vercel

The repository includes `vercel.json`, `api/customer/[...path].ts`, and a Vite-
only `build:web` script for Vercel. The public Vercel functions do not depend on
the local `sqlite.db`, uploads, `.env` files, or presentation assets. A frontend-
only/demo deployment does **not** make PostgreSQL checkout or Stripe available.
The UI presents a designed browse/save state until those services are configured;
it never creates a pretend order or reports a successful cart mutation.

```bash
npm install -g vercel
vercel login
vercel link
vercel env add VITE_CATALOG_MODE production # enter: demo
vercel --prod
```

If you prefer the Vercel dashboard, import this repository, keep the build command as `npm run build:web`, and keep the output directory as `dist`.

## Traditional commerce environment

For a production shopping backend, configure these server-side variables in the
deployment provider (never in frontend code):

```text
SHOP_DATABASE_URL=postgres://...            # required in production
SHOP_APP_ORIGIN=https://your-domain.example
SHOP_CATALOG_MODE=live                      # sample is demo-only
SHOP_PAYMENT_MODE=disabled|demo|stripe
SHOP_ADMIN_TOKEN=<at-least-24-random-characters>
STRIPE_SECRET_KEY=<server-only-test-or-live-key>
STRIPE_WEBHOOK_SECRET=<server-only-signing-secret>
```

`demo` checkout records an order but never marks it paid. `stripe` creates a
hosted Stripe Checkout session from server-calculated INR totals; only a
verified, matching webhook can mark an order paid. Configure tax, shipping,
fulfilment, refunds, rate limiting, monitoring, and customer account recovery
before operating a real store.

Run an authorized feed import from a controlled environment:

```bash
node --import tsx scripts/catalog-import.ts --authorized --source vendor-v1 catalog.ndjson
```

The importer accepts NDJSON in bounded batches, validates HTTPS media URLs and
variants, rejects feed/SKU conflicts, and is idempotent for repeated batches. It
does not scrape retailers or establish authorization for a third-party feed.

## Legacy MongoDB compatibility mode

Mongo mode is explicit and never silently falls back to demo data. Configure these Vercel environment variables before selecting it:

```text
CATALOG_SOURCE=mongo
VITE_CATALOG_MODE=mongo
MONGODB_URI=<private MongoDB connection string>
SESSION_SECRET=<long random value>
DEV_AUTH_SIMULATION=false
```

Mongo mode requires a reachable MongoDB deployment and a database allowlist for the Vercel runtime. The API returns a clear `503 MONGODB_NOT_CONFIGURED` or `503 MONGODB_UNAVAILABLE` response when setup is incomplete.

The local SQLite/seller flow remains a development compatibility path. It is not
a durable multi-instance production database, and Vercel serverless functions
must not use it as shared inventory storage.

## Nearby stores

Nearby discovery requests browser permission only when the shopper chooses it.
Manual coordinates and bounded city search remain available when permission is
denied. Registered InStoreLook stores and external map businesses are separate
sources; map listings never imply product stock. Configure a hosted/self-hosted
Overpass/geocoder/tile provider and follow its policy before production traffic.

## Optional AI behavior

AI is a small optional assistant for attribute explanations, combinations, or
seller drafting. Configure a `GEMINI_API_KEY` only if this feature is wanted;
without it the standard catalog, cart, checkout, order and store flows remain
available and any AI route must fail closed or return an explicit unavailable
state. Image screening is not proof of authenticity or counterfeit detection.

The authenticity result is a visual screening signal, not proof that an item is
genuine or counterfeit. Provenance, invoices, duplicate-image search, brand
registry checks, and human review are still required for a real authenticity
decision.

## Deployment verification record

Do not copy a deployment URL into this document until that deployment has been
verified from the current build. At minimum, verify `/`, a deep product/search
route, `/api/customer/categories`, `/api/shop/info`, and (when configured) a
sample cart mutation plus read-back. A successful Vite build is not evidence of
a deployed URL, PostgreSQL connectivity, Stripe configuration, map coverage, or
live retailer inventory.
