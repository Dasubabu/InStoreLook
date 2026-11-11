ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS search_document tsvector
 GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || brand || ' ' || category || ' ' || description)) STORED;
CREATE INDEX IF NOT EXISTS shop_product_search_gin ON shop_products USING GIN(search_document);
