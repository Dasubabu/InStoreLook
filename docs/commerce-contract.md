# Commerce contract v1

Canonical types: `src/commerce/contracts.ts`. Existing React/Vite/Express stack
is retained; PostgreSQL is the production database target, isolated SQLite is
development-only. All new API routes are under `/api/shop`.

| Method | Path | Body / response |
|---|---|---|
| GET | /session | ShopSession (root object), creates HttpOnly guest session |
| GET | /products | ShopQuery -> ShopPage |
| GET | /products/:id | `{data: ShopProduct}` |
| GET | /facets | `{data: ShopFacets}` |
| GET | /suggestions?q= | `{data: string[]}` max 8 |
| GET | /cart | `{data: Cart}` |
| POST | /cart/items | `{productId,variantId,quantity}` -> `{data:Cart}` (adds quantity) |
| PATCH | /cart/items/:id | `{quantity}` -> `{data:Cart}` |
| DELETE | /cart/items/:id | `{data:Cart}` |
| POST | /checkout | `{address,paymentMode,idempotencyKey}` -> `{data:CheckoutResult}` |
| GET | /orders | `{data:ShopOrder[]}` scoped to session |
| GET | /orders/:id | `{data:ShopOrder}` scoped to session |
| POST | /orders/:id/cancel | `{data:ShopOrder}`; Stripe session must be expired before reservation release |
| POST | /payments/webhook | raw Stripe webhook, signature verified |
| POST | /admin/login | `{token}` -> sets privileged HttpOnly session; token never stored in client |
| POST | /admin/logout | revokes privilege |
| GET | /admin/summary | `{data:{products,orders,lowStock,mode}}` |
| POST | /admin/import | `{source,authorized:true,products:ShopProduct[]}` bounded batch -> `{data:{imported}}` |

Mutations (except Stripe webhook) require `X-CSRF-Token` from `/session` and
same-origin checks. Errors use `{error:{code,message}}`. Catalog price is INR;
cart/order prices are integer paise and computed only on the server. Quantity
is 1–10, checkout is atomic/idempotent and revalidates stock. Demo orders must
never be marked paid. Provider redirects never establish payment status.

Checkout is guest-session based; order history belongs to that browser session,
not a verified account. Production auth and recovery requirements are documented
separately. Stripe cancellation is server/provider-confirmed; a browser return
URL never releases inventory. No millions-of-products performance claim without
measurements.

Shared frontend API: `src/commerce/client.ts` exports `shopApi` with session,
products, product, facets, suggestions, cart, addItem, updateItem, removeItem,
checkout, orders, order, adminLogin, adminLogout, adminSummary, importProducts.
`useCommerce()` from `src/commerce/CommerceContext.tsx` exposes cart, loading,
error, addItem(productId,variantId,quantity), refreshCart, comparison array,
toggleCompare(product), recentlyViewed array, rememberProduct(product).

Frontend routes: `/cart`, `/checkout`, `/orders`, `/compare`, `/admin` mapped to
`customer_cart`, `customer_checkout`, `customer_orders`, `customer_compare`,
`customer_admin`. Checkout displays result inline then links to history.
