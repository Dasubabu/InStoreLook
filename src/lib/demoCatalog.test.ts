import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_PRODUCTS, DEMO_STORES, filterProducts, getCategories, getProduct, listProducts } from './demoCatalog';
import { customerApi } from './customerApi';
import { parseLocationRoute, pathForScreen } from '../routing';
import { listPublicProducts } from '../api/catalog';
import handler from '../../api/customer/[...path]';

test('Indian assortment has six categories and explicitly illustrative inventory', () => {
  assert.ok(DEMO_PRODUCTS.length >= 12 && DEMO_PRODUCTS.length <= 16);
  assert.deepEqual(getCategories(), ['Kurtas', 'Sarees', 'Dresses', 'Shirts', 'Bottoms', 'Footwear']);
  assert.deepEqual([...new Set(DEMO_PRODUCTS.map(product => product.brand))], ['W', "Levi's", 'PUMA']);
  for (const product of DEMO_PRODUCTS) {
    assert.equal(product.currency, 'INR');
    assert.equal(product.inventoryVerified, false);
    assert.equal(product.inventorySource, 'sample');
    assert.ok(product.price >= 500 && product.price <= product.mrp);
    assert.equal(product.stock, product.sizes?.reduce((sum, size) => sum + size.stockQuantity, 0));
    assert.ok(product.imageUrl && !product.imageUrl.includes('unsplash'));
  }
  for (const store of DEMO_STORES) {
    assert.equal(store.locationVerified, false);
    assert.equal(store.phone, '');
    assert.equal(store.whatsappNumber, '');
    assert.match(store.shopName, /sample/);
  }
});

test('all advanced filters combine before pagination, including size and discount', () => {
  const result = listProducts({ search: 'W kurta', category: 'Kurtas', brand: 'W', gender: 'Women', minPrice: 1000, maxPrice: 2000, size: 'M', color: 'Navy', occasion: 'Work', minDiscount: 30, status: 'In Stock', page: 1, limit: 1 });
  assert.equal(result.total, 1);
  assert.equal(result.data[0].id, 'sample-w-navy-kurta');
});

test('price order and filtered totals survive multiple pages', () => {
  const query = { category: 'Kurtas', sort: 'priceAsc', limit: 1 };
  const pages = [1, 2, 3].map(page => listProducts({ ...query, page }));
  assert.deepEqual(pages.map(page => page.data[0].price), [1199, 1499, 1799]);
  assert.ok(pages.every(page => page.total === 3 && page.totalPages === 3));
  assert.equal(listProducts({ ...query, page: 4 }).data.length, 0);
});

test('INR price bounds include their endpoints and impossible combinations return empty', () => {
  assert.equal(listProducts({ minPrice: 1499, maxPrice: 1499 }).data[0].id, 'sample-w-mustard-kurta');
  assert.equal(listProducts({ brand: 'PUMA', category: 'Sarees' }).total, 0);
  assert.equal(listProducts({ minPrice: 3000, maxPrice: 1000 }).total, 0);
});

test('availability and selected size combine correctly', () => {
  assert.equal(listProducts({ size: 'UK 9', status: 'In Stock' }).total, 0);
  assert.equal(listProducts({ size: 'UK 9', status: 'Out of Stock' }).total, 1);
  const sample = getProduct('sample-w-mustard-kurta')!;
  sample.sizes = [{ id: 'empty-m', productId: sample.id, sizeLabel: 'M', stockQuantity: 0 }];
  assert.equal(filterProducts([sample], { size: 'M', status: 'In Stock' }).length, 0);
});

test('search is case-insensitive and reset restores every item', () => {
  assert.equal(listProducts({ search: 'LEVI\'S BLUE', gender: 'men' }).total, 2);
  assert.equal(listProducts({}).total, DEMO_PRODUCTS.length);
});

test('each sort orders the full result and does not mutate the catalog', () => {
  const ids = DEMO_PRODUCTS.map(product => product.id);
  for (const sort of ['priceAsc', 'priceDesc', 'newest', 'oldest']) {
    const data = listProducts({ sort }).data;
    const values = data.map(product => sort.startsWith('price') ? product.price : product.createdAt);
    assert.deepEqual(values, [...values].sort((a, b) => sort === 'priceAsc' || sort === 'oldest' ? a - b : b - a));
  }
  assert.deepEqual(DEMO_PRODUCTS.map(product => product.id), ids);
  const clone = getProduct(ids[0])!;
  clone.sizes[0].stockQuantity = 900;
  assert.notEqual(getProduct(ids[0])!.sizes[0].stockQuantity, 900);
});

test('homepage navigation contract round-trips without dropping query filters', () => {
  const params = { searchCategory: 'Shirts', searchQuery: 'blue linen', searchGender: 'Men', searchBrand: "Levi's", searchMaxPrice: 3000, searchOccasion: 'Casual' };
  const path = pathForScreen('customer_search', params)!;
  const route = parseLocationRoute({ pathname: path });
  assert.equal(route.screen, 'customer_search');
  for (const [key, value] of Object.entries(params)) assert.equal(route.params[key], value);
});

test('refresh/back clean URLs and legacy hashes preserve every refinement', () => {
  const params = { searchCategory: 'Kurtas', searchQuery: 'navy', searchGender: 'Women', searchBrand: 'W', searchMinPrice: 0, searchMaxPrice: 2000, searchSize: 'M', searchColor: 'Navy', searchOccasion: 'Work', searchMinDiscount: 30, searchStatus: 'In Stock', searchSort: 'priceDesc' };
  const path = pathForScreen('customer_search', params)!;
  const [pathname, search] = path.split('?');
  for (const location of [{ pathname, search }, { pathname: '/', hash: `#${path}` }]) {
    const route = parseLocationRoute(location);
    for (const [key, value] of Object.entries(params)) assert.equal(route.params[key], value);
  }
  const cleared = parseLocationRoute({ pathname: '/search' }).params;
  assert.equal(cleared.searchBrand, undefined);
  assert.equal(cleared.searchMaxPrice, undefined);
  const malformed = parseLocationRoute({ pathname: '/search', search: '?minPrice=-1&maxPrice=nope' });
  assert.equal(malformed.params.searchMinPrice, undefined);
  assert.equal(malformed.params.searchMaxPrice, undefined);
});

test('client delegates catalog pages and filters to the authoritative commerce API', async () => {
  const original = globalThis.fetch;
  const query = { brand: 'W', maxPrice: 2000, sort: 'priceAsc', page: 2, limit: 2 };
  const expected = listProducts(query);
  globalThis.fetch = async input => {
    const url = new URL(String(input), 'http://localhost');
    assert.equal(url.pathname, '/api/shop/products');
    assert.equal(url.searchParams.get('brand'), 'W');
    assert.equal(url.searchParams.get('maxPrice'), '2000');
    assert.equal(url.searchParams.get('sort'), 'price_asc');
    assert.equal(url.searchParams.get('page'), '2');
    return Response.json({ ...expected, catalogSource: 'sample' });
  };
  try {
    const actual = await customerApi.productsPage(query);
    assert.deepEqual(actual.data.map(product => product.id), expected.data.map(product => product.id));
    assert.equal(actual.total, expected.total);
    assert.equal(actual.catalogSource, 'sample');
    assert.deepEqual(await customerApi.products(query), actual.data);
  } finally { globalThis.fetch = original; }
});

test('commerce network failure never substitutes fabricated local availability', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try { await assert.rejects(() => customerApi.productsPage({}), /Cannot reach the shop service/); }
  finally { globalThis.fetch = original; }
});

test('serverless demo API applies filters and sorting before pagination identically', async () => {
  const query = { gender: 'Women', minPrice: '1000', maxPrice: '2000', size: 'M', minDiscount: '30', status: 'In Stock', sort: 'priceAsc', page: '2', limit: '1' };
  const expected = listProducts(query);
  let payload: any;
  const response = { statusCode: 0, setHeader() {}, end(body: string) { payload = JSON.parse(body); } };
  await handler({ method: 'GET', url: `/api/customer/products?${new URLSearchParams(query)}` } as any, response as any);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(payload.data.map(product => product.id), expected.data.map(product => product.id));
  assert.equal(payload.total, expected.total);
  assert.equal(payload.totalPages, expected.totalPages);
});

test('local demo catalog service matches the shared client filters', async () => {
  const previous = process.env.CATALOG_SOURCE;
  process.env.CATALOG_SOURCE = 'demo';
  try {
    const query = { brand: 'W', occasion: 'Work', maxPrice: 2000, sort: 'priceAsc', limit: 1, page: 2 };
    const expected = listProducts(query);
    const actual = await listPublicProducts(query);
    assert.deepEqual(actual.data.map(product => product.id), expected.data.map(product => product.id));
    assert.equal(actual.total, expected.total);
  } finally { if (previous === undefined) delete process.env.CATALOG_SOURCE; else process.env.CATALOG_SOURCE = previous; }
});

test('live catalog explicitly rejects unsupported advanced filters before connecting', async () => {
  const previous = process.env.CATALOG_SOURCE;
  process.env.CATALOG_SOURCE = 'mongo';
  try {
    await assert.rejects(() => listPublicProducts({ gender: 'Women' }), /sample-catalog only/);
  } finally { if (previous === undefined) delete process.env.CATALOG_SOURCE; else process.env.CATALOG_SOURCE = previous; }
});
