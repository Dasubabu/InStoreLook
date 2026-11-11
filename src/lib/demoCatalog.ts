/** Indian reference assortment. Prices, sizes and stock are illustrative samples,
 * not retailer offers or verified local inventory. */
import { INDIA_IMAGES } from './indiaImages.js';

export type ProductStatus = 'In Stock' | 'Out of Stock';
export interface DemoProductSize { id: string; productId: string; sizeLabel: string; stockQuantity: number }
export interface DemoProduct {
  id: string; sellerId: string; name: string; category: string; subcategory: string;
  brand: string; isLocalBrand: boolean; color: string; secondaryColor?: string;
  pattern: string; gender: string; occasion: string; style: string;
  price: number; mrp: number; currency: 'INR'; stock: number; status: ProductStatus;
  imageUrl: string; images: string[]; description: string; fabricType: string;
  materialComposition: string; fit: string; season: string; ageGroup: string;
  sku: string; discount: number; premiumScore: number; comfortScore: number;
  aiPremiumSummary: string; badges: string[]; tags: string[]; createdAt: number;
  featured?: boolean; newArrival?: boolean; sizes?: DemoProductSize[];
  inventorySource: 'sample'; inventoryVerified: false;
}
export interface DemoStore {
  id: string; name: string; phone: string; email: string; shopName: string;
  shopCategory: string; shopAddress: string; latitude: number; longitude: number;
  formattedAddress: string; city: string; district: string; state: string;
  postalCode: string; logo: string; banner: string; ownerName: string;
  whatsappNumber: string; workingHours: string; isStoreOpen: boolean;
  locationVerified: boolean; inventorySource?: 'sample';
}
export interface DemoProductDetail extends DemoProduct { seller: DemoStore; sizes: DemoProductSize[] }
export interface ProductQuery {
  page?: number | string; limit?: number | string; search?: string; category?: string;
  status?: string; gender?: string; brand?: string; minPrice?: number | string;
  maxPrice?: number | string; size?: string; color?: string; occasion?: string;
  minDiscount?: number | string; sort?: string; storeId?: string;
}
export interface ProductPage { data: DemoProduct[]; page: number; limit: number; total: number; totalPages: number }
export interface ShopDetails { shop: DemoStore; products: DemoProduct[] }

export const CATALOG_CATEGORIES = ['Kurtas', 'Sarees', 'Dresses', 'Shirts', 'Bottoms', 'Footwear'] as const;
export const CATALOG_BRANDS = ['W', "Levi's", 'PUMA'] as const;
export const CATALOG_GENDERS = ['Men', 'Women', 'Unisex'] as const;
export const CATALOG_OCCASIONS = ['Casual', 'Festive', 'Work'] as const;

function sampleStore(id: string, city: string, state: string, latitude: number, longitude: number): DemoStore {
  const name = `${city} reference showroom (sample)`;
  return {
    id, name, shopName: name, shopCategory: 'Illustrative fashion showroom · unverified',
    phone: '', email: '', whatsappNumber: '', ownerName: '', postalCode: '',
    shopAddress: `${city}, ${state}, India · illustrative location, not a verified shop`,
    formattedAddress: `${city}, ${state}, India · sample location`, city, district: city, state,
    latitude, longitude, logo: '', banner: '', workingHours: 'Not verified',
    isStoreOpen: false, locationVerified: false, inventorySource: 'sample',
  };
}
export const DEMO_STORES: readonly DemoStore[] = [
  sampleStore('sample-delhi', 'New Delhi', 'Delhi', 28.6139, 77.2090),
  sampleStore('sample-bengaluru', 'Bengaluru', 'Karnataka', 12.9716, 77.5946),
  sampleStore('sample-mumbai', 'Mumbai', 'Maharashtra', 19.0760, 72.8777),
];

interface ReferenceItem {
  id: string; name: string; category: typeof CATALOG_CATEGORIES[number];
  brand: typeof CATALOG_BRANDS[number]; image: keyof typeof INDIA_IMAGES;
  color: string; gender: typeof CATALOG_GENDERS[number]; occasion: typeof CATALOG_OCCASIONS[number];
  price: number; mrp: number; sizes: string[]; soldOut?: boolean;
}
const references: ReferenceItem[] = [
  { id: 'w-mustard-kurta', name: 'W mustard kurta', category: 'Kurtas', brand: 'W', image: 'ethnic', color: 'Mustard', gender: 'Women', occasion: 'Festive', price: 1499, mrp: 2499, sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'w-purple-kurta', name: 'W purple kurta', category: 'Kurtas', brand: 'W', image: 'purpleKurta', color: 'Purple', gender: 'Women', occasion: 'Casual', price: 1199, mrp: 1999, sizes: ['XS', 'S', 'M', 'L'] },
  { id: 'w-navy-kurta', name: 'W navy kurta', category: 'Kurtas', brand: 'W', image: 'navyKurta', color: 'Navy', gender: 'Women', occasion: 'Work', price: 1799, mrp: 2999, sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'w-saree', name: 'W occasion saree', category: 'Sarees', brand: 'W', image: 'saree', color: '', gender: 'Women', occasion: 'Festive', price: 3499, mrp: 4999, sizes: ['Free Size'] },
  { id: 'w-dress', name: 'W everyday dress', category: 'Dresses', brand: 'W', image: 'dress', color: '', gender: 'Women', occasion: 'Casual', price: 2199, mrp: 3999, sizes: ['S', 'M', 'L'], soldOut: true },
  { id: 'w-bottoms', name: 'W everyday trousers', category: 'Bottoms', brand: 'W', image: 'bottoms', color: '', gender: 'Women', occasion: 'Work', price: 999, mrp: 1599, sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'levis-blue-linen', name: "Levi's blue linen shirt", category: 'Shirts', brand: "Levi's", image: 'men', color: 'Blue', gender: 'Men', occasion: 'Casual', price: 2499, mrp: 3499, sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'levis-denim-shirt', name: "Levi's denim shirt", category: 'Shirts', brand: "Levi's", image: 'denimShirt', color: 'Blue', gender: 'Men', occasion: 'Casual', price: 2999, mrp: 3999, sizes: ['M', 'L', 'XL'] },
  { id: 'levis-white-shirt', name: "Levi's white shirt", category: 'Shirts', brand: "Levi's", image: 'whiteShirt', color: 'White', gender: 'Men', occasion: 'Work', price: 1999, mrp: 2999, sizes: ['S', 'M', 'L'] },
  { id: 'puma-black-uk7', name: 'PUMA black sneakers · UK 7 sample', category: 'Footwear', brand: 'PUMA', image: 'sneakers', color: 'Black', gender: 'Unisex', occasion: 'Casual', price: 2799, mrp: 3999, sizes: ['UK 7'] },
  { id: 'puma-black-uk8', name: 'PUMA black sneakers · UK 8 sample', category: 'Footwear', brand: 'PUMA', image: 'sneakers', color: 'Black', gender: 'Unisex', occasion: 'Casual', price: 2799, mrp: 3999, sizes: ['UK 8'] },
  { id: 'puma-black-uk9', name: 'PUMA black sneakers · UK 9 sample', category: 'Footwear', brand: 'PUMA', image: 'sneakers', color: 'Black', gender: 'Unisex', occasion: 'Casual', price: 2799, mrp: 3999, sizes: ['UK 9'], soldOut: true },
];

export const DEMO_PRODUCTS: readonly DemoProduct[] = references.map((item, index) => {
  const id = `sample-${item.id}`;
  const sizes = item.sizes.map((sizeLabel, sizeIndex) => ({
    id: `${id}-size-${sizeIndex}`, productId: id, sizeLabel,
    stockQuantity: item.soldOut ? 0 : sizeIndex + 1,
  }));
  const stock = sizes.reduce((sum, size) => sum + size.stockQuantity, 0);
  return {
    id, sellerId: DEMO_STORES[index % DEMO_STORES.length].id,
    name: item.name, category: item.category, subcategory: item.category,
    brand: item.brand, isLocalBrand: false, color: item.color, pattern: 'Reference image',
    gender: item.gender, occasion: item.occasion, style: item.occasion,
    price: item.price, mrp: item.mrp, currency: 'INR', stock,
    status: stock ? 'In Stock' : 'Out of Stock', imageUrl: INDIA_IMAGES[item.image],
    images: item.image === 'sneakers' ? [INDIA_IMAGES.sneakers, INDIA_IMAGES.sneakerDetail] : [INDIA_IMAGES[item.image]],
    description: `${item.name}. Reference product imagery with illustrative INR pricing and sample size availability. Not a verified retailer listing, offer or local stock confirmation.`,
    fabricType: 'Not verified', materialComposition: 'Refer to the retailer for composition',
    fit: 'Refer to the retailer size guide', season: 'All season', ageGroup: 'Adults',
    sku: `REFERENCE-${item.id.toUpperCase()}`, discount: Math.round((1 - item.price / item.mrp) * 100),
    premiumScore: 0, comfortScore: 0, aiPremiumSummary: 'Reference item; no verified quality assessment.',
    badges: ['Sample inventory'], tags: [item.category, item.brand, item.color, item.gender, item.occasion, 'reference sample'],
    createdAt: Date.UTC(2026, 8, 1 + index), featured: !item.soldOut, newArrival: index < 9,
    sizes, inventorySource: 'sample', inventoryVerified: false,
  };
});

type NumericValue = number | string | undefined;
function positiveInteger(value: NumericValue, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), max) : fallback;
}
function normalise(value?: string | null): string { return (value || '').trim().toLowerCase(); }
function numericFilter(value: NumericValue): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
function cloneProduct(product: DemoProduct): DemoProduct {
  return { ...product, images: [...product.images], badges: [...product.badges], tags: [...product.tags], sizes: product.sizes?.map(size => ({ ...size })) };
}
function cloneStore(store: DemoStore): DemoStore { return { ...store }; }

/** Every predicate and sort is applied to the entire assortment, before pagination. */
export function filterProducts(products: readonly DemoProduct[] = DEMO_PRODUCTS, query: ProductQuery = {}): DemoProduct[] {
  const min = numericFilter(query.minPrice), max = numericFilter(query.maxPrice), discount = numericFilter(query.minDiscount);
  const terms = normalise(query.search).split(/\s+/).filter(Boolean);
  const filtered = products.filter(product => {
    for (const key of ['category', 'gender', 'brand', 'occasion', 'status'] as const) {
      const value = normalise(query[key]);
      if (value && value !== 'all' && normalise(product[key]) !== value) return false;
    }
    if (query.storeId && product.sellerId !== query.storeId) return false;
    const color = normalise(query.color);
    if (color && color !== 'all' && ![product.color, product.secondaryColor].some(value => normalise(value) === color)) return false;
    const size = normalise(query.size);
    if (size && size !== 'all' && !product.sizes?.some(value => normalise(value.sizeLabel) === size && (normalise(query.status) !== 'in stock' || value.stockQuantity > 0))) return false;
    if (min !== undefined && product.price < min) return false;
    if (max !== undefined && product.price > max) return false;
    if (discount !== undefined && product.discount < discount) return false;
    const haystack = normalise([product.name, product.brand, product.category, product.subcategory, product.color, product.gender, product.occasion, product.style, product.description, ...product.tags].join(' '));
    return terms.every(term => haystack.includes(term));
  });
  filtered.sort((a, b) => {
    if (query.sort === 'priceAsc' || query.sort === 'price:asc') return a.price - b.price || a.id.localeCompare(b.id);
    if (query.sort === 'priceDesc' || query.sort === 'price:desc') return b.price - a.price || a.id.localeCompare(b.id);
    if (query.sort === 'oldest' || query.sort === 'createdAtAsc') return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt;
  });
  return filtered.map(cloneProduct);
}
export function paginateProducts(products: readonly DemoProduct[], page: NumericValue = 1, limit: NumericValue = 20): ProductPage {
  const safePage = positiveInteger(page, 1), safeLimit = positiveInteger(limit, 20, 100);
  return { data: products.slice((safePage - 1) * safeLimit, safePage * safeLimit).map(cloneProduct), page: safePage, limit: safeLimit, total: products.length, totalPages: Math.ceil(products.length / safeLimit) };
}
export function listProducts(query: ProductQuery = {}): ProductPage { return paginateProducts(filterProducts(DEMO_PRODUCTS, query), query.page, query.limit); }
export function getFeaturedProducts(limit: NumericValue = 10): DemoProduct[] {
  return DEMO_PRODUCTS.filter(product => product.featured).slice(0, positiveInteger(limit, 10, 100)).map(cloneProduct);
}
export function getNewArrivals(limit: NumericValue = 15): DemoProduct[] {
  return filterProducts(DEMO_PRODUCTS.filter(product => product.newArrival)).slice(0, positiveInteger(limit, 15, 100));
}
export function getCategories(): string[] { return [...CATALOG_CATEGORIES]; }
export function getProduct(id: string): DemoProductDetail | undefined {
  const product = DEMO_PRODUCTS.find(item => item.id === id);
  const seller = product && DEMO_STORES.find(store => store.id === product.sellerId);
  if (!product || !seller) return undefined;
  const cloned = cloneProduct(product);
  return { ...cloned, seller: cloneStore(seller), sizes: cloned.sizes || [] };
}
export function getShops(): DemoStore[] { return DEMO_STORES.map(cloneStore); }
export function getShop(id: string): ShopDetails | undefined {
  const shop = DEMO_STORES.find(store => store.id === id);
  return shop ? { shop: cloneStore(shop), products: filterProducts(DEMO_PRODUCTS, { storeId: id }) } : undefined;
}
export const getShopDetails = getShop;
