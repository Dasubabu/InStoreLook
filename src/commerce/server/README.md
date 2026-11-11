# Commerce server integration

The canonical request/response types are `../contracts.ts` and routes are documented
in `docs/commerce-contract.md`. This router owns its body parsers and error envelope.

```ts
import { getShopRouter } from './src/commerce/server/index.js';
app.use('/api/shop', getShopRouter()); // BEFORE any global express.json()
app.use(express.json());
```

`getShopRouter()` is synchronous and returns a singleton router. Database opening,
migrations and optional one-time seed are lazy on the first request. Configuration
errors return `503 {error:{code:"SHOP_UNAVAILABLE",message:...}}`; they never fall
back to another database. `createShopRouter({sqlite:new Database(':memory:'),env,
seed:false})` creates an isolated test instance. Alternatively inject `database`
or `repository`. Only the test harness injects `fetch` for provider-boundary tests.

Package `database/migrations/*.sql` with the server/serverless deployment and run
the process with project root as its working directory. The portable core is
applied transactionally; PostgreSQL additionally installs a generated full-text
document and GIN index. All discovery predicates, sorting, counts and pagination
run in SQL; only a bounded result page is hydrated. This is the first scalable
PostgreSQL stage, not OpenSearch and not a demonstrated million-product deployment.

## Environment

| Variable | Behavior |
| --- | --- |
| `SHOP_DATABASE_URL` | PostgreSQL connection URL; mandatory on Vercel/production except explicit local demo below. Connection-string TLS configuration is honored by pg. |
| `SHOP_SQLITE_PATH` | Development-only file; defaults to `.data/shop.sqlite`. Root `sqlite.db` is rejected. |
| `SHOP_APP_ORIGIN` | Exact application origin, e.g. `https://shop.example.com`; mandatory in production. Development default is `http://localhost:3000`. Mutations require matching `Origin`. |
| `SHOP_CATALOG_MODE` | `live` or `sample`; defaults to sample only outside production. Sample seed maps `DEMO_PRODUCTS` into real variant/media rows once on an empty catalog. |
| `SHOP_PAYMENT_MODE` | `disabled` (implicit default), `demo`, or `stripe`. Demo must be explicit and creates `placed`, never `paid`, orders. |
| `STRIPE_SECRET_KEY` | Server-only Stripe secret; required with webhook secret to enable Stripe mode. |
| `STRIPE_WEBHOOK_SECRET` | Server-only signing secret for this endpoint. |
| `SHOP_ADMIN_TOKEN` | Server-only credential, at least 24 characters. Missing/short token disables admin login. |
| `SHOP_ALLOW_LOCAL_DEMO` | Only literal `true`, together with sample catalog and demo payment, permits SQLite in non-Vercel production. Vercel always requires PostgreSQL. |

No payment mode means checkout is deliberately unavailable while catalog/cart
remain usable. No AI API key is needed. `/info` is also a public capability endpoint.
Guest cookies are HttpOnly, SameSite=Lax, 30-day expiry; production uses Secure
`__Host-shop_session`. Only token hashes are stored. Admin privilege lasts one hour.
Login/logout rotate both cookie credential and CSRF token; call `/session` again
after either action. Client mutation requests need `X-CSRF-Token` and same origin.

## Payments and reservations

Hosted Checkout uses Stripe's versioned REST API with server-computed line items
and a stable order-derived provider idempotency key. Only verified, timestamp-bound
raw webhook events with matching order, session, INR currency and amount can mark
an order paid. Enable `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, and `checkout.session.expired` events.
Redirect query parameters never mark orders paid.

Checkout atomically deducts reserved stock and persists its order/item snapshots.
A first definitive provider rejection cancels the order and releases its stock.
Timeouts/ambiguous failures retain stock and a durable attempt count; retry the
same checkout idempotency key. Provider creation is serialized per order across
workers. A subsequent validation failure cannot release possibly-paid inventory.

Additional endpoint: `POST /api/shop/orders/:id/cancel` (same session + CSRF). It
retrieves/expires the provider session and releases inventory only after confirmed
expiry. Merely returning via the Stripe cancel URL does not release inventory.
Signed expiry webhooks also release stock, exactly once. Do not release a
reservation merely because the local clock elapsed. If no provider session ID can
be recovered after a prolonged ambiguous provider outage, retain the reservation
and reconcile against Stripe before changing it; creation is refused after 23h
to avoid a pruned provider idempotency key creating a second session. Automated
cross-provider reconciliation/alerting remains an operational extension.

The configured checkout currently offers free shipping and no added tax; there
is no hidden payment/shipping total calculated by the client. Configure actual
fulfillment/tax rules before operating a paid store. Guest order history belongs
to a browser session, not an authenticated/recoverable customer account.

## Authorized imports

`POST /admin/import` accepts at most 100 products and a 1 MiB body, with
`{source,authorized:true,products}`. The source is an authorized feed identity,
not a URL to scrape. Images must be HTTPS. Product and variant IDs/SKUs are stable;
cross-feed identity or SKU collisions reject and roll back the whole batch.
Repeated identical source+batch content is idempotent and never replenishes sold
stock. Changed batches upsert, with historical variants retained but deactivated.

Stock in changed feeds is authoritative physical stock; outstanding Stripe
reservations are subtracted. A stale supplier snapshot must not be treated as a
new stock update. Send a fresh authoritative snapshot when genuinely replenishing
inventory. Keep feed IDs and batch boundaries stable for import replay.

```sh
node --import tsx scripts/catalog-import.ts --authorized --source vendor-v1 catalog.ndjson
node --import tsx scripts/commerce-benchmark.ts
node --import tsx --test src/commerce/server/shop.test.ts
```

The CLI accepts one `ShopProduct` per line, caps lines at 1 MiB, validates through
the same repository, commits 100-product batches, and does not seed. Earlier
batches remain committed if a later line/batch fails; replay is idempotent. It
reads only the explicitly supplied feed file and makes no scraper requests.
The benchmark does not import/seed, reports actual row count and local p50/p95
for 40 bounded SQL requests, and is not a production load benchmark.

## Verification boundary

The Node HTTP tests exercise real SQLite and Express, a fresh persistent database
read-back, server totals, checkout concurrency, session isolation, invalid inputs,
CSRF, imports, and the raw Stripe signature/replay/expiry protocol. Stripe HTTP
is mocked at the provider boundary; no charge is created. PostgreSQL execution
and real Stripe test-mode checkout need configured external services. Process-local
admin login throttling should be supplemented by deployment-level rate limiting
across workers. Deployment, credentials, reconciliation operations, customer
account recovery, and authorization to use each real feed are not supplied by
this module.
