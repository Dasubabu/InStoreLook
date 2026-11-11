import type { AppState, Screen } from './types';

export interface RouteLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

/** Pagination belongs to a shopper URL, not to seller/application state. */
export type SearchRouteParams = Partial<AppState> & { searchPage?: number };

export interface AppRoute {
  screen: Screen;
  params: SearchRouteParams;
}

const EMPTY_ROUTE_PARAMS: SearchRouteParams = {
  selectedProductId: undefined,
  selectedStoreId: undefined,
  searchCategory: undefined,
  searchQuery: undefined,
  searchGender: undefined,
  searchBrand: undefined,
  searchMinPrice: undefined,
  searchMaxPrice: undefined,
  searchSize: undefined,
  searchColor: undefined,
  searchOccasion: undefined,
  searchMinDiscount: undefined,
  searchStatus: undefined,
  searchSort: undefined,
  searchFabric: undefined,
  searchFit: undefined,
  searchPattern: undefined,
  searchMinRating: undefined,
  searchPage: undefined,
};

const SEARCH_TEXT_PARAMS = {
  searchCategory: 'category', searchQuery: 'q', searchGender: 'gender', searchBrand: 'brand',
  searchSize: 'size', searchColor: 'color', searchOccasion: 'occasion', searchStatus: 'status', searchSort: 'sort',
  searchFabric: 'fabric', searchFit: 'fit', searchPattern: 'pattern',
} as const;
const SEARCH_NUMBER_PARAMS = { searchMinPrice: 'minPrice', searchMaxPrice: 'maxPrice', searchMinDiscount: 'minDiscount', searchMinRating: 'minRating', searchPage: 'page' } as const;

function validSearchNumber(key: string, value: number): boolean {
  if (!Number.isFinite(value) || value < 0) return false;
  if (key === 'searchPage') return Number.isInteger(value) && value >= 1 && value <= 10000;
  return value <= (key === 'searchMinRating' ? 5 : key === 'searchMinDiscount' ? 100 : 1000000);
}

function parseSearchParams(query: URLSearchParams): SearchRouteParams {
  const result: SearchRouteParams = {};
  for (const [key, param] of Object.entries(SEARCH_TEXT_PARAMS)) {
    const value = query.get(param)?.trim().slice(0, key === 'searchQuery' ? 200 : 120);
    result[key] = value && (key === 'searchQuery' || value.toLowerCase() !== 'all') ? value : undefined;
  }
  for (const [key, param] of Object.entries(SEARCH_NUMBER_PARAMS)) {
    const raw = query.get(param);
    const number = raw?.trim() ? Number(raw) : NaN;
    result[key] = validSearchNumber(key, number) ? number : undefined;
  }
  return result;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function parsePath(pathname: string, rawSearch = ''): AppRoute {
  // Accept both a location object and a complete relative path from navigation.
  const input = pathname || '/';
  const question = input.indexOf('?');
  const pathnameOnly = question < 0 ? input : input.slice(0, question);
  const embeddedSearch = question < 0 ? '' : input.slice(question + 1);
  const path = pathnameOnly.replace(/^\/+|\/+$/g, '');
  const segments = path ? path.split('/').map(decodeSegment) : [];
  const query = new URLSearchParams((rawSearch || embeddedSearch || '').replace(/^\?/, ''));
  const params = { ...EMPTY_ROUTE_PARAMS };

  if (!segments.length) return { screen: 'customer_home', params };

  switch (segments[0]) {
    case 'search':
      return {
        screen: 'customer_search',
        params: { ...params, ...parseSearchParams(query) },
      };
    case 'product':
      return segments[1]
        ? { screen: 'customer_product', params: { ...params, selectedProductId: segments[1] } }
        : { screen: 'customer_home', params };
    case 'store':
      return segments[1]
        ? { screen: 'customer_store', params: { ...params, selectedStoreId: segments[1] } }
        : { screen: 'customer_home', params };
    case 'stores':
      return { screen: 'customer_stores', params };
    case 'saved':
      return { screen: 'customer_saved', params };
    case 'cart':
      return { screen: 'customer_cart', params };
    case 'checkout':
      return { screen: 'customer_checkout', params };
    case 'orders':
      return { screen: 'customer_orders', params };
    case 'compare':
      return { screen: 'customer_compare', params };
    case 'admin':
      return { screen: 'customer_admin', params };
    case 'brands':
      return { screen: 'role_select', params };
    default:
      // Vercel rewrites unknown SPA paths to the app shell. Do not allow an
      // arbitrary path to create an unhandled React state.
      return { screen: 'customer_home', params };
  }
}

/** Resolve a real clean URL. Legacy #/ URLs are accepted and canonicalized. */
export function parseLocationRoute(location: RouteLocation): AppRoute {
  const hash = location.hash || '';
  if (hash.startsWith('#/')) return parsePath(hash.slice(1), '');
  return parsePath(location.pathname || '/', location.search || '');
}

export function initialBrowserRoute(location: RouteLocation): AppRoute {
  return parseLocationRoute(location);
}

export function parseHashRoute(hash: string): AppRoute {
  if (!hash) return { screen: 'customer_home', params: { ...EMPTY_ROUTE_PARAMS } };
  return parseLocationRoute({ pathname: '/', hash });
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

/** Build clean, shareable shopper paths. Seller/auth state never enters URLs. */
export function pathForScreen(screen: Screen, params: SearchRouteParams = {}): string | null {
  switch (screen) {
    case 'customer_home':
      return '/';
    case 'customer_search': {
      const query = new URLSearchParams();
      for (const [key, param] of Object.entries(SEARCH_TEXT_PARAMS)) {
        const value = params[key]?.trim().slice(0, key === 'searchQuery' ? 200 : 120);
        if (value && (key === 'searchQuery' || value.toLowerCase() !== 'all')) query.set(param, value);
      }
      for (const [key, param] of Object.entries(SEARCH_NUMBER_PARAMS)) {
        const value = params[key];
        if (typeof value === 'number' && validSearchNumber(key, value) && !(key === 'searchPage' && value === 1)) query.set(param, String(value));
      }
      return query.size ? `/search?${query.toString()}` : '/search';
    }
    case 'customer_product':
      return params.selectedProductId ? `/product/${encodeSegment(params.selectedProductId)}` : null;
    case 'customer_store':
      return params.selectedStoreId ? `/store/${encodeSegment(params.selectedStoreId)}` : null;
    case 'customer_stores':
      return '/stores';
    case 'customer_saved':
      return '/saved';
    case 'customer_cart':
      return '/cart';
    case 'customer_checkout':
      return '/checkout';
    case 'customer_orders':
      return '/orders';
    case 'customer_compare':
      return '/compare';
    case 'customer_admin':
      return '/admin';
    case 'role_select':
      return '/brands';
    default:
      return null;
  }
}

// Kept as an alias so existing callers from the earlier hash-routing slice
// continue to compile while the actual URL is now clean path-based routing.
export const hashForScreen = pathForScreen;
