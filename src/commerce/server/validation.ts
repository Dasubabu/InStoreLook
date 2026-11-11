import type { CheckoutAddress, ShopProduct, ShopQuery } from '../contracts.js';

export class ShopError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function fail(message: string): never { throw new ShopError(400, 'INVALID_INPUT', message); }
export function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object');
  return value as Record<string, any>;
}
export function fields(value: unknown, allowed: string[]) {
  const data = object(value);
  if (Object.keys(data).some(key => !allowed.includes(key))) fail('Unexpected input field');
  return data;
}
export function text(value: unknown, name: string, max = 120, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f]/.test(value) || (!allowEmpty && !value.trim())) fail(`Invalid ${name}`);
  return value.trim();
}
export function identifier(value: unknown): string {
  const id = text(value, 'identifier', 160);
  if (!/^[\w.:-]+$/.test(id)) fail('Invalid identifier');
  return id;
}
export function integer(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${name}`);
  return value;
}
export function address(value: unknown): CheckoutAddress {
  const a = fields(value, ['name','email','phone','line1','line2','city','state','postalCode','country']);
  const result: CheckoutAddress = {
    name: text(a.name, 'name', 100), email: text(a.email, 'email', 254), phone: text(a.phone, 'phone', 20),
    line1: text(a.line1, 'address', 200), city: text(a.city, 'city', 100), state: text(a.state, 'state', 100),
    postalCode: text(a.postalCode, 'postal code', 6), country: 'IN',
  };
  if (a.line2 !== undefined) result.line2 = text(a.line2, 'address line 2', 200, true);
  if (a.country !== 'IN' || !/^[1-9]\d{5}$/.test(result.postalCode) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !/^\+?[0-9 ()-]{10,20}$/.test(result.phone)) fail('Invalid shipping address');
  return result;
}
export function imageUrl(value: unknown): string {
  const url = text(value, 'image URL', 2000);
  try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail('Images must use HTTPS URLs'); }
  catch { fail('Images must use HTTPS URLs'); }
  return url;
}
export function product(value: unknown): ShopProduct {
  const p = object(value);
  const result: ShopProduct = {
    id: identifier(p.id), name: text(p.name, 'name', 200), brand: text(p.brand, 'brand'), category: text(p.category, 'category'),
    gender: text(p.gender, 'gender'), description: text(p.description, 'description', 8000, true), color: text(p.color, 'color', 120, true),
    currency: 'INR', price: 0, stock: 0, status: 'Out of Stock', images: [], variants: [],
    inventorySource: p.inventorySource, inventoryVerified: p.inventoryVerified === true,
  };
  if (p.currency !== 'INR' || !['sample','live'].includes(p.inventorySource)) fail('Invalid currency or inventory source');
  if (!Array.isArray(p.variants) || p.variants.length < 1 || p.variants.length > 100) fail('Expected 1–100 variants');
  result.variants = p.variants.map((v: unknown) => { const variant = object(v); return {
    id: identifier(variant.id), sku: text(variant.sku, 'SKU', 160), size: text(variant.size, 'size', 60),
    color: text(variant.color, 'variant color', 120, true), stock: integer(variant.stock, 'stock', 0, 1000000),
    priceMinor: integer(variant.priceMinor, 'price', 1, 100000000),
  }; });
  if (new Set(result.variants.map(v => v.id)).size !== result.variants.length || new Set(result.variants.map(v => v.sku)).size !== result.variants.length) fail('Duplicate variants');
  result.price = Math.min(...result.variants.map(v => v.priceMinor)) / 100;
  result.stock = result.variants.reduce((sum,v) => sum + v.stock, 0);
  result.status = result.stock ? 'In Stock' : 'Out of Stock';
  if (p.mrp !== undefined) { if (typeof p.mrp !== 'number' || !Number.isFinite(p.mrp) || p.mrp < result.price || p.mrp > 1000000) fail('Invalid MRP'); result.mrp = p.mrp; }
  if (!Array.isArray(p.images) || p.images.length > 20) fail('Invalid image list');
  result.images = p.images.map(imageUrl);
  if (p.imageUrl !== undefined) result.imageUrl = imageUrl(p.imageUrl);
  if (p.media !== undefined) {
    if (!Array.isArray(p.media) || p.media.length > 20) fail('Invalid media list');
    result.media = p.media.map((entry: unknown) => { const m = object(entry); return {
      url: imageUrl(m.url), alt: text(m.alt, 'alt text', 300, true),
      ...(m.view !== undefined ? {view: text(m.view,'view',120)} : {}), ...(m.source !== undefined ? {source:text(m.source,'source',300)} : {}),
    }; });
  }
  for (const key of ['fabricType','materialComposition','fit','pattern','careInstructions','sizeChartNote','returnPolicy','deliveryNote','occasion'] as const) {
    if (p[key] !== undefined) result[key] = text(p[key], key, 2000, true);
  }
  if (p.compositionVerified !== undefined) result.compositionVerified = p.compositionVerified === true;
  if (p.rating !== undefined && p.rating !== null) { if (typeof p.rating !== 'number' || !Number.isFinite(p.rating) || p.rating < 0 || p.rating > 5) fail('Invalid rating'); result.rating = p.rating; }
  if (p.ratingCount !== undefined) result.ratingCount = integer(p.ratingCount,'rating count',0,100000000);
  if (p.tags !== undefined) { if (!Array.isArray(p.tags) || p.tags.length > 30) fail('Invalid tags'); result.tags = p.tags.map((t: unknown) => text(t,'tag',100)); }
  if (p.sizeChart !== undefined) {
    if (!Array.isArray(p.sizeChart) || p.sizeChart.length > 100) fail('Invalid size chart');
    result.sizeChart = p.sizeChart.map((entry: unknown) => { const row = object(entry); const out: any = {label: text(row.label,'size label',60)};
      for (const key of ['chestCm','waistCm','lengthCm']) if (row[key] !== undefined) { if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] <= 0 || row[key] > 500) fail('Invalid size chart measurement'); out[key] = row[key]; } return out;
    });
  }
  return result;
}
export function query(value: unknown): ShopQuery {
  const raw = object(value);
  // Vercel catch-all functions expose the matched wildcard as `path`. It is
  // routing metadata, not part of the public commerce query contract.
  delete raw.path;
  const input = fields(raw, ['search','category','brand','gender','size','color','fabric','fit','pattern','minPrice','maxPrice','minDiscount','minRating','status','sort','occasion','page','limit']);
  const result: any = {};
  for (const [key,v] of Object.entries(input)) {
    if (['minPrice','maxPrice','minDiscount','minRating','page','limit'].includes(key)) {
      if ((typeof v !== 'string' && typeof v !== 'number') || !/^\d+(\.\d+)?$/.test(String(v))) fail(`Invalid ${key}`);
      const n = Number(v), max = key === 'limit' ? 100 : key === 'page' ? 10000 : key === 'minDiscount' ? 100 : key === 'minRating' ? 5 : 1000000;
      if (!Number.isFinite(n) || n > max || (['limit','page'].includes(key) && (!Number.isInteger(n) || n < 1))) fail(`Invalid ${key}`);
      result[key] = n;
    } else result[key] = text(v,key,key === 'search' ? 200 : 120,true);
  }
  if (result.minPrice !== undefined && result.maxPrice !== undefined && result.minPrice > result.maxPrice) fail('Invalid price range');
  if (result.sort && !['relevance','newest','price_asc','price_desc','rating','name','discount','price-low','price-high','price-low-high','price-high-low','rating_desc','discount_desc','popular'].includes(result.sort)) fail('Invalid sort');
  if (result.status && !['In Stock','Out of Stock'].includes(result.status)) fail('Invalid stock status');
  return result;
}
