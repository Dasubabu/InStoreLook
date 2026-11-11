import React, { useEffect, useRef, useState } from 'react';
import type { Navigate } from '../../types';
import type { ShopProduct } from '../../commerce/contracts';
import { shopApi } from '../../commerce/client';
import { useCommerce } from '../../commerce/CommerceContext';
import { useWishlist } from '../../context/WishlistContext';
import ProductGallery from './ProductGallery';
import ProductCard from './ProductCard';
import FabricGuide from './FabricGuide';
import { galleryMedia, runExclusiveAction, selectedVariant, variantAvailability } from './productGalleryHelpers';

interface Props { navigate: Navigate; productId?: string }
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const button = 'min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-40';

export default function ProductDetailScreen({ navigate, productId }: Props) {
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const pendingAdd = useRef(false);
  const viewRevision = useRef(0);
  const [cartError, setCartError] = useState('');
  const [notice, setNotice] = useState('');
  const [related, setRelated] = useState<ShopProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState('');
  const [relatedRetry, setRelatedRetry] = useState(0);
  const { has, toggle, count: savedCount } = useWishlist();
  const { cart, info, addItem, comparison, toggleCompare, recentlyViewed, rememberProduct } = useCommerce();

  useEffect(() => {
    let active = true;
    viewRevision.current++;
    setProduct(null); setSize(''); setColor(''); setQuantity(1); setNotice(''); setCartError('');
    setError('');
    if (!productId) { setError('No product was selected.'); setLoading(false); return; }
    setLoading(true);
    shopApi.product(productId)
      .then(result => {
        if (!active) return;
        setProduct(result);
        const choices = [...new Set(result.variants.map(variant => variant.color).filter(Boolean))];
        if (choices.length === 1) setColor(choices[0]);
      })
      .catch(reason => { if (active) setError(errorMessage(reason, 'Unable to load this product.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; viewRevision.current++; };
  }, [productId, retry]);

  useEffect(() => { if (product) rememberProduct({ ...product, imageUrl: galleryMedia(product)[0]?.url ?? product.imageUrl }); }, [product, rememberProduct]);

  useEffect(() => {
    if (!product) return;
    let active = true;
    setRelated([]); setRelatedError(''); setRelatedLoading(true);
    // A single bounded category query; no catalog-wide client filtering.
    shopApi.products({ category: product.category, gender: product.gender, page: 1, limit: 7 })
      .then(page => { if (active) setRelated(page.data.filter(item => item.id !== product.id).slice(0, 6)); })
      .catch(reason => { if (active) setRelatedError(errorMessage(reason, 'Similar products could not be loaded.')); })
      .finally(() => { if (active) setRelatedLoading(false); });
    return () => { active = false; };
  }, [product, relatedRetry]);

  const header = <header className="product-detail-header flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
    <button type="button" className={button} onClick={() => navigate('customer_search')}>← Browse</button>
    <nav className="flex flex-wrap gap-2" aria-label="Shopping shortcuts">
      <button type="button" className={button} onClick={() => navigate('customer_saved')}>Wishlist ({savedCount})</button>
      <button type="button" className={button} onClick={() => navigate('customer_compare')}>Compare ({comparison.length})</button>
      <button type="button" className={button} onClick={() => navigate('customer_cart')}>Cart{cart ? ` (${cart.items.reduce((total, item) => total + item.quantity, 0)})` : ''}</button>
    </nav>
  </header>;

  if (loading) return <div className="product-detail-screen bg-white">{header}<div role="status" className="mx-auto grid max-w-6xl gap-8 p-6 md:grid-cols-2"><div className="aspect-[4/5] rounded-2xl shimmer-skeleton" /><div className="space-y-4"><p className="text-sm text-slate-500">Loading product…</p><div className="h-10 rounded shimmer-skeleton" /><div className="h-32 rounded shimmer-skeleton" /></div></div></div>;
  if (error || !product) return <div className="product-detail-screen bg-white">{header}<div className="mx-auto max-w-lg px-6 py-20 text-center"><h1 className="text-xl font-bold">Product unavailable</h1><p role="alert" className="my-4 text-sm text-slate-600">{error || 'This product could not be loaded.'}</p><button type="button" className={button} onClick={() => setRetry(value => value + 1)}>Try again</button></div></div>;

  const variant = selectedVariant(product.variants, size, color);
  const sizes = [...new Set<string>(product.variants.map(item => item.size))];
  const colors = [...new Set<string>(product.variants.map(item => item.color).filter(Boolean))];
  const cartAvailable = info?.cartAvailable === true;
  const soldOut = product.status === 'Out of Stock' || product.stock <= 0 || !product.variants.some(item => item.stock > 0);
  const price = variant ? variant.priceMinor / 100 : product.price;
  const discount = product.mrp && product.mrp > price ? Math.round((product.mrp - price) / product.mrp * 100) : 0;
  const saved = has(product.id);
  const compared = comparison.some(item => item.id === product.id);
  const recent = recentlyViewed.filter(item => item.id !== product.id).slice(0, 6);

  const addToCart = async () => {
    if (pendingAdd.current) return;
    setNotice(''); setCartError('');
    if (!variant) { setCartError('Select an available color and size before adding to your cart.'); return; }
    if (soldOut || !Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(10, variant.stock)) { setCartError('This selection is no longer available in that quantity.'); return; }
    const revision = viewRevision.current;
    await runExclusiveAction(pendingAdd, async () => {
      setAdding(true);
      try { await addItem(product.id, variant.id, quantity); if (viewRevision.current === revision) setNotice(`${quantity} item${quantity === 1 ? '' : 's'} added to your cart.`); }
      catch (reason) { if (viewRevision.current === revision) setCartError(errorMessage(reason, 'Could not add this item. Please try again.')); }
      finally { setAdding(false); }
    });
  };

  const compareProduct = (item: ShopProduct) => {
    try { toggleCompare({ ...item, imageUrl: galleryMedia(item)[0]?.url ?? item.imageUrl }); setCartError(''); }
    catch (reason) { setCartError(errorMessage(reason, 'Unable to change your comparison.')); }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: window.location.href });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); setNotice('Product link copied.'); }
      else setNotice('Sharing is unavailable in this browser. You can copy the address from your browser.');
    } catch (reason) { if (!(reason instanceof Error && reason.name === 'AbortError')) setNotice('Unable to share this product link.'); }
  };

  const cards = (items: ShopProduct[]) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{items.map(item => <ProductCard key={item.id} product={item} onOpen={id => navigate('customer_product', { selectedProductId: id })} onCompare={() => compareProduct(item)} compared={comparison.some(entry => entry.id === item.id)} />)}</div>;

  return <div className="product-detail-screen bg-white text-slate-900">
    {header}
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-500">{product.category}{product.gender ? ` / ${product.gender}` : ''}</p><nav className="product-detail-jumps flex flex-wrap gap-4 text-xs font-semibold text-teal-800" aria-label="On this product page"><a href="#product-specifications">Details & fabric</a><a href="#product-size-chart">Size chart</a><a href="#similar-products">Similar products</a></nav></div>
      <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery key={product.id} product={product} />
        <section className="min-w-0 space-y-5" aria-label="Product information">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-800">{product.brand}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
            <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium">{product.inventorySource === 'sample' ? 'Sample catalog · illustrative price and stock' : product.inventoryVerified ? 'Live catalog · inventory marked verified' : 'Live catalog · inventory unverified'}</p>
            {typeof product.rating === 'number' && Number.isFinite(product.rating) && product.rating >= 0 && product.rating <= 5 && <p className="mt-3 text-sm font-medium" aria-label={`Catalog-supplied rating ${product.rating} out of 5`}>★ {product.rating} / 5{typeof product.ratingCount === 'number' && product.ratingCount >= 0 ? ` · ${product.ratingCount} ratings` : ''}<span className="ml-2 text-xs text-slate-500">Catalog-supplied rating</span></p>}
            <div className="mt-4 flex flex-wrap items-baseline gap-3"><strong className="text-3xl">{money(price)}</strong>{product.mrp && product.mrp > price ? <><del className="text-sm text-slate-500">{money(product.mrp)}</del><span className="text-sm font-semibold text-teal-800">{discount}% off</span></> : null}</div>
            <p className={`mt-2 text-xs font-semibold ${soldOut ? 'text-rose-700' : 'text-teal-800'}`}>{soldOut ? 'Out of stock' : variant ? `${variant.stock} available in this selection` : 'Choose a size and color to check the exact variant'}</p>
          </div>

          {colors.length > 0 && <fieldset disabled={adding || soldOut}><legend className="mb-2 text-sm font-bold">Color{color ? `: ${color}` : ' · select one'}</legend><div className="flex flex-wrap gap-2">{colors.map(value => {
            const available = variantAvailability(product.variants, '', value) === 'available';
            const combination = variantAvailability(product.variants, size, value);
            const suffix = !available ? ' · sold out' : size && combination !== 'available' ? ` · ${combination === 'not-offered' ? 'not offered' : 'sold out'} in ${size}` : '';
            return <button type="button" key={value} aria-pressed={color === value} disabled={!available} className={`${button} ${color === value ? 'product-option-selected !border-teal-700 bg-teal-50 text-teal-900' : ''}`} onClick={() => {
              setColor(value); setQuantity(1); setNotice(''); setCartError('');
              if (size && !selectedVariant(product.variants, size, value)) { setSize(''); setNotice(`Size ${size} is unavailable in ${value}. Choose another size.`); }
            }}>{value}{suffix}</button>;
          })}</div></fieldset>}
          <fieldset disabled={adding || soldOut}><legend className="mb-2 text-sm font-bold">Size{size ? `: ${size}` : ' · select one'}</legend><div className="flex flex-wrap gap-2">{sizes.map(value => {
            const availability = variantAvailability(product.variants, value, color);
            return <button type="button" key={value} disabled={availability !== 'available'} aria-pressed={size === value} className={`${button} ${size === value ? 'product-option-selected !border-teal-700 bg-teal-50 text-teal-900' : ''}`} onClick={() => { setSize(value); setQuantity(1); setNotice(''); setCartError(''); }}>{value}{availability === 'sold-out' ? ' · sold out' : availability === 'not-offered' ? ' · not offered' : ''}</button>;
          })}</div>{!sizes.length && <p className="text-sm text-slate-500">Size options unavailable.</p>}</fieldset>
          {(size || color) && <button type="button" disabled={adding} className="min-h-11 text-xs font-semibold text-teal-800 underline" onClick={() => { setSize(''); setColor(''); setQuantity(1); setNotice(''); setCartError(''); }}>Clear size & color selection</button>}

          {cartAvailable && <div className="flex items-center gap-3"><label htmlFor="product-quantity" className="text-sm font-semibold">Quantity</label><select id="product-quantity" value={quantity} disabled={!variant || adding || soldOut} className={button} onChange={event => setQuantity(Number(event.target.value))}>{Array.from({ length: Math.min(10, variant?.stock ?? 1) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></div>}
          <div className="product-purchase-actions sticky bottom-0 z-10 -mx-2 rounded-2xl border border-slate-100 bg-white/95 p-2 shadow-sm backdrop-blur" aria-busy={adding}>
            <div className="flex flex-wrap gap-2">{info?.cartAvailable !== false && <button type="button" disabled={!cartAvailable || soldOut || adding} onClick={() => void addToCart()} className="product-add-button min-h-12 flex-1 rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{!info ? 'Checking availability…' : adding ? 'Adding…' : soldOut ? 'Out of stock' : 'Add to bag'}</button>}<button type="button" className={`${button} ${!cartAvailable ? 'product-save-primary' : ''}`} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => toggle({ ...product, imageUrl: galleryMedia(product)[0]?.url ?? product.imageUrl })}>{saved ? '♥ Saved to your wishlist' : '♡ Save to your wishlist'}</button></div>
            {info?.cartAvailable === false && <p className="product-shopping-note">Browse, compare and save your favourites. Online ordering is not open for this collection yet.</p>}
            {cartError && <p role="alert" className="mt-2 text-sm text-rose-700">{cartError}</p>}
            {notice && <p role="status" className="mt-2 text-sm text-teal-800">{notice}</p>}
            {(notice || cartError) && <button type="button" className="mt-2 min-h-10 text-sm font-bold text-teal-800 underline" onClick={() => navigate('customer_cart')}>View cart →</button>}
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" className={button} aria-pressed={compared} onClick={() => compareProduct(product)}>{compared ? 'Remove from comparison' : 'Add to comparison'}</button><button type="button" className={button} onClick={() => void share()}>Share product</button></div>

          <section className="product-delivery-info border-t border-slate-100 pt-5" aria-labelledby="delivery-title"><h2 id="delivery-title" className="text-sm font-bold">Delivery & returns</h2><p className="mt-3 text-sm text-slate-600">{product.deliveryNote || (cartAvailable ? 'Review the delivery address and available charges at checkout.' : 'Online ordering is not open for this collection.')}</p><p className="mt-3 text-sm text-slate-600"><strong>Return policy: </strong>{product.returnPolicy || 'Check return eligibility with the retailer before purchasing.'}</p></section>
        </section>
      </div>

      <section id="product-specifications" className="mt-10 grid gap-6 border-t border-slate-100 pt-8 md:grid-cols-2" aria-label="Product specifications and fabric information">
        <div className="space-y-5"><div><h2 className="text-lg font-bold">About this product</h2><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description || 'Description unavailable.'}</p></div>
          <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5">{[['Fabric', product.fabricType], ['Fit', product.fit], ['Pattern', product.pattern], ['Occasion', product.occasion]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value || 'Unavailable'}</dd></div>)}</dl>
          <div><h3 className="text-sm font-bold">Material composition</h3><p className="mt-2 text-sm text-slate-600">{product.materialComposition || 'Composition unavailable.'}</p><p className="mt-2 text-xs font-semibold text-slate-500">{product.materialComposition ? product.compositionVerified === true ? 'Composition marked verified by the catalog.' : 'Unverified composition · supplied catalog claim.' : 'Verification unavailable without composition data.'}</p></div>
          <div><h3 className="text-sm font-bold">Care instructions</h3><p className="mt-2 whitespace-pre-line text-sm text-slate-600">{product.careInstructions || 'Care instructions unavailable. Check the garment label before cleaning.'}</p></div>
          <FabricGuide />
        </div>
        <div id="product-size-chart"><h2 className="text-lg font-bold">Size chart</h2>{product.sizeChart?.length ? <><div className="mt-3 overflow-x-auto rounded-xl border border-slate-200" role="region" aria-label="Size measurements" tabIndex={0}><table className="w-full text-left text-sm"><caption className="sr-only">Supplied size chart; measurements in centimeters</caption><thead className="bg-slate-50"><tr>{['Size', 'Chest (cm)', 'Waist (cm)', 'Length (cm)'].map(label => <th scope="col" key={label} className="p-3 font-semibold">{label}</th>)}</tr></thead><tbody>{product.sizeChart.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t border-slate-100"><th scope="row" className="p-3">{row.label}</th>{[row.chestCm, row.waistCm, row.lengthCm].map((value, column) => <td key={column} className="p-3">{typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 'Unavailable'}</td>)}</tr>)}</tbody></table></div><p className="mt-2 text-xs text-slate-500">Measurements as supplied by the retailer.</p></> : <p className="mt-3 text-sm text-slate-500">Size chart unavailable. No measurements have been inferred.</p>}{product.sizeChartNote && <p className="mt-3 text-sm text-slate-600">{product.sizeChartNote}</p>}</div>
      </section>

      <section className="mt-10 border-t border-slate-100 pt-8" aria-labelledby="similar-products"><h2 id="similar-products" className="mb-4 text-lg font-bold">Similar products</h2>{relatedLoading ? <p role="status" className="text-sm text-slate-500">Loading similar products…</p> : relatedError ? <div><p role="alert" className="mb-3 text-sm text-rose-700">{relatedError}</p><button type="button" className={button} onClick={() => setRelatedRetry(value => value + 1)}>Retry similar products</button></div> : related.length ? cards(related) : <p className="text-sm text-slate-500">No similar products are available in this category.</p>}</section>
      {recent.length > 0 && <section className="mt-10 border-t border-slate-100 pt-8" aria-labelledby="recent-products"><h2 id="recent-products" className="mb-4 text-lg font-bold">Recently viewed</h2><p className="mb-3 text-xs text-slate-500">Saved browsing snapshots. Open a product for current price and availability.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{recent.map(item => <ProductCard key={item.id} product={item} onOpen={id => navigate('customer_product', { selectedProductId: id })} />)}</div></section>}
    </main>
  </div>;
}
