// Customer-facing API client for InStoreLook.
// Wraps the existing /api/customer/* routes and normalises the raw DB rows
// (several columns are stored as JSON strings) into friendly shapes.
import { shopApi } from '../commerce/client';
import type { PlacesCapabilities } from '../api/places';
export type { PlacesCapabilities } from '../api/places';

export interface Product {
  id: string;
  sellerId?: string | null;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  isLocalBrand?: boolean | null;
  color?: string | null;
  secondaryColor?: string | null;
  pattern?: string | null;
  gender?: string | null;
  occasion?: string | null;
  style?: string | null;
  price: number;
  mrp?: number | null;
  /** The customer experience is India-first and displays prices in INR. */
  currency?: 'USD' | 'INR' | null;
  stock?: number | null;
  status?: 'In Stock' | 'Out of Stock' | null;
  imageUrl?: string | null;
  images?: string[]; // parsed
  description?: string | null;
  fabricType?: string | null;
  materialComposition?: string | null;
  fit?: string | null;
  season?: string | null;
  ageGroup?: string | null;
  sku?: string | null;
  discount?: number | null;
  premiumScore?: number | null;
  comfortScore?: number | null;
  aiPremiumSummary?: string | null;
  badges?: string[]; // parsed
  tags?: string[]; // parsed
  createdAt?: number | null;
  lastUpdatedAt?: string | null;
  liveViewers?: number | null;
  sizes?: ProductSize[];
  inventorySource?: 'sample' | 'live';
  inventoryVerified?: boolean;
}

export interface Store {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  shopName?: string | null;
  shopCategory?: string | null;
  shopAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  postalCode?: string | null;
  logo?: string | null;
  banner?: string | null;
  ownerName?: string | null;
  whatsappNumber?: string | null;
  workingHours?: string | null;
  isStoreOpen?: boolean | null;
  locationVerified?: boolean | null;
  distanceMiles?: number | null;
  distanceMeters?: number;
  inventorySource?: 'sample' | 'live';
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  source: string;
  directionsUrl: string;
  openingHours?: string;
  verified?: false;
}

export interface PlaceSearchResult { id: string; label: string; latitude: number; longitude: number }

export interface ProductSize {
  id: string;
  productId: string;
  sizeLabel: string;
  stockQuantity: number;
}

export interface ProductDetail extends Product {
  seller?: Store | null;
  sizes?: ProductSize[];
}

// Missing imagery stays a neutral placeholder instead of depicting another product.
const IMAGE_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="#f1f0ea"/><text x="300" y="375" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#73736c">Image unavailable</text></svg>')}`;

/** Signature retained for existing callers; never substitutes an unrelated item. */
export function fallbackImage(_seed: string): string { return IMAGE_PLACEHOLDER; }

export function storeBanner(store: Pick<Store, 'id' | 'banner'>): string {
  return store.banner || IMAGE_PLACEHOLDER;
}

/** Best available product image, otherwise a neutral placeholder. */
export function productImage(p: Product): string {
  return p.imageUrl || p.images?.[0] || fallbackImage(p.id || p.name || 'x');
}

/** Discount percentage derived from mrp vs price (or explicit discount field). */
export function discountPct(p: Product): number {
  if (p.discount && p.discount > 0) return Math.round(p.discount);
  if (p.mrp && p.mrp > p.price) return Math.round(((p.mrp - p.price) / p.mrp) * 100);
  return 0;
}

/**
 * Indian sample and retailer prices are displayed consistently in INR.
 */
export function formatPrice(product: Pick<Product, 'price' | 'currency'> | number): string {
  const amount = typeof product === 'number' ? product : product.price;
  const currency = 'INR';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseJsonArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Comma-separated fallback
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return undefined;
}

function normaliseProduct(raw: any): Product {
  const inferredCurrency = 'INR';
  return {
    ...raw,
    currency: inferredCurrency,
    images: parseJsonArray(raw?.images),
    badges: parseJsonArray(raw?.badges),
    tags: parseJsonArray(raw?.tags),
  } as Product;
}

async function getJson(url: string, options: { signal?: AbortSignal; cache?: RequestCache } = {}): Promise<any> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 25_000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: options.cache });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || `Request failed (${res.status})`);
    return json;
  } catch (error) {
    if (timedOut) throw new Error('The request timed out. Please retry.');
    throw error;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
  storeId?: string;
  gender?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  occasion?: string;
  minDiscount?: number;
  fabric?: string;
  fit?: string;
  pattern?: string;
  minRating?: number;
}

export interface ProductsPage {
  data: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  catalogSource: 'sample' | 'live';
}

async function productsPage(q: ProductsQuery = {}): Promise<ProductsPage> {
  if (q.storeId) {
    // Legacy store assortments have a separate source; never silently ignore scope.
    const params = new URLSearchParams(Object.entries(q).filter(([, value]) => value !== undefined && value !== 'All').map(([key, value]) => [key, String(value)]));
    const result = await getJson(`/api/customer/products?${params}`);
    return { ...result, data: result.data.map(normaliseProduct) };
  }
  const clean = Object.fromEntries(Object.entries(q).filter(([, value]) => value !== undefined && value !== '' && value !== 'All'));
  if (clean.sort === 'priceAsc') clean.sort = 'price_asc';
  if (clean.sort === 'priceDesc') clean.sort = 'price_desc';
  const result = await shopApi.products(clean);
  return { ...result, data: result.data.map(normaliseProduct) };
}

export const customerApi = {
  productsPage,
  async products(q: ProductsQuery = {}): Promise<Product[]> {
    return (await productsPage(q)).data;
  },

  async featured(): Promise<Product[]> {
    return (await productsPage({ limit: 10, sort: 'newest' })).data;
  },

  async newArrivals(): Promise<Product[]> {
    return (await productsPage({ limit: 15, sort: 'newest' })).data;
  },

  async categories(): Promise<string[]> {
    return (await shopApi.facets()).categories;
  },

  async product(id: string): Promise<ProductDetail> {
    const data = await shopApi.product(id);
    return { ...normaliseProduct(data), sizes: data.sizes || data.variants.map(variant => ({ id: variant.id, productId: data.id, sizeLabel: variant.size, stockQuantity: variant.stock })) };
  },

  async shops(): Promise<Store[]> {
    const json = await getJson('/api/customer/shops');
    return (json.data || []) as Store[];
  },

  async nearbyShops(latitude: number, longitude: number, radiusMeters = 25_000, signal?: AbortSignal): Promise<Store[]> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      radius: String(radiusMeters),
    });
    const json = await getJson(`/api/customer/shops/nearby?${params.toString()}`, { signal, cache: 'no-store' });
    return (json.data || []) as Store[];
  },

  async nearbyPlaces(latitude: number, longitude: number, radiusMeters = 5_000, signal?: AbortSignal): Promise<NearbyPlace[]> {
    const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), radius: String(radiusMeters) });
    const json = await getJson(`/api/customer/places/nearby?${params.toString()}`, { signal, cache: 'no-store' });
    return (json.data || []) as NearbyPlace[];
  },

  async shop(id: string): Promise<{ shop: Store; products: Product[] }> {
    const json = await getJson(`/api/customer/shops/${encodeURIComponent(id)}`);
    return { shop: json.shop, products: (json.products || []).map(normaliseProduct) };
  },
  async placesCapabilities(signal?: AbortSignal): Promise<PlacesCapabilities> {
    const json = await getJson('/api/customer/places/capabilities', { signal, cache: 'no-store' });
    if (!json.data || !['citySearch', 'mapDiscovery', 'mapTiles'].every(key => typeof json.data[key]?.configured === 'boolean' && typeof json.data[key]?.message === 'string')) throw new Error('Location provider settings could not be checked. Please retry.');
    return json.data;
  },
  async searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
    const json = await getJson(`/api/customer/places/search?${new URLSearchParams({ q: query })}`, { signal, cache: 'no-store' });
    return json.data;
  },
};
