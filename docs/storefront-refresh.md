# Indian storefront refresh

## Preview

Start the existing development server with `npm run dev`. The homepage is `/`.
For a frontend-only demo preview, use `npx vite --host 127.0.0.1 --port 5173`.
The frontend-only preview does not provide seller or nearby-place APIs.

## Delivered

- Original ivory, burgundy and gold storefront with search, photo categories,
  manual campaign selection, budget shortcuts, brand edits and fixed navigation.
- Replaced the old US demo assortment and its stock photos with Indian reference
  listings: Kurtas, Sarees, Dresses, Shirts, Bottoms and Footwear.
- W, Levi's and PUMA reference imagery is mapped centrally in
  `src/lib/indiaImages.ts`, with source collection URLs in that file.
- Neutral unavailable-image fallback instead of substituting unrelated photos.
- Filters: category, gender, brand, INR price bounds, size, colour, occasion,
  minimum discount, availability and sort. Filters combine before pagination.
- Search URLs retain filters across refresh and browser back navigation.

## Boundaries

This is a **reference demo assortment**, not a brand partnership or verified
retailer stock feed. Prices, discounts and size quantities are illustrative.
Brand photographs remain remotely hosted and are not represented as licensed
advertising assets. Obtain approved retailer/brand imagery for commercial use.
No seller uploads, saved items, database records or attached reference images
were deleted by this refresh.

Kids, Beauty and Home are exploratory department links with an empty result
state until those catalog entries are supplied. Advanced filters currently
operate on the complete sample assortment. Mongo-backed live inventory retains
category/search/availability/sort and explicitly rejects unsupported refinements.
Deployed to production on October 22, 2026 at `https://instorelook.vercel.app`.
Deployment ID: `dpl_7gR4KpZDBDHuDLSNZX7zXUEUtLV2` (READY).
Added `.vercelignore` to exclude local credentials, attachments, uploads,
SQLite databases and presentation assets from deployment uploads.

## Verification

```sh
node --import tsx --test src/lib/demoCatalog.test.ts
npm run lint
npm run build:web
git diff --check
```

The 13 regression cases cover catalog identity, compound filters, inclusive price
bounds, stock/size combinations, case-insensitive search, reset, all sorts,
pagination, route round-trips, client/serverless/local consistency and unsupported
live filters. The homepage was visually inspected in the built-in browser.
Interactive browser dispatch was unavailable, so click-through verification is
not claimed; route/data behavior is covered by the tests.

Production verification with `vercel curl` passed for `/`, `/search?brand=PUMA`,
`/api/customer/categories` and
`/api/customer/products?category=Kurtas&maxPrice=1500&sort=priceAsc`.
The last request returned two INR products ordered at 1199 and 1499.
The deployed JavaScript asset returned HTTP 200 and contains the new homepage,
Indian reference catalog and search screen. The remaining large-bundle warning
is non-blocking. Bun is unavailable in the current environment; npm typecheck
and all 13 regression tests passed before deployment.
