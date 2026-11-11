# InStoreLook — Product Overview

## Shopper journey

1. **Explore the home feed.** See campaign content, categories, brands, new
   arrivals, and bounded product rails without loading the whole catalog.
2. **Search and filter.** Search by title, brand, category and supported product
   attributes; combine filters and sort server-side with a shareable URL.
3. **Open a product.** See every supplied product image, INR price/MRP/discount,
   stock and variant availability, material details, size chart, delivery/return
   disclosures, related products, comparison, wishlist and recently viewed items.
4. **Choose a variant and add to cart.** The server validates the product/variant,
   recalculates price and quantity limits, and returns the authoritative cart.
5. **Checkout.** Submit an India delivery address. Demo checkout records a
   clearly non-paid order; Stripe checkout remains unavailable until the server
   is configured and a verified webhook confirms payment.
6. **Review orders.** Order history is scoped to the current guest browser
   session unless production account recovery/authentication is added.
7. **Discover nearby stores.** Separately choose location permission, enter
   coordinates, or search a city. Map businesses do not imply product stock.

## Nearby discovery

The app separates two kinds of information:

### Registered InStoreLook stores

These stores can have products and inventory in the platform catalog.

### External map places

These are businesses discovered through map data. They may include a name,
category, address, phone, landmark, distance, and directions when the provider
has those fields. They do not automatically have InStoreLook product stock.

## Seller and catalog operations

1. Seller signs in.
2. Seller opens inventory and chooses **Add Product**.
3. Seller uploads a front image and optional supporting angles.
4. Optional AI can generate a listing draft.
5. Seller reviews and edits title, description, material, color, pricing, and
   stock.
6. Seller confirms and publishes the product.
7. An authorized feed or configured production catalog can publish the product;
   sample seed data is never presented as verified retailer inventory.

The restricted catalog-admin surface supports summary inspection and bounded
authorized JSON imports. It is not a substitute for seller identity, feed
authorization, moderation, fulfillment, tax, or customer-account operations.

## Media library

Every supplied product image is retained in its ordered media set and can be
reviewed from the product detail/gallery flow. The gallery shows only images
actually supplied by the catalog and labels source/provenance where available.
Optional screening is intentionally a review signal rather than a definitive
counterfeit detector. Missing views remain unavailable; the UI never fabricates
front/back/model/detail photos.

## Trust and clarity cues

- Sample catalog content is labeled as sample content.
- Live inventory is labeled separately.
- Out-of-stock products are visibly marked.
- Location permission failure is not presented as a fake city.
- Map businesses are not presented as registered sellers unless they actually
  exist in the InStoreLook catalog.
- Payment status comes from the server/provider webhook, never from a redirect
  query string.
- AI is optional and disabled/unavailable without blocking catalog or checkout
  browsing.
