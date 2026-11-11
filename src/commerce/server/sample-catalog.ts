import { DEMO_PRODUCTS } from '../../lib/demoCatalog.js';
import type { ShopFacets, ShopPage, ShopProduct, ShopQuery } from '../contracts.js';
import { catalogSearch, searchTokens } from './catalog-search.js';
import { product as validateProduct, query as validateQuery, ShopError } from './validation.js';

/** The read-only sample assortment can be browsed without a checkout database.
 * It never creates carts, sessions, orders, or payment confirmations. */
export function sampleProducts(): ShopProduct[] {
  return DEMO_PRODUCTS.map(product => ({
    ...validateProduct({ ...product, tags: product.tags.filter(Boolean), variants: (product.sizes || []).map(size => ({
      id: size.id, sku: `${product.sku}-${size.sizeLabel.replace(/\s+/g, '-')}`,
      size: size.sizeLabel, color: product.color, stock: size.stockQuantity,
      priceMinor: Math.round(product.price * 100),
    })) }),
    createdAt: product.createdAt,
    sizes: product.sizes?.map(size => ({ ...size })),
  }));
}

const discount = (product: ShopProduct) => product.mrp ? 100 * (product.mrp - product.price) / product.mrp : 0;

export const sampleCatalog = {
  products(input: ShopQuery = {}): ShopPage {
    const query = validateQuery(input);
    const terms = searchTokens(query.search || '');
    const score = new Map<string, number>();
    const products = sampleProducts().filter(product => {
      for (const key of ['category', 'brand', 'gender', 'color', 'fabric', 'fit', 'pattern', 'occasion'] as const) {
        if (key === 'color') continue; // Color and size must match the same variant.
        const value = key === 'fabric' ? product.fabricType : product[key];
        if (query[key] && value !== query[key]) return false;
      }
      const variants = product.variants.filter(variant => (!query.size || variant.size === query.size) && (!query.color || variant.color === query.color));
      if ((query.size || query.color) && !variants.length) return false;
      if (query.status === 'In Stock' && !variants.some(variant => variant.stock > 0)) return false;
      if (query.status === 'Out of Stock' && variants.some(variant => variant.stock > 0)) return false;
      if (query.minPrice !== undefined && product.price < Number(query.minPrice)) return false;
      if (query.maxPrice !== undefined && product.price > Number(query.maxPrice)) return false;
      if (query.minDiscount !== undefined && discount(product) < Number(query.minDiscount)) return false;
      if (query.minRating !== undefined && (product.rating == null || product.rating < Number(query.minRating))) return false;
      const document = catalogSearch(product, product.variants);
      if (query.search && (!terms.length || !terms.every(term => document.terms.includes(` ${term} `)))) return false;
      score.set(product.id, terms.reduce((sum, term) => sum + (document.primary.includes(` ${term} `) ? 8 : document.attributes.includes(` ${term} `) ? 4 : 1), 0));
      return true;
    });
    products.sort((a, b) => {
      let order = 0;
      switch (query.sort) {
        case 'price_asc': case 'price-low': case 'price-low-high': order = a.price - b.price; break;
        case 'price_desc': case 'price-high': case 'price-high-low': order = b.price - a.price; break;
        case 'name': order = a.name.localeCompare(b.name); break;
        case 'discount': case 'discount_desc': order = discount(b) - discount(a); break;
        case 'rating': case 'rating_desc': order = (b.rating ?? -1) - (a.rating ?? -1); break;
        default: order = (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (terms.length && (!query.sort || query.sort === 'relevance')) order = score.get(b.id)! - score.get(a.id)!;
      return order || a.id.localeCompare(b.id);
    });
    const page = Number(query.page || 1), limit = Number(query.limit || 24);
    return { data: products.slice((page - 1) * limit, page * limit), page, limit, total: products.length, totalPages: Math.ceil(products.length / limit), catalogSource: 'sample' };
  },
  product(id: string): ShopProduct {
    const product = sampleProducts().find(item => item.id === id);
    if (!product) throw new ShopError(404, 'NOT_FOUND', 'Product not found');
    return product;
  },
  facets(): ShopFacets {
    const products = sampleProducts();
    const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => !!value))].sort();
    return {
      categories: distinct(products.map(product => product.category)), brands: distinct(products.map(product => product.brand)),
      genders: distinct(products.map(product => product.gender)), fabrics: distinct(products.map(product => product.fabricType)),
      fits: distinct(products.map(product => product.fit)), patterns: distinct(products.map(product => product.pattern)),
      sizes: distinct(products.flatMap(product => product.variants.map(variant => variant.size))),
      colors: distinct(products.flatMap(product => product.variants.map(variant => variant.color))),
    };
  },
  suggestions(search: string): string[] {
    return search ? this.products({ search, limit: 8 }).data.map(product => product.name) : [];
  },
};
