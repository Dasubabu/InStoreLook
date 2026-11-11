import type { ShopFacets, ShopPage, ShopProduct, ShopQuery } from '../../commerce/contracts';
import type { SearchRouteParams } from '../../routing';

export const HOME_RAIL_LIMIT = 8;
export const SEARCH_PAGE_SIZE = 12;
export const HOME_RAIL_QUERIES: Record<'featured' | 'newest', ShopQuery> = {
  featured: { sort: 'price_asc', status: 'In Stock', page: 1, limit: HOME_RAIL_LIMIT },
  newest: { sort: 'newest', page: 1, limit: HOME_RAIL_LIMIT },
};
export const EMPTY_FACETS: ShopFacets = { categories: [], brands: [], genders: [], sizes: [], colors: [], fabrics: [], fits: [], patterns: [] };

/** Facet navigation is backed by the catalog, never by a promotional fallback. */
export function boundedFacets(value: ShopFacets): ShopFacets {
  const result = { ...EMPTY_FACETS };
  for (const key of Object.keys(EMPTY_FACETS) as (keyof ShopFacets)[]) {
    if (!Array.isArray(value?.[key])) throw new Error('Filter options are unavailable. Please retry.');
    result[key] = [...new Set(value[key].filter(item => typeof item === 'string').map(item => item.trim()).filter(item => item && item.toLowerCase() !== 'all'))].slice(0, 200);
  }
  return result;
}

export function homeDepartments(facets: ShopFacets): { label: string; params: SearchRouteParams }[] {
  const order = ['women', 'men', 'kids', 'unisex'];
  return [...facets.genders].sort((a, b) => {
    const rank = (value: string) => order.indexOf(value.toLowerCase()) < 0 ? order.length : order.indexOf(value.toLowerCase());
    return rank(a) - rank(b) || a.localeCompare(b);
  }).map(gender => ({ label: gender, params: { searchGender: gender } }));
}

export function checkShopPage(value: ShopPage, requestedPage: number, limit: number): ShopPage {
  if (!value || !Array.isArray(value.data) || ![value.page, value.limit, value.total, value.totalPages].every(Number.isSafeInteger)
    || value.page !== requestedPage || value.limit < 1 || value.limit > limit || value.total < 0
    || value.totalPages !== Math.ceil(value.total / value.limit) || value.data.length > value.limit || value.data.length > value.total
    || !['sample', 'live'].includes(value.catalogSource)
    || value.data.some(product => !product || typeof product.id !== 'string' || !product.id || typeof product.name !== 'string' || !Number.isFinite(product.price))
    || new Set(value.data.map(product => product.id)).size !== value.data.length) {
    throw new Error('The catalog returned an invalid page. Please retry.');
  }
  return value;
}

export function catalogModeLabel(pages: (ShopPage | null)[]): string {
  const sources = new Set(pages.filter((page): page is ShopPage => !!page).map(page => page.catalogSource));
  if (!sources.size) return 'Catalog not yet loaded';
  if (sources.size > 1) return 'Catalog mode changed · refresh';
  return sources.has('sample') ? 'Sample catalog' : 'Shop catalog';
}

export function catalogImage(product?: ShopProduct): { url: string; alt: string } | undefined {
  if (!product) return undefined;
  const media = product.media?.find(item => item.url?.trim());
  const url = media?.url || product.imageUrl || product.images?.find(value => value?.trim());
  return url ? { url, alt: media?.alt || product.name } : undefined;
}

export interface SearchFilters {
  category: string; gender: string; brand: string; minPrice: string; maxPrice: string;
  size: string; color: string; occasion: string; minDiscount: string; status: string; sort: string;
  fabric: string; fit: string; pattern: string; minRating: string;
}
export const EMPTY_FILTERS: SearchFilters = { category: 'All', gender: 'All', brand: 'All', minPrice: '', maxPrice: '', size: 'All', color: 'All', occasion: 'All', minDiscount: '', status: 'All', sort: 'newest', fabric: 'All', fit: 'All', pattern: 'All', minRating: '' };
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest listings' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'discount', label: 'Largest discount' },
  { value: 'name', label: 'Name: A–Z' },
] as const;

export function sortValue(value?: string): string {
  const aliases: Record<string, string> = { priceAsc: 'price_asc', priceDesc: 'price_desc', 'price-low': 'price_asc', 'price-high': 'price_desc', 'price-low-high': 'price_asc', 'price-high-low': 'price_desc', rating_desc: 'rating', discount_desc: 'discount' };
  const normalized = aliases[value || ''] || value;
  return SORT_OPTIONS.some(item => item.value === normalized) ? normalized! : 'newest';
}

export function filtersFromRoute(route: SearchRouteParams = {}, category?: string): SearchFilters {
  return {
    category: category || route.searchCategory || 'All', gender: route.searchGender || 'All', brand: route.searchBrand || 'All',
    minPrice: route.searchMinPrice?.toString() ?? '', maxPrice: route.searchMaxPrice?.toString() ?? '',
    size: route.searchSize || 'All', color: route.searchColor || 'All', occasion: route.searchOccasion || 'All',
    minDiscount: route.searchMinDiscount?.toString() ?? '', status: route.searchStatus || 'All', sort: sortValue(route.searchSort),
    fabric: route.searchFabric || 'All', fit: route.searchFit || 'All', pattern: route.searchPattern || 'All', minRating: route.searchMinRating?.toString() ?? '',
  };
}

function selected(value: string): string | undefined { return !value.trim() || value.toLowerCase() === 'all' ? undefined : value.trim(); }
function numberValue(value: string): number | undefined { return value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined; }

export function filterError(filters: SearchFilters): string {
  if ([filters.minPrice, filters.maxPrice].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1000000))) return 'Enter prices between ₹0 and ₹10,00,000.';
  if (filters.minPrice !== '' && filters.maxPrice !== '' && Number(filters.minPrice) > Number(filters.maxPrice)) return 'Minimum price must not exceed maximum price.';
  if (filters.minRating !== '' && (!Number.isFinite(Number(filters.minRating)) || Number(filters.minRating) < 0 || Number(filters.minRating) > 5)) return 'Choose a minimum rating between 0 and 5.';
  if (filters.minDiscount !== '' && (!Number.isFinite(Number(filters.minDiscount)) || Number(filters.minDiscount) < 0 || Number(filters.minDiscount) > 100)) return 'Choose a minimum discount between 0% and 100%.';
  return '';
}

export function toShopQuery(query: string, filters: SearchFilters, page = 1): ShopQuery {
  return {
    search: query.trim().slice(0, 200) || undefined,
    category: selected(filters.category), gender: selected(filters.gender), brand: selected(filters.brand),
    minPrice: numberValue(filters.minPrice), maxPrice: numberValue(filters.maxPrice),
    size: selected(filters.size), color: selected(filters.color), occasion: selected(filters.occasion),
    minDiscount: numberValue(filters.minDiscount), status: selected(filters.status), sort: sortValue(filters.sort),
    fabric: selected(filters.fabric), fit: selected(filters.fit), pattern: selected(filters.pattern), minRating: numberValue(filters.minRating),
    page, limit: SEARCH_PAGE_SIZE,
  };
}

export function toSearchRoute(query: string, filters: SearchFilters, page = 1): SearchRouteParams {
  const values = toShopQuery(query, filters, page);
  return {
    searchQuery: values.search, searchCategory: values.category, searchGender: values.gender, searchBrand: values.brand,
    searchMinPrice: numberValue(filters.minPrice), searchMaxPrice: numberValue(filters.maxPrice),
    searchSize: values.size, searchColor: values.color, searchOccasion: values.occasion,
    searchMinDiscount: numberValue(filters.minDiscount), searchStatus: values.status,
    searchSort: values.sort === 'newest' ? undefined : values.sort,
    searchFabric: values.fabric, searchFit: values.fit, searchPattern: values.pattern, searchMinRating: numberValue(filters.minRating),
    searchPage: page > 1 ? page : undefined,
  };
}

const FILTER_LABELS: Record<keyof SearchFilters, string> = { category: 'Category', gender: 'Gender', brand: 'Brand', minPrice: 'From', maxPrice: 'Up to', size: 'Size', color: 'Colour', occasion: 'Occasion', minDiscount: 'Discount', status: 'Availability', sort: 'Sort', fabric: 'Fabric', fit: 'Fit', pattern: 'Pattern', minRating: 'Rating' };
export function activeFilters(query: string, filters: SearchFilters): { key: keyof SearchFilters | 'query'; label: string }[] {
  const chips: { key: keyof SearchFilters | 'query'; label: string }[] = query.trim() ? [{ key: 'query', label: `Search: ${query.trim()}` }] : [];
  for (const key of Object.keys(EMPTY_FILTERS) as (keyof SearchFilters)[]) {
    if (filters[key] === EMPTY_FILTERS[key] || !filters[key].trim()) continue;
    let value = filters[key];
    if (key === 'minPrice' || key === 'maxPrice') value = Number.isFinite(Number(value)) ? `₹${Number(value).toLocaleString('en-IN')}` : value;
    if (key === 'minRating') value += '★ & up';
    if (key === 'minDiscount') value += '% & up';
    if (key === 'sort') value = SORT_OPTIONS.find(item => item.value === value)?.label || value;
    chips.push({ key, label: `${FILTER_LABELS[key]}: ${value}` });
  }
  return chips;
}

export function clearFilter(filters: SearchFilters, key: keyof SearchFilters): SearchFilters { return { ...filters, [key]: EMPTY_FILTERS[key] }; }

export function boundedSuggestions(values: string[]): string[] {
  if (!Array.isArray(values)) throw new Error('Suggestions are unavailable.');
  return [...new Set(values.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))].slice(0, 8);
}

export function nextSuggestionIndex(current: number, direction: 1 | -1, count: number): number {
  if (count < 1) return -1;
  if (current < 0 || current >= count) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}

/** A bounded pager keeps at most one product page and five page controls mounted. */
export function pageWindow(page: number, totalPages: number): number[] {
  const total = Math.max(0, Math.min(10000, Math.floor(totalPages)));
  const start = Math.max(1, Math.min(page - 2, total - 4));
  return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
}
