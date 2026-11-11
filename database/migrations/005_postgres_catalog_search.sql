-- Replace only derived search data, after 004 has backfilled canonical terms.
-- array_to_tsvector keeps the exact normalized lexemes shared with SQLite,
-- including one-letter sizes, Unicode fabric names, and colors on variants.
DROP INDEX IF EXISTS shop_product_search_gin;
ALTER TABLE shop_products DROP COLUMN IF EXISTS search_document;
ALTER TABLE shop_products ADD COLUMN search_document tsvector
 GENERATED ALWAYS AS (array_to_tsvector(string_to_array(trim(search_terms), ' '))) STORED;
CREATE INDEX shop_product_search_gin ON shop_products USING GIN(search_document);
