# InStoreLook — Investor Brief

## Executive thesis

**InStoreLook makes local fashion inventory discoverable.** A shopper opens the
app, shares their location, discovers nearby stores, checks products and ₹
pricing, and gets a practical next action: call, WhatsApp, or directions.

For the retailer, a photo upload becomes a structured digital listing with
AI-assisted copy and attributes. The seller keeps control of the final listing
while the shopper gets a better reason to visit the store.

## The problem

Local fashion has a visibility gap:

1. Maps answer **where is the store?**
2. Marketplaces answer **what can be shipped?**
3. Neither reliably answers **what is available in this nearby physical store
   right now?**

The result is wasted shopper time, missed retailer demand, and weak digital
discovery for independent stores.

## The product

InStoreLook adds an inventory-aware layer to local retail discovery:

- Current-location-first shopper experience.
- Nearby stores and map places.
- Store name, address, phone, landmark, distance, and directions when data is
  available.
- Product photos, ₹ price, MRP, discount, stock, sizes, material, and store.
- Saved items for return visits.
- Seller inventory management.
- AI-assisted product listing draft and review.

## Why the product is differentiated

### 1. It is local before it is transactional

The first conversion is not necessarily checkout. It may be a call, a route, a
store visit, or a product reservation. That makes the product relevant to
retailers who are not ready for a full marketplace migration.

### 2. It combines place context with product context

The shopper sees both the shop and the item. This is more useful than a generic
store directory and more local than a national product marketplace.

### 3. It gives small retailers a low-friction digital workflow

The seller can upload product images, review AI suggestions, and publish a
structured listing without building a website or managing a complex catalog
system.

## Current product status

### Working in the current build

- Shopper and seller role selection.
- Customer home, search, store discovery, product details, saved items.
- Browser geolocation and reverse-geocoded city display.
- OpenStreetMap-based nearby place discovery through a server-side adapter.
- Directions links and contact actions.
- India-first ₹ display in customer-facing catalog screens.
- Seller inventory screens and product image upload.
- AI-assisted listing draft review.
- Vite build and Vercel serverless customer API structure.

### Explicitly not claimed as complete

- Verified real-time stock for external map businesses.
- Production SMS OTP delivery.
- Payments and checkout.
- Guaranteed phone/landmark coverage for every map business.
- Durable multi-instance seller inventory on Vercel without a production database.

## Business model hypothesis

1. **Seller subscription:** catalog, AI listing, analytics, and visibility tools.
2. **Promoted local discovery:** clearly disclosed sponsored placements.
3. **Retail conversion services:** call, reservation, pickup, lead, and future
   transaction tooling.

## Expansion wedge

Start with a dense, measurable local market such as Hyderabad:

1. Onboard a focused set of fashion retailers.
2. Publish accurate inventory and location data.
3. Measure discovery-to-call, discovery-to-directions, and store-visit intent.
4. Improve density by neighborhood and category.
5. Expand to additional cities once the local loop is repeatable.

## Funding story

Funding would be used to:

- Seed high-quality retailer inventory in the launch city.
- Build durable production catalog infrastructure.
- Improve map/place data quality and routing reliability.
- Add seller onboarding and retention workflows.
- Measure the full funnel from discovery to store visit.

## One-line close

**InStoreLook is building the operating layer that helps shoppers know what is
nearby before they go — and helps local retailers become visible without losing
their identity.**
