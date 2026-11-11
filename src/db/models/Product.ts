import mongoose, { type HydratedDocument, type Model, type Types as MongooseTypes } from 'mongoose';

const { Schema, model, models } = mongoose;

export const FASHION_CATEGORIES = [
  'Apparel',
  'Shirts & Tops',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Accessories',
  'Footwear',
  'Suits',
  'Activewear',
  'Swimwear',
  'Jumpsuits',
  'Underwear',
  'Jewelry',
  'Bags',
  'Hats',
  'Denim',
  'Shirts',
  'T-Shirts',
  'Jeans',
  "Men's Fashion",
  "Women's Fashion",
  "Kids' Fashion",
  'Home & Lifestyle',
  'Electronics',
  'Beauty',
  'Food & Beverage',
  'Collectibles',
  'Other Product',
] as const;

export const PRODUCT_STATUSES = ['In Stock', 'Out of Stock'] as const;
export const PRODUCT_CURRENCIES = ['USD', 'INR'] as const;

export type ProductCategory = (typeof FASHION_CATEGORIES)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type ProductCurrency = (typeof PRODUCT_CURRENCIES)[number];

export interface ProductVariant {
  size?: string;
  color?: string;
  quantity: number;
}

export interface ProductDocument {
  sellerId: MongooseTypes.ObjectId;
  storeId: MongooseTypes.ObjectId;
  name: string;
  category: ProductCategory;
  subcategory?: string;
  brand?: string;
  color?: string;
  secondaryColor?: string;
  pattern?: string;
  gender?: string;
  occasion?: string;
  style?: string;
  price: number;
  compareAtPrice?: number;
  currency: ProductCurrency;
  images: string[];
  variants: ProductVariant[];
  totalStock: number;
  status: ProductStatus;
  description?: string;
  sku?: string;
  tags: string[];
  attributes: Map<string, string>;
  badges: string[];
  aiMetadata?: Record<string, unknown>;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariant>(
  {
    size: { type: String, trim: true, maxlength: 40 },
    color: { type: String, trim: true, maxlength: 60 },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000,
      validate: {
        validator: (value: number): boolean => Number.isFinite(value) && Number.isInteger(value) && value >= 0,
        message: 'Variant quantity must be a finite non-negative integer',
      },
    },
  },
  { _id: true, strict: 'throw' },
);

const productSchema = new Schema<ProductDocument>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
      immutable: true,
    },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    category: { type: String, required: true, enum: FASHION_CATEGORIES, index: true },
    subcategory: { type: String, trim: true, maxlength: 100 },
    brand: { type: String, trim: true, maxlength: 100 },
    color: { type: String, trim: true, maxlength: 60 },
    secondaryColor: { type: String, trim: true, maxlength: 60 },
    pattern: { type: String, trim: true, maxlength: 100 },
    gender: { type: String, trim: true, maxlength: 40 },
    occasion: { type: String, trim: true, maxlength: 80 },
    style: { type: String, trim: true, maxlength: 100 },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 10_000_000,
      validate: {
        validator: (value: number): boolean => Number.isFinite(value) && value >= 0,
        message: 'Price must be a finite non-negative number',
      },
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      max: 10_000_000,
      validate: {
        validator: (value: number): boolean => Number.isFinite(value) && value >= 0,
        message: 'compareAtPrice must be a finite non-negative number',
      },
    },
    currency: { type: String, enum: PRODUCT_CURRENCIES, default: 'USD' },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]): boolean =>
          value.length <= 10 && value.every((url) => /^https:\/\/[^\s]+$/i.test(url) && url.length <= 2_000),
        message: 'Products may contain at most 10 HTTPS image URLs',
      },
    },
    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator: (value: ProductVariant[]): boolean => value.length <= 100,
        message: 'A product may contain at most 100 variants',
      },
    },
    totalStock: {
      type: Number,
      required: true,
      min: 0,
      max: 100_000_000,
      default: 0,
      validate: {
        validator: (value: number): boolean => Number.isFinite(value) && Number.isInteger(value) && value >= 0,
        message: 'totalStock must be a finite non-negative integer',
      },
    },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'Out of Stock' },
    description: { type: String, trim: true, maxlength: 5_000 },
    sku: { type: String, trim: true, maxlength: 80 },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]): boolean => value.length <= 50 && value.every((tag) => tag.length <= 80),
        message: 'Products may contain at most 50 tags of 80 characters each',
      },
    },
    attributes: {
      type: Map,
      of: { type: String, maxlength: 120 },
      default: {},
      validate: {
        validator: (value: unknown): boolean => {
          const keys = value instanceof Map
            ? Array.from(value.keys())
            : value && typeof value === 'object' && !Array.isArray(value)
              ? Object.keys(value)
              : [];
          return keys.every((key) => !/^(ownerId|sellerId|verified|isVerified|password|otp|constructor|prototype|__proto__)/i.test(key));
        },
        message: 'High-risk fields are not allowed in attributes',
      },
    },
    // Badges are server-controlled metadata. API write paths intentionally
    // discard client-provided values, but the schema keeps the public field.
    badges: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]): boolean => value.length <= 10 && value.every((badge) => badge.length <= 60),
        message: 'Products may contain at most 10 badges of 60 characters each',
      },
    },
    aiMetadata: {
      type: Schema.Types.Mixed,
      default: undefined,
      validate: {
        validator: (value: unknown): boolean => value === undefined || JSON.stringify(value).length <= 20_000,
        message: 'AI metadata is too large',
      },
    },
    isArchived: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

productSchema.pre('validate', function calculateDerivedInventory() {
  const product = this as ProductDocument;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  product.totalStock = variants.reduce((sum, variant) => sum + (Number.isFinite(variant.quantity) ? variant.quantity : 0), 0);
  product.status = product.totalStock > 0 ? 'In Stock' : 'Out of Stock';
});

productSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.index({ storeId: 1, createdAt: -1 });

export type ProductModel = Model<ProductDocument>;
export type ProductRecord = HydratedDocument<ProductDocument>;

export const Product: ProductModel =
  (models.Product as ProductModel | undefined) || model<ProductDocument>('Product', productSchema);
