# InStoreLook Documentation

InStoreLook is an India-first traditional fashion-commerce platform. Shoppers
can discover catalog products, inspect supplied media and fabric details, save
and compare items, add variants to a server-backed cart, complete configured
demo/Stripe checkout, review orders, and optionally discover nearby clothing
stores. AI is an optional helper, not the product's control plane.

## Documentation map

- [Investor brief](./investor-brief.md) — premium VC-facing narrative, product
  value, business model, milestones, and the funding story.
- [Product overview](./product-overview.md) — what the shopper and seller can
  do today, including current-location discovery and ₹ pricing.
- [Technical architecture](./technical-architecture.md) — frontend, APIs,
  catalogs, maps, data flows, deployment model, and known boundaries.
- [Commerce contract](./commerce-contract.md) — canonical `/api/shop` request,
  response, session, cart, checkout, order, payment and import behavior.
- [Demo runbook](./demo-runbook.md) — the exact live-demo sequence for an
  investor, partner, or retail-store presentation.

## Verified positioning

The current build supports a polished sample catalog, India-first customer
pricing, server-backed guest cart/checkout/order flow, location-aware store
discovery, map-place discovery, store/product details, saved items, product
comparison, seller inventory screens, bounded catalog imports, and optional
AI-assisted product drafts.

External map places and registered InStoreLook sellers are intentionally shown
as different data sources. A map provider can identify a business, but only a
registered seller can provide InStoreLook product availability.
