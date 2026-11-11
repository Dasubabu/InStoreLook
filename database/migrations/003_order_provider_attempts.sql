-- The migration runner skips this statement when the column already exists in
-- a newer unversioned development database. Historical order rows are retained.
ALTER TABLE shop_orders ADD COLUMN provider_attempts INTEGER NOT NULL DEFAULT 0;
