import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });

// Ensure tables exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    shop_name TEXT,
    shop_category TEXT,
    shop_address TEXT,
    is_store_open INTEGER DEFAULT 1,
    logo TEXT,
    banner TEXT,
    gst_number TEXT,
    business_registration TEXT,
    working_hours TEXT,
    social_links TEXT,
    pickup_address TEXT,
    return_policy TEXT,
    created_at INTEGER
  );
  
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

const migrations = [
  "ALTER TABLE users ADD COLUMN latitude REAL;",
  "ALTER TABLE users ADD COLUMN longitude REAL;",
  "ALTER TABLE users ADD COLUMN formatted_address TEXT;",
  "ALTER TABLE users ADD COLUMN city TEXT;",
  "ALTER TABLE users ADD COLUMN district TEXT;",
  "ALTER TABLE users ADD COLUMN state TEXT;",
  "ALTER TABLE users ADD COLUMN postal_code TEXT;",
  "ALTER TABLE users ADD COLUMN country TEXT;",
  "ALTER TABLE users ADD COLUMN location_verified INTEGER DEFAULT 0;",
  "ALTER TABLE products ADD COLUMN subcategory TEXT;",
  "ALTER TABLE products ADD COLUMN brand TEXT;",
  "ALTER TABLE products ADD COLUMN is_local_brand INTEGER DEFAULT 0;",
  "ALTER TABLE products ADD COLUMN color TEXT;",
  "ALTER TABLE products ADD COLUMN secondary_color TEXT;",
  "ALTER TABLE products ADD COLUMN pattern TEXT;",
  "ALTER TABLE products ADD COLUMN sleeve_type TEXT;",
  "ALTER TABLE products ADD COLUMN collar_type TEXT;",
  "ALTER TABLE products ADD COLUMN gender TEXT;",
  "ALTER TABLE products ADD COLUMN occasion TEXT;",
  "ALTER TABLE products ADD COLUMN style TEXT;",
  "ALTER TABLE products ADD COLUMN product_type TEXT;",
  "ALTER TABLE products ADD COLUMN mrp REAL;",
  "ALTER TABLE products ADD COLUMN ai_metadata TEXT;",
  "ALTER TABLE users ADD COLUMN logo TEXT;",
  "ALTER TABLE users ADD COLUMN banner TEXT;",
  "ALTER TABLE users ADD COLUMN gst_number TEXT;",
  "ALTER TABLE users ADD COLUMN business_registration TEXT;",
  "ALTER TABLE users ADD COLUMN working_hours TEXT;",
  "ALTER TABLE users ADD COLUMN social_links TEXT;",
  "ALTER TABLE users ADD COLUMN pickup_address TEXT;",
  "ALTER TABLE users ADD COLUMN return_policy TEXT;",
  "ALTER TABLE products ADD COLUMN images TEXT;",
  "ALTER TABLE products ADD COLUMN age_group TEXT;",
  "ALTER TABLE products ADD COLUMN sku TEXT;",
  "ALTER TABLE products ADD COLUMN barcode TEXT;",
  "ALTER TABLE products ADD COLUMN fabric_type TEXT;",
  "ALTER TABLE products ADD COLUMN material_composition TEXT;",
  "ALTER TABLE products ADD COLUMN fit TEXT;",
  "ALTER TABLE products ADD COLUMN season TEXT;",
  "ALTER TABLE products ADD COLUMN country_of_origin TEXT;",
  "ALTER TABLE products ADD COLUMN wash_instructions TEXT;",
  "ALTER TABLE products ADD COLUMN iron_instructions TEXT;",
  "ALTER TABLE products ADD COLUMN drying_instructions TEXT;",
  "ALTER TABLE products ADD COLUMN tags TEXT;",
  "ALTER TABLE products ADD COLUMN is_archived INTEGER DEFAULT 0;",
  "ALTER TABLE users ADD COLUMN owner_name TEXT;",
  "ALTER TABLE users ADD COLUMN whatsapp_number TEXT;",
  "ALTER TABLE products ADD COLUMN manufacturer TEXT;",
  "ALTER TABLE products ADD COLUMN company TEXT;",
  "ALTER TABLE products ADD COLUMN collection TEXT;",
  "ALTER TABLE products ADD COLUMN neck_type TEXT;",
  "ALTER TABLE products ADD COLUMN length TEXT;",
  "ALTER TABLE products ADD COLUMN weight TEXT;",
  "ALTER TABLE products ADD COLUMN package_contents TEXT;",
  "ALTER TABLE products ADD COLUMN discount REAL;",
  "ALTER TABLE products ADD COLUMN gst_percentage REAL;",
  "ALTER TABLE products ADD COLUMN moq INTEGER DEFAULT 1;",
  "ALTER TABLE products ADD COLUMN max_oq INTEGER;",
  "ALTER TABLE products ADD COLUMN thread_count TEXT;",
  "ALTER TABLE products ADD COLUMN stretchability TEXT;",
  "ALTER TABLE products ADD COLUMN thickness TEXT;",
  "ALTER TABLE products ADD COLUMN transparency TEXT;",
  "ALTER TABLE products ADD COLUMN texture TEXT;",
  "ALTER TABLE products ADD COLUMN manufacture_date TEXT;",
  "ALTER TABLE products ADD COLUMN expiry TEXT;",
  "ALTER TABLE products ADD COLUMN premium_score INTEGER;",
  "ALTER TABLE products ADD COLUMN comfort_score INTEGER;",
  "ALTER TABLE products ADD COLUMN estimated_life TEXT;",
  "ALTER TABLE products ADD COLUMN ai_premium_summary TEXT;",
  "ALTER TABLE products ADD COLUMN badges TEXT;"
];

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS product_sizes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    size_label TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

for (const query of migrations) {
  try {
    sqlite.exec(query);
  } catch (e) {
    // Ignore error if column already exists
  }
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    seller_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    is_local_brand INTEGER DEFAULT 0,
    color TEXT,
    secondary_color TEXT,
    pattern TEXT,
    sleeve_type TEXT,
    collar_type TEXT,
    gender TEXT,
    occasion TEXT,
    style TEXT,
    product_type TEXT,
    price REAL NOT NULL,
    mrp REAL,
    stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'In Stock',
    image_url TEXT,
    images TEXT,
    description TEXT,
    ai_metadata TEXT,
    age_group TEXT,
    sku TEXT,
    barcode TEXT,
    fabric_type TEXT,
    material_composition TEXT,
    fit TEXT,
    season TEXT,
    country_of_origin TEXT,
    wash_instructions TEXT,
    iron_instructions TEXT,
    drying_instructions TEXT,
    tags TEXT,
    is_archived INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );
`);

// Auto-seed sample stores & rich products catalog if empty or outdated
try {
  // Ensure the required seed users exist before inserting products that reference them
  sqlite.exec(`
    INSERT OR IGNORE INTO users (id, name, email, phone, shop_name, shop_category, shop_address, is_store_open, created_at) VALUES
    ('u-levi-1', 'Levi Official', 'store@levis.com', '+919900011122', 'Levi''s Store', 'Fashion & Apparel', 'Road No. 36, Jubilee Hills, Hyderabad', 1, 1680000000),
    ('u-denim-2', 'Denim Hub', 'contact@denimhub.com', '+919900011123', 'Denim World', 'Fashion & Apparel', 'Madhapur Main Rd, Hyderabad', 1, 1680000000),
    ('u-urban-3', 'Urban Threads', 'hello@urbanthreads.com', '+919900011124', 'Urban Threads Boutique', 'Fashion & Apparel', 'Hitech City, Hyderabad', 1, 1680000000),
    ('u-zara-4', 'Zara Fashion', 'support@zara.com', '+919900011125', 'Zara Local Store', 'Fashion & Apparel', 'Forum Mall, Kukatpally, Hyderabad', 1, 1680000000);
  `);

  const productCount = Number((sqlite.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number }).count || 0);
  if (productCount === 0) sqlite.exec(`
    INSERT INTO products (id, seller_id, name, category, subcategory, brand, price, mrp, stock, status, image_url, description, created_at) VALUES
    ('p-jeans-1', 'u-levi-1', 'Slim Fit Dark Denim Jeans', 'Men''s Fashion', 'Jeans', 'Levi''s', 1999, 3499, 12, 'In Stock', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=600', 'Classic dark indigo denim jeans with a slim tapered fit, crafted from premium stretch cotton.', 1680000000),
    ('p-jeans-2', 'u-denim-2', 'Black Tapered Cargo Jeans', 'Men''s Fashion', 'Jeans', 'Denim World', 2299, 3999, 8, 'In Stock', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=600', 'Urban utility cargo denim jeans featuring multiple utility pockets and a modern relaxed tapered fit.', 1680000000),
    ('p-jeans-3', 'u-urban-3', 'Vintage Distressed Wide-Leg Jeans', 'Men''s Fashion', 'Jeans', 'Urban Threads', 2499, 4299, 15, 'In Stock', 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&q=80&w=600', 'Gen Z oversized wide-leg denim jeans with subtle distressing and a vintage stonewash look.', 1680000000),
    ('p-jeans-4', 'u-levi-1', 'Classic Straight Cut Light Blue Jeans', 'Men''s Fashion', 'Jeans', 'Levi''s', 1799, 2999, 20, 'In Stock', 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&q=80&w=600', 'Timeless light blue wash straight-fit jeans for everyday casual street style.', 1680000000),
    ('p-shirt-1', 'u-zara-4', 'Blue Checked Casual Cotton Shirt', 'Men''s Fashion', 'Shirts', 'Zara', 1299, 2199, 10, 'In Stock', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600', 'Breathable 100% cotton casual shirt featuring a modern windowpane check pattern.', 1680000000),
    ('p-shirt-2', 'u-urban-3', 'Black Linen Oversized Shirt', 'Men''s Fashion', 'Shirts', 'Urban Threads', 1499, 2599, 6, 'In Stock', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=600', 'Lightweight black linen shirt with a relaxed drop-shoulder summer fit.', 1680000000),
    ('p-tee-1', 'u-urban-3', 'Minimalist Graphic Print T-Shirt', 'Men''s Fashion', 'T-Shirts', 'Urban Threads', 799, 1499, 25, 'In Stock', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600', '240 GSM heavy cotton t-shirt with subtle chest typography.', 1680000000),
    ('p-[#00685f]-1', 'u-zara-4', 'Retro White Leather Sneakers', 'Accessories', 'Footwear', 'Zara', 2999, 4999, 14, 'In Stock', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600', 'Clean low-top white leather sneakers with padded collar and durable rubber cupsole.', 1680000000);
  `);
} catch (e) {
  console.error("Seeding warning:", e);
}
