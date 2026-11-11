-- Portable normalized core. PostgreSQL-only full-text/index additions are in 002.
CREATE TABLE IF NOT EXISTS shop_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shop_products (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, external_id TEXT NOT NULL,
 name TEXT NOT NULL, brand TEXT NOT NULL, category TEXT NOT NULL, gender TEXT NOT NULL,
 color TEXT NOT NULL, fabric TEXT NOT NULL, fit TEXT NOT NULL, pattern TEXT NOT NULL,
 occasion TEXT NOT NULL, description TEXT NOT NULL, price_minor INTEGER NOT NULL CHECK(price_minor >= 0),
 mrp_minor INTEGER NOT NULL CHECK(mrp_minor >= 0), rating REAL, details TEXT NOT NULL,
 inventory_source TEXT NOT NULL CHECK(inventory_source IN ('sample','live')),
 created_at BIGINT NOT NULL, UNIQUE(source, external_id)
);
CREATE TABLE IF NOT EXISTS shop_variants (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES shop_products(id), sku TEXT NOT NULL UNIQUE,
 size TEXT NOT NULL, color TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock >= 0),
 price_minor INTEGER NOT NULL CHECK(price_minor >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS shop_media (
 product_id TEXT NOT NULL REFERENCES shop_products(id), position INTEGER NOT NULL,
 url TEXT NOT NULL, alt TEXT NOT NULL, view_name TEXT, source TEXT, PRIMARY KEY(product_id, position)
);
CREATE TABLE IF NOT EXISTS shop_sessions (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, csrf_token TEXT NOT NULL,
 admin_until BIGINT NOT NULL DEFAULT 0, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_cart_items (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES shop_sessions(id),
 variant_id TEXT NOT NULL REFERENCES shop_variants(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 updated_at BIGINT NOT NULL, UNIQUE(session_id, variant_id)
);
CREATE TABLE IF NOT EXISTS shop_orders (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES shop_sessions(id),
 idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('placed','awaiting_payment','paid','cancelled')),
 payment_mode TEXT NOT NULL CHECK(payment_mode IN ('demo','stripe')),
 subtotal_minor BIGINT NOT NULL CHECK(subtotal_minor >= 0), shipping_minor BIGINT NOT NULL CHECK(shipping_minor >= 0), total_minor BIGINT NOT NULL CHECK(total_minor >= 0),
 currency TEXT NOT NULL CHECK(currency='INR'), address TEXT NOT NULL, created_at BIGINT NOT NULL,
 reservation_until BIGINT NOT NULL, provider_session TEXT UNIQUE, checkout_url TEXT,
 provider_attempts INTEGER NOT NULL DEFAULT 0,
 UNIQUE(session_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS shop_order_items (
 order_id TEXT NOT NULL REFERENCES shop_orders(id), position INTEGER NOT NULL,
 variant_id TEXT NOT NULL REFERENCES shop_variants(id), quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 unit_price_minor INTEGER NOT NULL, snapshot TEXT NOT NULL, PRIMARY KEY(order_id, position)
);
CREATE TABLE IF NOT EXISTS shop_payment_events (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES shop_orders(id), created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS shop_import_jobs (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, digest TEXT NOT NULL, imported INTEGER NOT NULL,
 created_at BIGINT NOT NULL, UNIQUE(source,digest)
);
CREATE INDEX IF NOT EXISTS shop_product_category_price ON shop_products(category,price_minor,id);
CREATE INDEX IF NOT EXISTS shop_product_brand_price ON shop_products(brand,price_minor,id);
CREATE INDEX IF NOT EXISTS shop_product_gender ON shop_products(gender,price_minor,id);
CREATE INDEX IF NOT EXISTS shop_product_price ON shop_products(price_minor,id);
CREATE INDEX IF NOT EXISTS shop_product_created ON shop_products(created_at,id);
CREATE INDEX IF NOT EXISTS shop_product_rating ON shop_products(rating,id);
CREATE INDEX IF NOT EXISTS shop_product_color ON shop_products(color);
CREATE INDEX IF NOT EXISTS shop_product_fabric ON shop_products(fabric);
CREATE INDEX IF NOT EXISTS shop_product_fit ON shop_products(fit);
CREATE INDEX IF NOT EXISTS shop_product_pattern ON shop_products(pattern);
CREATE INDEX IF NOT EXISTS shop_product_occasion ON shop_products(occasion);
CREATE INDEX IF NOT EXISTS shop_variant_product ON shop_variants(product_id,active,stock);
CREATE INDEX IF NOT EXISTS shop_variant_stock ON shop_variants(active,stock);
CREATE INDEX IF NOT EXISTS shop_variant_size ON shop_variants(size,product_id,active);
CREATE INDEX IF NOT EXISTS shop_variant_color ON shop_variants(color,product_id,active);
CREATE INDEX IF NOT EXISTS shop_order_session ON shop_orders(session_id,created_at);
CREATE INDEX IF NOT EXISTS shop_order_reservations ON shop_orders(status,reservation_until);
CREATE INDEX IF NOT EXISTS shop_session_expiry ON shop_sessions(expires_at);
