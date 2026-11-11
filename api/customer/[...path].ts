import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
  getProduct,
  listProducts,
  type ProductQuery,
} from '../../src/lib/demoCatalog.js';
import { getPlacesCapabilities, listNearbyMapPlaces, parseLocation, searchPlaces } from '../../src/api/places.js';
import { listPublicStores, listNearbyStores, getPublicStore } from '../../src/api/catalog.js';
import { getCatalogSource } from '../../src/db/mongo.js';

type QueryValue = string | string[] | undefined;

interface CustomerRequest extends IncomingMessage {
  query?: Record<string, QueryValue>;
}

interface JsonResponse {
  data?: unknown;
  [key: string]: unknown;
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, statusCode: number, payload: JsonResponse): void {
  const body = JSON.stringify({
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

function queryValue(
  url: URL,
  request: CustomerRequest,
  key: string,
): string | undefined {
  const fromUrl = url.searchParams.get(key);
  if (fromUrl !== null) return fromUrl;

  const fromQuery = request.query?.[key];
  return Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
}

function pathSegments(url: URL, request: CustomerRequest): string[] {
  const prefix = '/api/customer';
  const pathname = url.pathname;
  const pathFromQuery = request.query?.path;
  const queryPath = Array.isArray(pathFromQuery) ? pathFromQuery.join('/') : pathFromQuery;
  const path =
    pathname === prefix
      ? ''
      : pathname.startsWith(`${prefix}/`)
        ? pathname.slice(prefix.length)
        : queryPath
          ? `/${queryPath}`
          : pathname;

  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function productQuery(url: URL, request: CustomerRequest): ProductQuery {
  return {
    page: queryValue(url, request, 'page'),
    limit: queryValue(url, request, 'limit'),
    search: queryValue(url, request, 'search'),
    category: queryValue(url, request, 'category'),
    status: queryValue(url, request, 'status'),
    gender: queryValue(url, request, 'gender'),
    brand: queryValue(url, request, 'brand'),
    minPrice: queryValue(url, request, 'minPrice'),
    maxPrice: queryValue(url, request, 'maxPrice'),
    size: queryValue(url, request, 'size'),
    color: queryValue(url, request, 'color'),
    occasion: queryValue(url, request, 'occasion'),
    minDiscount: queryValue(url, request, 'minDiscount'),
    sort: queryValue(url, request, 'sort'),
    storeId: queryValue(url, request, 'storeId'),
  };
}

function publicProduct(product: any, detail = false): Record<string, unknown> {
  const result = { ...product };
  delete result.sellerId;
  if (detail) {
    const details = getProduct(product.id);
    result.seller = details?.seller || null;
    result.sizes = details?.sizes || [];
  }
  return result;
}

function sourcedStore(store: Record<string, unknown>) {
  const sample = getCatalogSource() === 'demo';
  return { ...store, inventorySource: sample ? 'sample' : 'live', locationVerified: !sample && store.locationVerified === true };
}

export default async function handler(req: CustomerRequest, res: ServerResponse): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let url: URL;
  try {
    url = new URL(req.url || '/api/customer', 'http://localhost');
  } catch {
    sendJson(res, 400, { error: 'Invalid request URL' });
    return;
  }

  try {
    const segments = pathSegments(url, req);
    const resource = segments[0];
    const id = segments[1];

    if (resource === 'products' && !id && segments.length === 1) {
      const result = listProducts(productQuery(url, req));
      sendJson(res, 200, {
        data: result.data.map((product) => publicProduct(product)),
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        catalogSource: 'sample',
      });
      return;
    }

    if (resource === 'products' && id && segments.length === 2) {
      const product = getProduct(id);
      if (!product) {
        sendJson(res, 404, { error: 'Product not found' });
        return;
      }
      sendJson(res, 200, { data: publicProduct(product, true) });
      return;
    }

    if (resource === 'featured-products' && segments.length === 1) {
      const limit = Number(queryValue(url, req, 'limit')) || 10;
      sendJson(res, 200, { data: getFeaturedProducts(limit).map((product) => publicProduct(product)) });
      return;
    }

    if (resource === 'new-arrivals' && segments.length === 1) {
      const limit = Number(queryValue(url, req, 'limit')) || 15;
      sendJson(res, 200, { data: getNewArrivals(limit).map((product) => publicProduct(product)) });
      return;
    }

    if (resource === 'categories' && segments.length === 1) {
      sendJson(res, 200, { data: getCategories() });
      return;
    }

    if (resource === 'shops' && !id && segments.length === 1) {
      sendJson(res, 200, { data: (await listPublicStores()).map(sourcedStore) });
      return;
    }

    if (resource === 'shops' && id === 'nearby' && segments.length === 2) {
      const { latitude, longitude, radius } = parseLocation(queryValue(url, req, 'latitude'), queryValue(url, req, 'longitude'), queryValue(url, req, 'radius') ?? 25_000);
      sendJson(res, 200, { data: (await listNearbyStores(latitude, longitude, radius)).map(sourcedStore) });
      return;
    }

    if (resource === 'places' && id === 'capabilities' && segments.length === 2) {
      sendJson(res, 200, { data: getPlacesCapabilities() });
      return;
    }

    if (resource === 'places' && id === 'nearby' && segments.length === 2) {
      const { latitude, longitude, radius } = parseLocation(queryValue(url, req, 'latitude'), queryValue(url, req, 'longitude'), queryValue(url, req, 'radius') ?? 5_000);
      sendJson(res, 200, { data: await listNearbyMapPlaces(latitude, longitude, radius) });
      return;
    }

    if (resource === 'places' && id === 'search' && segments.length === 2) {
      sendJson(res, 200, { data: await searchPlaces(queryValue(url, req, 'q')) });
      return;
    }

    if (resource === 'shops' && id && segments.length === 2) {
      const details = await getPublicStore(id);
      if (!details) {
        sendJson(res, 404, { error: 'Shop not found' });
        return;
      }

      // Keep the legacy customerApi shape while also exposing a conventional data field.
      sendJson(res, 200, {
        data: details,
        shop: sourcedStore(details.shop),
        products: details.products.map((product) => publicProduct(product)),
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    if (error instanceof URIError) {
      sendJson(res, 400, { error: 'Invalid path' });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unable to load the customer catalog';
    const status = error instanceof Error && 'status' in error ? Number(error.status) : 500;
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'CUSTOMER_API_ERROR';
    sendJson(res, status, { error: { code, message } });
  }
}
