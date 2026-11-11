# InStoreLook — Technical Architecture

## System shape

```text
React + Vite customer/seller UI
          │
          ├── /api/shop/*       → traditional commerce API
          ├── /api/customer/*   → legacy/demo catalog + location adapter
          ├── /api/*            → auth/seller compatibility API
          └── local Express server → development runtime

Catalog and commerce storage:
  sample catalog (deterministic development seed)
  PostgreSQL (production commerce/catalog target)
  SQLite compatibility path for local commerce development only
  MongoDB compatibility catalog (explicit legacy mode)
```

## Frontend

- React 19 with TypeScript.
- Vite build pipeline.
- Motion-based transitions.
- Tailwind-style utility classes and project CSS.
- React Leaflet for the nearby map.
- Socket.IO in local development for catalog refresh events.
- BroadcastChannel for cross-tab catalog snapshots.

Important customer modules:

- `src/components/customer/CustomerHomeScreen.tsx`
- `src/components/customer/CustomerSearchScreen.tsx`
- `src/components/customer/NearbyStoresScreen.tsx`
- `src/components/customer/CustomerStoreScreen.tsx`
- `src/components/customer/ProductDetailScreen.tsx`
- `src/components/customer/ProductCard.tsx`

Traditional shopping modules:

- `src/commerce/contracts.ts` — shared product, variant, cart, order and query
  contracts.
- `src/commerce/client.ts` — bounded API client with in-memory CSRF/session
  state; it never stores bearer credentials in web storage.
- `src/commerce/CommerceContext.tsx` — cart queue plus bounded comparison and
  recently-viewed snapshots.
- `src/commerce/server/` — SQL repository, migrations, feed import validation,
  cart/checkout reservations and optional Stripe provider boundary.

## API layer

### Customer function

`api/customer/[...path].ts` exposes the public legacy/customer routes and uses
the deterministic demo catalog safely when the deployment is in demo mode.

`/api/shop` owns the traditional shopping contract and must be mounted before
the global JSON parser so the Stripe webhook receives raw request bytes. Local
Express mounts it from `server.ts`; a production deployment must provide a
PostgreSQL connection and an exact HTTPS application origin.

Routes include:

- `GET /api/customer/products`
- `GET /api/customer/products/:id`
- `GET /api/customer/featured-products`
- `GET /api/customer/new-arrivals`
- `GET /api/customer/categories`
- `GET /api/customer/shops`
- `GET /api/customer/shops/nearby`
- `GET /api/customer/shops/:id`
- `GET /api/customer/places/nearby`

Commerce routes are documented in [`commerce-contract.md`](./commerce-contract.md)
and include public bounded product/facet/suggestion reads, guest-session cart
mutations, idempotent checkout, session-scoped orders, Stripe webhook handling,
and authorized admin imports. Server totals and stock are authoritative.

### Local API

`server.ts` runs Express locally and mounts the application routers under
`/api/*`. It also serves the Vite middleware during development.

## Map data flow

1. Browser requests permission through `navigator.geolocation`.
2. The client obtains latitude and longitude.
3. The customer API calls the nearby map-place adapter server-side.
4. The adapter queries an OpenStreetMap Overpass endpoint server-side.
5. The response is normalized into name, category, address, phone, landmark,
   distance, coordinates, and directions URL.
6. The UI renders map markers and action cards.

The map adapter is in:

```text
src/api/places.ts
```

For production traffic, configure a hosted or self-managed Overpass endpoint
with `OSM_OVERPASS_URL` and follow the provider’s usage policy.

## Catalog modes

### Demo mode

```text
CATALOG_SOURCE=demo
VITE_CATALOG_MODE=demo
```

This is the safe presentation mode. It is deterministic and does not require a
database connection for the legacy customer API. The `/api/shop` sample seed
uses the same records in a separate local/SQL commerce database and labels them
as sample inventory.

### Mongo mode

```text
CATALOG_SOURCE=mongo
VITE_CATALOG_MODE=mongo
MONGODB_URI=...
SESSION_SECRET=...
DEV_AUTH_SIMULATION=false
```

Mongo mode requires a reachable MongoDB deployment and should be used only when
the database and production authentication configuration are ready.

## Deployment

Vercel uses:

```text
Build command: npm run build:web
Output directory: dist
```

The SPA rewrite in `vercel.json` sends non-API paths to `index.html` while
leaving `/api/*` functions available. Vercel frontend deployment alone does not
provide a shared SQLite database or a configured Stripe/payment provider.

## Checks

```bash
npm run lint
npm run build:web
npm run build
```

## Production gaps to close

- Replace development OTP behavior with a verified SMS provider.
- Configure PostgreSQL for the commerce API and execute migrations through the
  application startup path.
- Import only authorized retailer/seller feeds; no scraper is included.
- Configure Stripe test/live credentials and webhook delivery before paid orders.
- Add provider-compliant caching and throttling for map data.
- Add real route-duration data if in-app travel estimates are required.
- Add browser end-to-end tests for location permission, API failure, checkout,
  and direct route refreshes.
- Measure PostgreSQL/OpenSearch/image-CDN workloads before making million-record
  or latency claims; the included benchmark is bounded synthetic SQLite only.
