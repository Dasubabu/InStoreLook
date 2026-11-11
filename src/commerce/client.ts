import type { Cart, CheckoutAddress, CheckoutResult, PaymentMode, ShopFacets, ShopInfo, ShopOrder, ShopPage, ShopProduct, ShopQuery, ShopSession } from './contracts';

export class ShopApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message); this.name = 'ShopApiError'; }
}
export interface AdminSummary { products: number; orders: number; lowStock: number; mode: 'sample' | 'live' }

/** Cookie sessions and CSRF tokens stay in memory; no credentials enter web storage. */
export function createShopApi(fetcher: typeof fetch = (input, init) => fetch(input, init)) {
  let sessionPromise: Promise<ShopSession> | undefined;
  let sessionLoading = false;
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-CSRF-Token'] = (await session()).csrfToken;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher(`/api/shop${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store', signal: controller.signal, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) sessionPromise = undefined;
        throw new ShopApiError(typeof payload?.error?.code === 'string' ? payload.error.code : 'HTTP_ERROR', typeof payload?.error?.message === 'string' ? payload.error.message : `Shop service returned ${response.status}. Please retry.`, response.status);
      }
      if (!payload || typeof payload !== 'object') throw new ShopApiError('INVALID_RESPONSE', 'The shop service returned an invalid response. Please retry.', response.status);
      return payload as T;
    } catch (error) {
      if (error instanceof ShopApiError) throw error;
      throw new ShopApiError('NETWORK_ERROR', 'Cannot reach the shop service. Check your connection and retry.');
    } finally { clearTimeout(timer); }
  }
  function session(refresh = false): Promise<ShopSession> {
    // Concurrent initial refreshes must not create competing guest cookies.
    if (refresh && !sessionLoading) sessionPromise = undefined;
    if (!sessionPromise) {
      sessionLoading = true;
      sessionPromise = request<ShopSession>('/session').then(value => {
        if (typeof value.csrfToken !== 'string' || !value.csrfToken || !Array.isArray(value.paymentModes) || value.paymentModes.some(mode => mode !== 'demo' && mode !== 'stripe')) throw new ShopApiError('INVALID_RESPONSE', 'The shop session is unavailable. Please retry.');
        return value;
      }).catch(error => { sessionPromise = undefined; throw error; }).finally(() => { sessionLoading = false; });
    }
    return sessionPromise;
  }
  async function data<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const result = await request<{ data: T }>(path, method, body);
    if (!('data' in result)) throw new ShopApiError('INVALID_RESPONSE', 'The shop service returned an invalid response. Please retry.');
    return result.data;
  }
  return {
    info: async () => {
      const value = await data<ShopInfo>('/info');
      if (!value || !['sample', 'live'].includes(value.mode) || typeof value.cartAvailable !== 'boolean' || typeof value.checkoutAvailable !== 'boolean' || !Array.isArray(value.paymentModes)) throw new ShopApiError('INVALID_RESPONSE', 'Shopping availability could not be checked. Please retry.');
      return value;
    },
    session,
    products: (query: ShopQuery = {}) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
      return request<ShopPage>(`/products?${params}`);
    },
    product: (id: string) => data<ShopProduct>(`/products/${encodeURIComponent(id)}`),
    facets: () => data<ShopFacets>('/facets'),
    suggestions: (q: string) => data<string[]>(`/suggestions?q=${encodeURIComponent(q)}`),
    cart: async () => { await session(); return data<Cart>('/cart'); },
    addItem: (productId: string, variantId: string, quantity: number) => data<Cart>('/cart/items', 'POST', { productId, variantId, quantity }),
    updateItem: (id: string, quantity: number) => data<Cart>(`/cart/items/${encodeURIComponent(id)}`, 'PATCH', { quantity }),
    removeItem: (id: string) => data<Cart>(`/cart/items/${encodeURIComponent(id)}`, 'DELETE'),
    checkout: (body: { address: CheckoutAddress; paymentMode: PaymentMode; idempotencyKey: string }) => data<CheckoutResult>('/checkout', 'POST', body),
    orders: async () => { await session(); return data<ShopOrder[]>('/orders'); },
    order: (id: string) => data<ShopOrder>(`/orders/${encodeURIComponent(id)}`),
    cancelOrder: (id: string) => data<ShopOrder>(`/orders/${encodeURIComponent(id)}/cancel`, 'POST'),
    adminLogin: async (token: string) => { await request('/admin/login', 'POST', { token }); return session(true); },
    adminLogout: async () => { await request('/admin/logout', 'POST'); return session(true); },
    adminSummary: () => data<AdminSummary>('/admin/summary'),
    importProducts: (body: { source: string; authorized: true; products: ShopProduct[] }) => data<{ imported: number }>('/admin/import', 'POST', body),
  };
}
export const shopApi = createShopApi();
export const formatMinor = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount / 100);
export function safeStripeUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
}
