import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Navigate } from '../types';
import RetailImage from '../components/RetailImage';
import { useCommerce } from './CommerceContext';
import { formatMinor, safeStripeUrl, shopApi, ShopApiError, type AdminSummary } from './client';
import type { Cart, CheckoutAddress, CheckoutResult, PaymentMode, ShopOrder, ShopProduct, ShopSession } from './contracts';
import './commerce.css';
import * as Icons from '../components/Icons';

type Props = { navigate: Navigate };
const message = (error: unknown) => error instanceof Error ? error.message : 'The shop service is unavailable. Please retry.';
function ErrorNotice({ error, retry, busy = false }: { error: string | null; retry?: () => void; busy?: boolean }) {
  return error ? <div className="commerce-error" role="alert"><p>{error}</p>{retry && <button type="button" disabled={busy} onClick={retry}>Retry</button>}</div> : null;
}
function Page({ title, children, navigate }: Props & { title: string; children: React.ReactNode }) {
  return <main className="commerce-page"><button type="button" className="commerce-back" onClick={() => navigate('customer_search')}><Icons.ArrowBack size={15} />Back to the collection</button><p className="commerce-eyebrow">THE LITTLE DETAILS, TAKEN CARE OF</p><h1>{title}</h1>{children}</main>;
}
function ShoppingNotOpen({ navigate, title = 'Your shopping bag opens soon', checkout = false }: Props & { title?: string; checkout?: boolean }) {
  return <section className="commerce-service-state"><div className="commerce-service-art" aria-hidden="true"><span /><Icons.ShoppingBag size={62} strokeWidth={1} /><i>♡</i></div><p className="commerce-eyebrow">FOR NOW, FIND SOMETHING YOU LOVE</p><h2>{title}</h2><p>Explore the collection and keep your favourites close. {checkout ? 'Payments are not available in this store yet.' : 'Online orders are not available in this store yet.'}</p><div className="commerce-actions"><button type="button" className="commerce-primary" onClick={() => navigate('customer_search')}>Explore the collection<Icons.ArrowForward size={16} /></button><button type="button" onClick={() => navigate(checkout ? 'customer_cart' : 'customer_saved')}>{checkout ? 'Back to your bag' : 'View your wishlist'}</button></div></section>;
}
function Totals({ cart }: { cart: Pick<Cart, 'subtotalMinor' | 'shippingMinor' | 'totalMinor'> }) {
  return <dl className="commerce-totals"><div><dt>Subtotal</dt><dd>{formatMinor(cart.subtotalMinor)}</dd></div><div><dt>Shipping</dt><dd>{formatMinor(cart.shippingMinor)}</dd></div><div><dt>Total (INR)</dt><dd>{formatMinor(cart.totalMinor)}</dd></div></dl>;
}
export function CartScreen({ navigate }: Props) {
  const { cart, info, loading, error, refreshCart, updateItem, removeItem } = useCommerce();
  useEffect(() => { if (info?.cartAvailable) void refreshCart(); }, [refreshCart, info?.cartAvailable]);
  if (info?.cartAvailable === false) return <Page title="Your shopping bag." navigate={navigate}><ShoppingNotOpen navigate={navigate} /></Page>;
  return <Page title="Your shopping bag." navigate={navigate}>
    <ErrorNotice error={error} retry={() => void refreshCart()} busy={loading} />
    {loading && <p role="status">Updating your cart…</p>}
    {cart && cart.items.length === 0 && <section className="commerce-service-state"><Icons.ShoppingBag size={45} /><h2>A little room for something lovely.</h2><p>Your bag is empty. Find a piece that feels like you.</p><button type="button" className="commerce-primary" onClick={() => navigate('customer_search')}>Discover your next favourite<Icons.ArrowForward size={16} /></button></section>}
    {!!cart?.items.length && <div className="commerce-columns"><section aria-label="Cart items">{cart.items.map(item => <article className="commerce-cart-item" key={item.id}>
      {item.imageUrl && <RetailImage src={item.imageUrl} alt={item.name} loading="lazy" />}
      <div><button type="button" className="commerce-product-link" onClick={() => navigate('customer_product', { selectedProductId: item.productId })}>{item.name}</button><p>{item.brand} · {item.size} · {item.color}</p><p>{formatMinor(item.unitPriceMinor)} each</p>
        <label>Quantity for {item.name}<select value={item.quantity} disabled={loading} onChange={event => void updateItem(item.id, Number(event.target.value)).catch(() => {})}>{Array.from({ length: 10 }, (_, index) => index + 1).map(quantity => <option value={quantity} key={quantity} disabled={quantity > item.availableStock && quantity !== item.quantity}>{quantity}</option>)}</select></label>
        {item.quantity > item.availableStock && <p role="alert">Stock changed. {item.availableStock} available; reduce quantity or remove this item.</p>}
        <button type="button" disabled={loading} onClick={() => void removeItem(item.id).catch(() => {})}>Remove <span className="sr-only">{item.name}</span></button></div><strong>{formatMinor(item.lineTotalMinor)}</strong>
    </article>)}</section><aside className="commerce-panel"><h2>Order summary</h2><Totals cart={cart} /><p>Prices and stock are checked again when you place your order.</p><button type="button" className="commerce-primary" disabled={loading || !!error || cart.items.some(item => item.quantity > item.availableStock)} onClick={() => navigate('customer_checkout')}>Proceed to checkout</button></aside></div>}
  </Page>;
}

const ADDRESS_FIELDS: { key: Exclude<keyof CheckoutAddress, 'country'>; label: string; autoComplete: string; type?: string; pattern?: string; maxLength: number }[] = [
  { key: 'name', label: 'Full name', autoComplete: 'name', maxLength: 100 },
  { key: 'email', label: 'Email', autoComplete: 'email', type: 'email', maxLength: 200 },
  { key: 'phone', label: 'Indian mobile number', autoComplete: 'tel', type: 'tel', pattern: '(\\+91 ?)?[6-9][0-9]{9}', maxLength: 14 },
  { key: 'line1', label: 'Address line 1', autoComplete: 'address-line1', maxLength: 200 },
  { key: 'line2', label: 'Address line 2 (optional)', autoComplete: 'address-line2', maxLength: 200 },
  { key: 'city', label: 'City', autoComplete: 'address-level2', maxLength: 100 },
  { key: 'state', label: 'State', autoComplete: 'address-level1', maxLength: 100 },
  { key: 'postalCode', label: 'PIN code', autoComplete: 'postal-code', pattern: '[1-9][0-9]{5}', maxLength: 6 },
];
export function CheckoutScreen({ navigate }: Props) {
  const { cart, info, loading, error: cartError, refreshCart } = useCommerce();
  const [session, setSession] = useState<ShopSession | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [pending, setPending] = useState(false);
  const attempt = useRef<Parameters<typeof shopApi.checkout>[0] | null>(null);
  const inFlight = useRef(false);
  const loadSession = useCallback(async () => {
    setError(null); setBusy(true);
    try { const next = await shopApi.session(true); setSession(next); setPaymentMode(next.paymentModes[0] || ''); }
    catch (reason) { setError(message(reason)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (info?.checkoutAvailable) { void loadSession(); void refreshCart(); } }, [loadSession, refreshCart, info?.checkoutAvailable]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !paymentMode) return;
    if (!attempt.current) {
      const data = new FormData(event.currentTarget);
      const address = { country: 'IN' } as CheckoutAddress;
      for (const field of ADDRESS_FIELDS) address[field.key] = String(data.get(field.key) || '').trim();
      if (ADDRESS_FIELDS.some(field => field.key !== 'line2' && !address[field.key])) { setError('Complete every required address field.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) { setError('Enter a valid email address.'); return; }
      attempt.current = { address, paymentMode, idempotencyKey: crypto.randomUUID() };
    }
    inFlight.current = true; setPending(true); setBusy(true); setError(null);
    try {
      const next = await shopApi.checkout(attempt.current);
      setResult(next);
      await refreshCart();
    } catch (reason) {
      setError(message(reason));
      // Only a definite validation rejection permits an edited new attempt.
      // Network/timeout/conflict retries keep the exact body and idempotency key.
      if (reason instanceof ShopApiError && [400, 422].includes(reason.status)) { attempt.current = null; setPending(false); }
    } finally { setBusy(false); inFlight.current = false; }
  }
  const redirect = result?.checkoutUrl ? safeStripeUrl(result.checkoutUrl) : null;
  if (info && !info.checkoutAvailable) return <Page title="Checkout." navigate={navigate}><ShoppingNotOpen navigate={navigate} title="Good things take a little preparation." checkout={info.cartAvailable} /></Page>;
  return <Page title="Checkout" navigate={navigate}>
    <ol className="commerce-checkout-steps" aria-label="Checkout progress"><li><span>1</span>Your bag</li><li aria-current="step"><span>2</span>Delivery details</li><li><span>3</span>Payment</li></ol>
    <p>Guest checkout · Delivery within India. Your order history belongs to this browser's shop session.</p>
    {result ? <section className="commerce-panel" role="status"><h2>{result.order.paymentMode === 'demo' ? 'Demo order recorded — no payment collected' : 'Order created'}</h2><p>Order {result.order.id}</p><p>Server status: {result.order.status.replaceAll('_', ' ')}</p><Totals cart={result.order} />
      {result.order.paymentMode === 'stripe' && <p>Payment is confirmed only after the server receives verification from Stripe. Returning from a payment page does not confirm payment.</p>}
      {redirect && <a className="commerce-primary" href={redirect} rel="noreferrer">Continue to secure Stripe checkout</a>}
      {result.order.paymentMode === 'stripe' && !redirect && result.order.status === 'awaiting_payment' && <p role="alert">A safe payment link is unavailable. Check order history before trying again.</p>}
      <button type="button" onClick={() => navigate('customer_orders')}>View order history</button></section> : <>
      <ErrorNotice error={error} retry={!session ? () => void loadSession() : undefined} busy={busy} />
      <ErrorNotice error={cartError !== error ? cartError : null} retry={() => void refreshCart()} busy={loading} />
      {(!session || loading) && !error && <p role="status">Loading checkout…</p>}
      {session && !session.paymentModes.length && <p role="alert">Checkout is unavailable: no payment method is configured.</p>}
      {cart && !cart.items.length && !pending ? <div className="commerce-panel"><p>Your cart is empty.</p><button type="button" onClick={() => navigate('customer_search')}>Browse products</button></div> : session && <div className="commerce-columns"><form className="commerce-panel commerce-form" onSubmit={event => void submit(event)}>
        <h2>Delivery address</h2><fieldset disabled={busy || pending}>{ADDRESS_FIELDS.map(field => <label key={field.key}>{field.label}<input name={field.key} autoComplete={field.autoComplete} type={field.type || 'text'} pattern={field.pattern} maxLength={field.maxLength} required={field.key !== 'line2'} /></label>)}<p>Country: India</p>
          <label>Payment method<select value={paymentMode} onChange={event => setPaymentMode(event.target.value as PaymentMode)} required><option value="" disabled>Select a method</option>{session.paymentModes.map(mode => <option key={mode} value={mode}>{mode === 'demo' ? 'Demo — no payment collected' : 'Stripe secure checkout'}</option>)}</select></label>
        </fieldset>
        {paymentMode === 'demo' && <p className="commerce-note">This is a demonstration order, not a paid purchase or a promise of fulfilment.</p>}
        {pending && <p>Details are locked for this attempt. Retry uses the same order key to avoid duplicate orders. You can also check your order history.</p>}
        <button type="submit" className="commerce-primary" disabled={busy || loading || !paymentMode || (!pending && (!cart?.items.length || !!cartError))}>{busy ? 'Processing…' : pending ? 'Retry this checkout' : paymentMode === 'demo' ? 'Place demo order' : 'Create order & continue to payment'}</button>
        {pending && <button type="button" onClick={() => navigate('customer_orders')}>Check order history</button>}
      </form><aside className="commerce-panel"><h2>Order summary</h2>{cart && <><ul>{cart.items.map(item => <li key={item.id}>{item.name} · {item.size} × {item.quantity} — {formatMinor(item.lineTotalMinor)}</li>)}</ul><Totals cart={cart} /></>}<p>Server-calculated totals. Availability is rechecked on submission.</p></aside></div>}
    </>}
  </Page>;
}

export function OrdersScreen({ navigate }: Props) {
  const { info } = useCommerce();
  const [orders, setOrders] = useState<ShopOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try { setOrders(await shopApi.orders()); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }, []);
  useEffect(() => { if (info?.cartAvailable) void load(); }, [load, info?.cartAvailable]);
  async function cancel(order: ShopOrder) {
    if (cancelling) return;
    setCancelling(order.id); setError(null);
    try {
      const next = await shopApi.cancelOrder(order.id);
      setOrders(previous => previous?.map(item => item.id === next.id ? next : item) || previous);
    } catch (reason) { setError(message(reason)); }
    finally { setCancelling(null); }
  }
  if (info?.cartAvailable === false) return <Page title="Your orders." navigate={navigate}><ShoppingNotOpen navigate={navigate} title="Your next chapter starts here." /></Page>;
  return <Page title="Your orders." navigate={navigate}><p className="commerce-intro">All your finds, in one place. Orders are linked to this browser's guest session; keep your cookies to retain access.</p>{!info && <p role="status">Checking order availability…</p>}<button type="button" disabled={!info || busy || !!cancelling} onClick={() => void load()}><Icons.Refresh size={15} />{busy ? 'Refreshing…' : 'Refresh order status'}</button><ErrorNotice error={error} retry={() => void load()} busy={busy || !!cancelling} />
    {orders?.length === 0 && <p className="commerce-panel">No orders in this guest session yet.</p>}
    {orders?.map(order => <article key={order.id} className="commerce-panel commerce-order"><h2>Order {order.id}</h2><p><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('en-IN')}</time></p><strong>{order.paymentMode === 'demo' ? 'Demo — no payment collected' : order.status === 'paid' ? 'Payment confirmed' : `Payment status: ${order.status.replaceAll('_', ' ')}`}</strong><p>Order status: {order.status.replaceAll('_', ' ')}</p><ul>{order.items.map(item => <li key={item.id}>{item.name} · {item.size} · {item.color} × {item.quantity} — {formatMinor(item.lineTotalMinor)}</li>)}</ul><Totals cart={order} />{order.paymentMode === 'stripe' && order.status === 'awaiting_payment' && <div className="commerce-order-actions"><p className="commerce-note">This payment reservation is still open. Cancel only if you are not continuing to the secure payment page.</p><button type="button" disabled={!!cancelling} onClick={() => void cancel(order)}>{cancelling === order.id ? 'Cancelling…' : 'Cancel payment attempt'}</button></div>}</article>)}
  </Page>;
}

export function CompareScreen({ navigate }: Props) {
  const { comparison, toggleCompare } = useCommerce();
  const rows = [
    ['Brand', (p: typeof comparison[number]) => p.brand],
    ['Catalog price', (p: typeof comparison[number]) => formatMinor(Math.round(p.price * 100))],
    ['Fabric', (p: typeof comparison[number]) => p.fabricType],
    ['Composition', (p: typeof comparison[number]) => p.materialComposition ? `${p.materialComposition}${p.compositionVerified ? ' (verified)' : ' (not verified)'}` : undefined],
    ['Fit', (p: typeof comparison[number]) => p.fit], ['Pattern', (p: typeof comparison[number]) => p.pattern],
    ['Color', (p: typeof comparison[number]) => p.color], ['Care', (p: typeof comparison[number]) => p.careInstructions],
    ['Returns', (p: typeof comparison[number]) => p.returnPolicy], ['Catalog source', (p: typeof comparison[number]) => p.inventorySource],
  ] as const;
  return <Page title="Compare products" navigate={navigate}><p>Compare up to four products. Adding a fifth replaces the oldest. These are saved product snapshots; open each product for current price and availability.</p>
    {!comparison.length ? <div className="commerce-panel"><p>No products selected. Use Compare on a product to add it here.</p><button type="button" onClick={() => navigate('customer_search')}>Browse products</button></div> : <div className="commerce-table-scroll" role="region" aria-label="Product comparison" tabIndex={0}><table className="commerce-table"><caption>Fabric and product specifications</caption><thead><tr><th scope="col">Specification</th>{comparison.map(product => <th scope="col" key={product.id}>{product.imageUrl && <RetailImage src={product.imageUrl} alt={product.name} loading="lazy" />}<button type="button" onClick={() => navigate('customer_product', { selectedProductId: product.id })}>{product.name}</button><button type="button" onClick={() => toggleCompare(product)} aria-label={`Remove ${product.name} from comparison`}>Remove</button></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{comparison.map(product => <td key={product.id}>{value(product) || 'Not provided'}</td>)}</tr>)}</tbody></table></div>}
  </Page>;
}

export function AdminScreen({ navigate }: Props) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState('');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [json, setJson] = useState('');
  const [source, setSource] = useState('');
  const [permission, setPermission] = useState(false);
  const load = useCallback(async () => {
    setError(null); setChecking(true); setSummary(null);
    try { const session = await shopApi.session(true); setAuthorized(session.admin); if (session.admin) setSummary(await shopApi.adminSummary()); }
    catch (reason) { setError(message(reason)); } finally { setChecking(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await shopApi.adminLogin(token); setToken(''); await load(); }
    catch (reason) { setError(message(reason)); } finally { setToken(''); setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError(null);
    try { await shopApi.adminLogout(); setAuthorized(false); setSummary(null); setJson(''); setNotice('Signed out.'); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  async function importBatch(event: React.FormEvent) {
    event.preventDefault(); setError(null); setNotice('');
    try {
      if (!permission || !source.trim()) throw new Error('Provide a source and confirm you are authorized to import it.');
      if (json.length > 1000000) throw new Error('Batch exceeds 1 MB. Split it into smaller batches.');
      const products: unknown = JSON.parse(json);
      if (!Array.isArray(products) || products.length < 1 || products.length > 100) throw new Error('Provide a JSON array containing 1–100 products.');
      setBusy(true);
      const result = await shopApi.importProducts({ source: source.trim(), authorized: true, products: products as ShopProduct[] });
      setNotice(`Server confirmed ${result.imported} products imported.`); setJson('');
      await load();
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  return <Page title="Catalog administration" navigate={navigate}><p>Restricted access for authorized operators. This page does not grant administration privileges.</p><ErrorNotice error={error} retry={() => void load()} busy={checking || busy} />{notice && <p role="status">{notice}</p>}
    {checking ? <p role="status">Checking authorization…</p> : !authorized ? <form className="commerce-panel commerce-form" onSubmit={event => void login(event)}><h2>Administrator sign-in</h2><label>Admin token<input type="password" name="admin-token" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} required /></label><button type="submit" className="commerce-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p>The token is used once to establish a server session and is not saved in browser storage.</p></form> : <>
      <div className="commerce-actions"><button type="button" disabled={busy} onClick={() => void load()}>Refresh summary</button><button type="button" disabled={busy} onClick={() => void logout()}>Sign out</button></div>
      {summary && <section className="commerce-panel"><h2>Server summary</h2><p>Catalog mode: <strong>{summary.mode}</strong>{summary.mode === 'sample' ? ' — demonstration inventory' : ''}</p><dl className="commerce-totals"><div><dt>Products</dt><dd>{summary.products}</dd></div><div><dt>Orders</dt><dd>{summary.orders}</dd></div><div><dt>Low-stock products</dt><dd>{summary.lowStock}</dd></div></dl></section>}
      <form className="commerce-panel commerce-form" onSubmit={event => void importBatch(event)}><h2>Authorized product import</h2><p>Upload or paste a JSON array of ShopProduct records (1–100 per batch, maximum 1 MB). The server validates products and inventory provenance before importing.</p><label>Source / authorization reference<input value={source} onChange={event => setSource(event.target.value)} required maxLength={120} disabled={busy} /></label>
        <label>JSON file<input type="file" accept="application/json,.json" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1000000) { setError('File exceeds 1 MB.'); return; } try { setJson(await file.text()); setError(null); } catch { setError('Unable to read this file.'); } }} /></label>
        <label>Product JSON<textarea rows={12} value={json} onChange={event => setJson(event.target.value)} maxLength={1000000} required disabled={busy} spellCheck={false} /></label>
        <label className="commerce-checkbox"><input type="checkbox" checked={permission} onChange={event => setPermission(event.target.checked)} required disabled={busy} />I am authorized to publish these products and their images.</label><button type="submit" className="commerce-primary" disabled={busy || !permission}>{busy ? 'Importing…' : 'Validate & import batch'}</button>
      </form>
    </>}
  </Page>;
}
