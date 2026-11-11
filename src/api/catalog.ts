import mongoose from 'mongoose';

const { Types } = mongoose;
import {
  DEMO_PRODUCTS,
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
  getProduct,
  getShop,
  getShops,
  filterProducts,
  listProducts,
  type DemoProduct,
  type DemoStore,
  type ProductQuery,
} from '../lib/demoCatalog.js';
import { connectMongo, getCatalogSource, MongoConfigurationError, MongoUnavailableError } from '../db/mongo.js';
import { Product, type ProductDocument } from '../db/models/Product.js';
import { Store, type StoreDocument } from '../db/models/Store.js';

export type CatalogSort = 'newest' | 'oldest' | 'priceAsc' | 'priceDesc';

export interface PublicProductQuery extends ProductQuery {
  sort?: string;
  storeId?: string;
}

export interface ProductPageResponse {
  data: Record<string, unknown>[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class CatalogError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'CatalogError';
    this.status = status;
    this.code = code;
  }
}

function mongoUnavailable(error: unknown): CatalogError {
  if (error instanceof MongoConfigurationError && error.code === 'MONGODB_NOT_CONFIGURED') {
    return new CatalogError(503, 'MONGODB_NOT_CONFIGURED', error.message);
  }
  if (error instanceof MongoConfigurationError && error.code === 'INVALID_CATALOG_SOURCE') {
    return new CatalogError(500, error.code, error.message);
  }
  if (error instanceof MongoUnavailableError) {
    return new CatalogError(
      503,
      'MONGODB_UNAVAILABLE',
      'MongoDB is unavailable. Check the MongoDB deployment and MONGODB_URI.',
    );
  }
  return new CatalogError(503, 'MONGODB_UNAVAILABLE', 'MongoDB is unavailable. Try again later.');
}

async function useMongo<T>(operation: () => Promise<T>): Promise<T> {
  try {
    await connectMongo();
    return await operation();
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw mongoUnavailable(error);
  }
}

function numberValue(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function pageValue(value: unknown, fallback: number, max?: number): number {
  const number = Math.floor(numberValue(value, fallback));
  if (number < 1) return fallback;
  return max ? Math.min(number, max) : number;
}

function normaliseStatus(value: unknown): string | undefined {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!status || status === 'all') return undefined;
  if (status === 'in stock') return 'In Stock';
  if (status === 'out of stock') return 'Out of Stock';
  throw new CatalogError(400, 'INVALID_STATUS', 'status must be In Stock, Out of Stock, or All.');
}

function normaliseSort(value: unknown): CatalogSort {
  const sort = typeof value === 'string' ? value.trim() : '';
  if (!sort || sort === 'newest' || sort === 'createdAt' || sort === '-createdAt') return 'newest';
  if (sort === 'oldest' || sort === 'createdAtAsc') return 'oldest';
  if (sort === 'priceAsc' || sort === 'price:asc') return 'priceAsc';
  if (sort === 'priceDesc' || sort === 'price:desc') return 'priceDesc';
  throw new CatalogError(400, 'INVALID_SORT', 'sort must be newest, oldest, priceAsc, or priceDesc.');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function idString(value: unknown): string {
  if (value == null) return '';
  const nested = value && typeof value === 'object' && '_id' in value ? (value as { _id: unknown })._id : value;
  return nested == null ? '' : String(nested);
}

function safeDate(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  const date = new Date(String(value || ''));
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function mapAttributes(value: unknown): Record<string, string> {
  if (value instanceof Map) return Object.fromEntries(value.entries()) as Record<string, string>;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  return Object.fromEntries(entries);
}

export function publicStore(store: Partial<StoreDocument> & { _id?: unknown }): Record<string, unknown> {
  const address = store.address || {};
  const coordinates = store.location?.coordinates;
  const workingHours = (store.hours || [])
    .map((hours) => {
      if (hours.closed) return `${hours.day}: closed`;
      return `${hours.day}: ${hours.open || 'open'}–${hours.close || 'close'}`;
    })
    .join('; ');

  return {
    id: idString(store._id),
    name: store.name || '',
    shopName: store.name || '',
    shopCategory: store.category || '',
    shopAddress: address.formatted || address.line1 || '',
    formattedAddress: address.formatted || address.line1 || '',
    city: address.city || null,
    district: address.district || null,
    state: address.state || null,
    postalCode: address.postalCode || null,
    country: address.country || null,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
    logo: store.logo || null,
    banner: store.banner || null,
    workingHours: workingHours || null,
    hours: Array.isArray(store.hours) ? store.hours.map((hours) => ({ ...hours })) : [],
    isStoreOpen: Boolean(store.isOpen),
    badges: Array.isArray(store.badges) ? [...store.badges] : [],
  };
}

function publicProduct(
  product: Partial<ProductDocument> & { _id?: unknown },
  store?: Partial<StoreDocument> & { _id?: unknown } | null,
  detail = false,
): Record<string, unknown> {
  const id = idString(product._id);
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const totalStock = Number.isFinite(product.totalStock) ? Number(product.totalStock) : 0;
  const price = Number(product.price || 0);
  const compareAtPrice = product.compareAtPrice == null ? null : Number(product.compareAtPrice);
  const createdAt = safeDate(product.createdAt);
  const variants = (product.variants || []).map((variant, index) => ({
    id: idString((variant as { _id?: unknown })._id) || `${id}-variant-${index + 1}`,
    productId: id,
    sizeLabel: variant.size || variant.color || 'One Size',
    size: variant.size || null,
    color: variant.color || null,
    stockQuantity: variant.quantity,
  }));

  const response: Record<string, unknown> = {
    id,
    name: product.name || '',
    category: product.category || null,
    subcategory: product.subcategory || null,
    brand: product.brand || null,
    color: product.color || null,
    secondaryColor: product.secondaryColor || null,
    pattern: product.pattern || null,
    gender: product.gender || null,
    occasion: product.occasion || null,
    style: product.style || null,
    price,
    mrp: compareAtPrice,
    compareAtPrice,
    // InStoreLook's customer storefront is currently India-first. Keep public
    // display consistent even when older Mongo records omitted currency.
    currency: 'INR',
    stock: totalStock,
    totalStock,
    status: product.status || (totalStock > 0 ? 'In Stock' : 'Out of Stock'),
    imageUrl: images[0] || null,
    images,
    description: product.description || null,
    sku: product.sku || null,
    tags: Array.isArray(product.tags) ? [...product.tags] : [],
    attributes: mapAttributes(product.attributes),
    badges: Array.isArray(product.badges) ? [...product.badges] : [],
    createdAt,
    lastUpdatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : null,
    storeId: product.storeId ? idString(product.storeId) : null,
  };

  if (detail) {
    response.sizes = variants;
    response.variants = variants;
    response.seller = store ? publicStore(store) : null;
  }

  return response;
}

function sortDemoProducts(products: DemoProduct[], sort: CatalogSort): DemoProduct[] {
  return [...products].sort((left, right) => {
    if (sort === 'priceAsc') return left.price - right.price;
    if (sort === 'priceDesc') return right.price - left.price;
    if (sort === 'oldest') return left.createdAt - right.createdAt;
    return right.createdAt - left.createdAt;
  });
}

function publicDemoStore(store: DemoStore): Record<string, unknown> {
  return {
    id: store.id,
    name: store.name,
    shopName: store.shopName,
    shopCategory: store.shopCategory,
    shopAddress: store.shopAddress,
    formattedAddress: store.formattedAddress,
    city: store.city,
    district: store.district,
    state: store.state,
    postalCode: store.postalCode,
    latitude: store.latitude,
    longitude: store.longitude,
    logo: store.logo,
    banner: store.banner,
    workingHours: store.workingHours,
    isStoreOpen: store.isStoreOpen,
    badges: [],
    locationVerified: store.locationVerified,
  };
}

function publicDemoProduct(product: DemoProduct, detail = false): Record<string, unknown> {
  const safe: Record<string, unknown> = { ...product };
  delete safe.sellerId;
  if (detail) {
    const details = getProduct(product.id);
    safe.seller = details ? publicDemoStore(details.seller) : null;
    safe.sizes = details?.sizes || [];
  }
  return safe;
}

export async function listPublicProducts(query: PublicProductQuery = {}): Promise<ProductPageResponse> {
  const source = getCatalogSource();
  const sort = normaliseSort(query.sort);
  const safePage = pageValue(query.page, 1);
  const safeLimit = pageValue(query.limit, 20, 100);

  if (source === 'demo') {
    if ((query.sort == null || query.sort === '') && !query.storeId) {
      const current = listProducts(query);
      return {
        data: current.data as unknown as Record<string, unknown>[],
        page: current.page,
        limit: current.limit,
        total: current.total,
        totalPages: current.totalPages,
      };
    }
    const filtered = filterProducts(
      query.storeId ? DEMO_PRODUCTS.filter((product) => product.sellerId === query.storeId) : DEMO_PRODUCTS,
      query,
    );
    const data = sortDemoProducts(filtered, sort);
    const start = (safePage - 1) * safeLimit;
    return {
      data: data.slice(start, start + safeLimit) as unknown as Record<string, unknown>[],
      page: safePage,
      limit: safeLimit,
      total: data.length,
      totalPages: data.length ? Math.ceil(data.length / safeLimit) : 0,
    };
  }

  const advancedKeys = ['gender', 'brand', 'minPrice', 'maxPrice', 'size', 'color', 'occasion', 'minDiscount'] as const;
  if (advancedKeys.some(key => query[key] !== undefined && query[key] !== '' && String(query[key]).toLowerCase() !== 'all')) {
    throw new CatalogError(400, 'SAMPLE_FILTERS_ONLY', 'Advanced filters are sample-catalog only. Live inventory supports search, category, availability and sort.');
  }
  return useMongo(async () => {
    const filter: Record<string, unknown> = { isArchived: false };
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    if (search) {
      const expression = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      filter.$or = [
        { name: expression },
        { brand: expression },
        { description: expression },
        { tags: expression },
      ];
    }
    if (query.category && query.category.trim() && query.category.trim().toLowerCase() !== 'all') {
      filter.category = query.category.trim();
    }
    const status = normaliseStatus(query.status);
    if (status) filter.status = status;
    if (query.storeId) {
      if (!Types.ObjectId.isValid(query.storeId)) {
        throw new CatalogError(400, 'INVALID_STORE_ID', 'storeId must be a valid store id.');
      }
      filter.storeId = query.storeId;
    }

    const sortValue: Record<string, 1 | -1> =
      sort === 'priceAsc'
        ? { price: 1, createdAt: -1 }
        : sort === 'priceDesc'
          ? { price: -1, createdAt: -1 }
          : sort === 'oldest'
            ? { createdAt: 1 }
            : { createdAt: -1 };
    const [documents, total] = await Promise.all([
      Product.find(filter)
        .sort(sortValue)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return {
      data: documents.map((document) => publicProduct(document)),
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total ? Math.ceil(total / safeLimit) : 0,
    };
  });
}

export async function getPublicProduct(id: string): Promise<Record<string, unknown> | undefined> {
  const source = getCatalogSource();
  if (source === 'demo') {
    const product = getProduct(id);
    return product ? publicDemoProduct(product, true) : undefined;
  }
  if (!Types.ObjectId.isValid(id)) return undefined;

  return useMongo(async () => {
    const product = await Product.findOne({ _id: id, isArchived: false }).lean();
    if (!product) return undefined;
    const store = await Store.findById(product.storeId).lean();
    return publicProduct(product, store, true);
  });
}

export async function listPublicStores(): Promise<Record<string, unknown>[]> {
  const source = getCatalogSource();
  if (source === 'demo') return getShops().map(publicDemoStore);
  return useMongo(async () => {
    const stores = await Store.find({}).sort({ createdAt: -1 }).limit(100).lean();
    return stores.map((store) => publicStore(store));
  });
}

export async function getPublicStore(id: string): Promise<
  { shop: Record<string, unknown>; products: Record<string, unknown>[] } | undefined
> {
  const source = getCatalogSource();
  if (source === 'demo') {
    const details = getShop(id);
    return details
      ? {
          shop: publicDemoStore(details.shop),
          products: details.products.map((product) => publicDemoProduct(product)),
        }
      : undefined;
  }
  if (!Types.ObjectId.isValid(id)) return undefined;

  return useMongo(async () => {
    const store = await Store.findById(id).lean();
    if (!store) return undefined;
    const products = await Product.find({ storeId: id, isArchived: false }).sort({ createdAt: -1 }).limit(100).lean();
    return {
      shop: publicStore(store),
      products: products.map((product) => publicProduct(product)),
    };
  });
}

export async function listNearbyStores(latitude: number, longitude: number, radiusMeters = 25_000): Promise<Record<string, unknown>[]> {
  const lat = numberValue(latitude, Number.NaN);
  const lng = numberValue(longitude, Number.NaN);
  const radius = Math.min(Math.max(numberValue(radiusMeters, 25_000), 1), 100_000);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new CatalogError(400, 'INVALID_LOCATION', 'latitude and longitude must be valid coordinates.');
  }

  const source = getCatalogSource();
  if (source === 'demo') {
    const stores = getShops();
    return stores
      .map((store) => ({
        store,
        distanceMeters:
          111_320 * Math.sqrt(Math.pow(store.latitude - lat, 2) + Math.pow((store.longitude - lng) * Math.cos((lat * Math.PI) / 180), 2)),
      }))
      .filter(({ distanceMeters }) => distanceMeters <= radius)
      .sort((left, right) => left.distanceMeters - right.distanceMeters)
      .map(({ store, distanceMeters }) => ({ ...publicDemoStore(store), distanceMeters }));
  }

  return useMongo(async () => {
    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          spherical: true,
          maxDistance: radius,
          key: 'location',
        },
      },
      { $limit: 100 },
    ]);
    return stores.map((store) => ({ ...publicStore(store), distanceMeters: store.distanceMeters }));
  });
}

export async function listNearbyPublicProducts(
  latitude: number,
  longitude: number,
  radiusMeters = 25_000,
): Promise<Record<string, unknown>[]> {
  const stores = await listNearbyStores(latitude, longitude, radiusMeters);
  const products: Record<string, unknown>[] = [];
  for (const store of stores) {
    const storeId = typeof store.id === 'string' ? store.id : undefined;
    if (!storeId) continue;
    const page = await listPublicProducts({ storeId, limit: 100, sort: 'newest' });
    for (const product of page.data) {
      products.push({
        ...product,
        shop: store.shopName || store.name,
        distanceMeters: store.distanceMeters,
        distanceMiles: typeof store.distanceMeters === 'number' ? store.distanceMeters / 1_609.344 : undefined,
      });
    }
  }
  return products;
}

export async function getFeaturedPublicProducts(limit = 10): Promise<Record<string, unknown>[]> {
  const safeLimit = pageValue(limit, 10, 100);
  if (getCatalogSource() === 'demo') return getFeaturedProducts(safeLimit) as unknown as Record<string, unknown>[];
  const page = await listPublicProducts({ limit: safeLimit, sort: 'newest' });
  return page.data;
}

export async function getNewArrivalPublicProducts(limit = 15): Promise<Record<string, unknown>[]> {
  const safeLimit = pageValue(limit, 15, 100);
  if (getCatalogSource() === 'demo') return getNewArrivals(safeLimit) as unknown as Record<string, unknown>[];
  const page = await listPublicProducts({ limit: safeLimit, sort: 'newest' });
  return page.data;
}

export async function getPublicCategories(): Promise<string[]> {
  if (getCatalogSource() === 'demo') return getCategories();
  return useMongo(async () => (await Product.distinct('category', { isArchived: false })).filter(Boolean).sort());
}

export function errorResponse(error: unknown): { status: number; body: { error: { code: string; message: string } } } {
  if (error instanceof CatalogError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  if (error instanceof MongoConfigurationError) {
    return {
      status: error.code === 'MONGODB_NOT_CONFIGURED' ? 503 : 500,
      body: { error: { code: error.code, message: error.message } },
    };
  }
  if (error instanceof MongoUnavailableError) {
    return {
      status: 503,
      body: { error: { code: 'MONGODB_UNAVAILABLE', message: 'MongoDB is unavailable. Try again later.' } },
    };
  }
  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Request failed.' } } };
}
