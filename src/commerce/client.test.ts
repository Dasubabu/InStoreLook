import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createShopApi, formatMinor, safeStripeUrl, ShopApiError } from './client';
import { productSnapshot, readSnapshots, writeSnapshots } from './persistence';
import { parseLocationRoute, pathForScreen } from '../routing';
import type { Screen } from '../types';

const session = { csrfToken: 'csrf-in-memory', mode: 'sample', paymentModes: ['demo'], admin: false };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('cart mutations initialize a cookie session once and send CSRF without bearer secrets', async () => {
  const calls: { path: string; init: RequestInit }[] = [];
  const api = createShopApi(async (input, init) => {
    calls.push({ path: String(input), init: init! });
    return response(String(input).endsWith('/session') ? session : { data: { items: [], totalMinor: 12345 } });
  });
  await Promise.all([api.session(), api.session(), api.session(true)]);
  await api.addItem('item/one', 'size-m', 2);
  await api.removeItem('line/one');
  assert.equal(calls.filter(call => call.path.endsWith('/session')).length, 1);
  assert.equal(calls[1].init.credentials, 'same-origin');
  assert.equal(new Headers(calls[1].init.headers).get('X-CSRF-Token'), session.csrfToken);
  assert.equal(new Headers(calls[1].init.headers).get('Authorization'), null);
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { productId: 'item/one', variantId: 'size-m', quantity: 2 });
  assert.equal(calls[2].path, '/api/shop/cart/items/line%2Fone');
});

test('server error code, message and HTTP status survive; mutations are never auto-replayed', async () => {
  let mutations = 0;
  const api = createShopApi(async (input) => {
    if (String(input).endsWith('/session')) return response(session);
    mutations++;
    return response({ error: { code: 'OUT_OF_STOCK', message: 'Only one item remains.' } }, 409);
  });
  await assert.rejects(api.addItem('p', 'v', 2), error => error instanceof ShopApiError && error.code === 'OUT_OF_STOCK' && error.status === 409 && error.message === 'Only one item remains.');
  assert.equal(mutations, 1);
});

test('HTML fallback and network outages are failures, never fabricated cart success', async () => {
  const invalid = createShopApi(async () => new Response('<html>SPA</html>'));
  await assert.rejects(invalid.cart(), (error: ShopApiError) => error.code === 'INVALID_RESPONSE');
  const offline = createShopApi(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.cart(), (error: ShopApiError) => error.code === 'NETWORK_ERROR');
});

test('expired CSRF invalidates the session but leaves retry under caller control', async () => {
  let sessionCalls = 0;
  let mutationCalls = 0;
  const api = createShopApi(async input => {
    if (String(input).endsWith('/session')) { sessionCalls++; return response(session); }
    mutationCalls++;
    return response({ error: { code: 'CSRF', message: 'Session expired.' } }, 403);
  });
  await assert.rejects(api.removeItem('id'));
  assert.equal(mutationCalls, 1);
  await api.session();
  assert.equal(sessionCalls, 2);
});

test('checkout retries preserve the explicit idempotency key and the exact request body', async () => {
  const bodies: string[] = [];
  const api = createShopApi(async (input, init) => {
    if (String(input).endsWith('/session')) return response(session);
    bodies.push(String(init?.body));
    if (bodies.length === 1) throw new TypeError('Response was lost');
    return response({ data: { order: { id: 'one-order', status: 'placed', paymentMode: 'demo' } } });
  });
  const body = { idempotencyKey: 'same-request-key', paymentMode: 'demo' as const, address: { name: 'Test', email: 'test@example.com', phone: '9876543210', line1: '1 Example', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' as const } };
  await assert.rejects(api.checkout(body));
  const result = await api.checkout(body);
  assert.deepEqual(bodies, [JSON.stringify(body), JSON.stringify(body)]);
  assert.equal(result.order.status, 'placed');
});

test('payment redirect accepts only credential-free HTTPS checkout.stripe.com', () => {
  assert.equal(safeStripeUrl('https://checkout.stripe.com/c/pay/test'), 'https://checkout.stripe.com/c/pay/test');
  for (const url of ['javascript:alert(1)', 'http://checkout.stripe.com/x', 'https://checkout.stripe.com.evil.test/x', 'https://checkout.stripe.com@evil.test/x', 'https://user:pass@checkout.stripe.com/x', 'https://checkout.stripe.com:444/x', '/paid?success=true']) assert.equal(safeStripeUrl(url), null);
  assert.equal(formatMinor(149900), '₹1,499.00');
  assert.equal(formatMinor(105), '₹1.05');
});

test('order cancellation uses the session CSRF boundary and encodes the order id', async () => {
  const calls: { path: string; init: RequestInit }[] = [];
  const api = createShopApi(async (input, init) => {
    calls.push({ path: String(input), init: init! });
    return response(String(input).endsWith('/session') ? session : { data: { id: 'order/one', status: 'cancelled', paymentMode: 'stripe' } });
  });
  const order = await api.cancelOrder('order/one');
  assert.equal(order.status, 'cancelled');
  assert.equal(calls[1].path, '/api/shop/orders/order%2Fone/cancel');
  assert.equal(calls[1].init.method, 'POST');
  assert.equal(new Headers(calls[1].init.headers).get('X-CSRF-Token'), session.csrfToken);
});

test('comparison and recent persistence are bounded whitelisted non-sensitive snapshots', () => {
  const values = Array.from({ length: 20 }, (_, index) => ({ id: String(index), name: `Product ${index}`, price: 100, fabricType: 'Cotton', address: 'private', paymentKey: 'secret', token: 'admin-secret' }));
  let saved = '';
  writeSnapshots({ setItem: (_key, value) => { saved = value; } }, 'comparison', values, 4);
  assert.equal(JSON.parse(saved).length, 4);
  assert.ok(!saved.includes('private') && !saved.includes('secret') && !saved.includes('paymentKey'));
  assert.deepEqual(Object.keys(productSnapshot(values[0])).sort(), ['fabricType', 'id', 'name', 'price']);
  assert.equal(readSnapshots({ getItem: () => JSON.stringify(values) }, 'recent', 12).length, 12);
  assert.deepEqual(readSnapshots({ getItem: () => 'not-json' }, 'recent', 12), []);
  assert.deepEqual(readSnapshots({ getItem: () => JSON.stringify([{ id: 3 }, null]) }, 'recent', 12), []);
  assert.doesNotThrow(() => writeSnapshots({ setItem: () => { throw new Error('quota'); } }, 'recent', values, 12));
});

test('commerce URLs and added search filters round trip without dropping existing filters', () => {
  for (const name of ['cart', 'checkout', 'orders', 'compare', 'admin']) {
    const screen = `customer_${name}` as Screen;
    assert.equal(pathForScreen(screen), `/${name}`);
    assert.equal(parseLocationRoute({ pathname: `/${name}`, search: '?paid=true' }).screen, screen);
  }
  const params = { searchQuery: 'shirt', searchBrand: 'W', searchCategory: 'Kurtas', searchGender: 'Women', searchMinPrice: 0, searchMaxPrice: 5000, searchSize: 'M', searchColor: 'Blue', searchOccasion: 'Work', searchMinDiscount: 10, searchStatus: 'In Stock', searchSort: 'priceAsc', searchFabric: 'Cotton', searchFit: 'Regular', searchPattern: 'Solid', searchMinRating: 4 };
  const route = parseLocationRoute({ pathname: pathForScreen('customer_search', params)! });
  for (const [key, value] of Object.entries(params)) assert.equal(route.params[key], value);
  assert.equal(parseLocationRoute({ pathname: '/search' }).params.searchFabric, undefined);
});
