import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  phone: text('phone').notNull(),
  shopName: text('shop_name'),
  shopCategory: text('shop_category'),
  shopAddress: text('shop_address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  formattedAddress: text('formatted_address'),
  city: text('city'),
  district: text('district'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  locationVerified: integer('location_verified', { mode: 'boolean' }).default(false),
  isStoreOpen: integer('is_store_open', { mode: 'boolean' }).default(true),
  
  // Store Profile additions
  logo: text('logo'),
  banner: text('banner'),
  ownerName: text('owner_name'),
  gstNumber: text('gst_number'),
  businessRegistration: text('business_registration'),
  whatsappNumber: text('whatsapp_number'),
  workingHours: text('working_hours'),
  socialLinks: text('social_links'), // stored as JSON
  pickupAddress: text('pickup_address'),
  returnPolicy: text('return_policy'),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').references(() => users.id),
  name: text('name').notNull(),
  category: text('category'),
  subcategory: text('subcategory'),
  brand: text('brand'),
  isLocalBrand: integer('is_local_brand', { mode: 'boolean' }).default(false),
  color: text('color'),
  secondaryColor: text('secondary_color'),
  pattern: text('pattern'),
  sleeveType: text('sleeve_type'),
  collarType: text('collar_type'),
  gender: text('gender'),
  occasion: text('occasion'),
  style: text('style'),
  productType: text('product_type'),
  price: real('price').notNull(),
  mrp: real('mrp'),
  stock: integer('stock').default(0),
  status: text('status', { enum: ['In Stock', 'Out of Stock'] }).default('In Stock'),
  imageUrl: text('image_url'),
  images: text('images'), // Stored as JSON string array for 10 mandatory images
  description: text('description'),
  aiMetadata: text('ai_metadata'),
  
  // Extended Product details
  ageGroup: text('age_group'),
  sku: text('sku'),
  barcode: text('barcode'),
  fabricType: text('fabric_type'),
  materialComposition: text('material_composition'),
  fit: text('fit'),
  season: text('season'),
  countryOfOrigin: text('country_of_origin'),
  washInstructions: text('wash_instructions'),
  ironInstructions: text('iron_instructions'),
  dryingInstructions: text('drying_instructions'),
  tags: text('tags'), // Stored as JSON string array
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),

  // Massive Feature Request Additions
  manufacturer: text('manufacturer'),
  company: text('company'),
  collection: text('collection'),
  neckType: text('neck_type'),
  length: text('length'),
  weight: text('weight'),
  packageContents: text('package_contents'),
  discount: real('discount'),
  gstPercentage: real('gst_percentage'),
  moq: integer('moq').default(1),
  maxOq: integer('max_oq'),
  threadCount: text('thread_count'),
  stretchability: text('stretchability'),
  thickness: text('thickness'),
  transparency: text('transparency'),
  texture: text('texture'),
  manufactureDate: text('manufacture_date'),
  expiry: text('expiry'),
  premiumScore: integer('premium_score'),
  comfortScore: integer('comfort_score'),
  estimatedLife: text('estimated_life'),
  aiPremiumSummary: text('ai_premium_summary'),
  badges: text('badges'), // JSON array of badge strings

  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export const productSizes = sqliteTable('product_sizes', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  sizeLabel: text('size_label').notNull(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['low_stock', 'reminder', 'system', 'alert'] }).notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});
