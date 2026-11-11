-- Canonical normalized terms are populated/backfilled by catalogSearch() in
-- the same migration/import transaction. Only active variants contribute.
ALTER TABLE shop_products ADD COLUMN search_primary TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_products ADD COLUMN search_attributes TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_products ADD COLUMN search_terms TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS shop_variant_selection ON shop_variants(product_id,size,color,stock) WHERE active=1;
CREATE INDEX IF NOT EXISTS shop_product_discount ON shop_products((CASE WHEN mrp_minor>0 THEN 100.0*(mrp_minor-price_minor)/mrp_minor ELSE 0 END) DESC,id);
CREATE INDEX IF NOT EXISTS shop_order_item_variant ON shop_order_items(variant_id,order_id);
