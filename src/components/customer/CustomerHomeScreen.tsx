import React, { useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import * as Icons from '../Icons';
import type { Navigate } from '../../types';
import { shopApi, ShopApiError } from '../../commerce/client';
import type { ShopFacets, ShopPage, ShopProduct } from '../../commerce/contracts';
import { useCommerce } from '../../commerce/CommerceContext';
import RetailImage from '../RetailImage';
import ProductCard from './ProductCard';
import { boundedFacets, catalogImage, catalogModeLabel, checkShopPage, EMPTY_FACETS, HOME_RAIL_LIMIT, HOME_RAIL_QUERIES, homeDepartments } from './storefrontHelpers';
import './customer-home.css';

interface Props { navigate: Navigate }
type SearchParams = NonNullable<Parameters<Navigate>[1]>;

function SectionHeading({ eyebrow, title, action = 'Explore all', onAction }: { eyebrow: string; title: string; action?: string; onAction: () => void }) {
  return <div className="isl-section-heading"><div><p className="isl-eyebrow">{eyebrow}</p><h2>{title}</h2></div><button type="button" className="isl-text-link" onClick={onAction}>{action}<Icons.ArrowForward size={15} /></button></div>;
}

function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="isl-section-error" role="alert"><p>{message}</p><button type="button" className="isl-text-link" onClick={retry}><Icons.Refresh size={15} />Try again</button></div>;
}

function ProductRail({ products, loading, error, retry, navigate }: { products: ShopProduct[]; loading: boolean; error?: string; retry?: () => void; navigate: Navigate }) {
  const { comparison, toggleCompare } = useCommerce();
  if (loading) return <div className="isl-product-rail" aria-label="Loading products" aria-busy="true">{[1, 2, 3, 4, 5].map(item => <div key={item} className="isl-product-skeleton shimmer-skeleton" />)}</div>;
  return <>
    {error && retry && <SectionError message={error} retry={retry} />}
    {products.length > 0 ? <div className="isl-product-rail" tabIndex={0} aria-label="Products; scroll horizontally for more">{products.map(product => <ProductCard key={product.id} product={product} variant="carousel" onOpen={id => navigate('customer_product', { selectedProductId: id })} onCompare={() => toggleCompare(product)} compared={comparison.some(item => item.id === product.id)} />)}</div>
      : !error && <div className="isl-empty"><Icons.ShoppingBag size={26} /><h3>No products in this selection yet</h3><p>There may be more to discover in the full catalog.</p><button type="button" className="isl-text-link" onClick={() => navigate('customer_search')}>Browse catalog <Icons.ArrowForward size={15} /></button></div>}
  </>;
}

function useHomeRail(section: keyof typeof HOME_RAIL_QUERIES) {
  const [page, setPage] = useState<ShopPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setPage(null);
    shopApi.products(HOME_RAIL_QUERIES[section]).then(result => {
      checkShopPage(result, 1, HOME_RAIL_LIMIT);
      if (active) { setPage(result); setUpdatedAt(Date.now()); }
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'This selection could not load. Please retry.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, revision]);
  return { page, loading, error, updatedAt, retry: () => setRevision(value => value + 1) };
}

function campaignCopy(category: string) {
  if (/kurta|saree/i.test(category)) return { title: ['A little tradition.', 'A fresh feeling.'], description: 'Beautiful details. Effortless silhouettes. An edit made for your everyday.', theme: 'ethnic' };
  if (/footwear|shoe/i.test(category)) return { title: ['New steps.', 'Your own pace.'], description: 'Find the pair that goes wherever your day takes you.', theme: 'sneaker' };
  return { title: ['Everyday style.', 'Anything but ordinary.'], description: 'Easy pieces with a little personality. Find your next favourite in the collection.', theme: 'denim' };
}

export default function CustomerHomeScreen({ navigate }: Props) {
  const featured = useHomeRail('featured');
  const newest = useHomeRail('newest');
  const [facets, setFacets] = useState<ShopFacets>(EMPTY_FACETS);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [facetError, setFacetError] = useState('');
  const [facetRevision, setFacetRevision] = useState(0);
  const [campaignIndex, setCampaignIndex] = useState(0);
  const [recentProducts, setRecentProducts] = useState<ShopProduct[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState('');
  const [recentRevision, setRecentRevision] = useState(0);
  const { comparison, recentlyViewed } = useCommerce();
  const recentIds = JSON.stringify([...new Set(recentlyViewed.map(item => item.id))].slice(0, HOME_RAIL_LIMIT));
  const search = (filters?: SearchParams) => navigate('customer_search', filters);
  const retryFacets = () => setFacetRevision(value => value + 1);

  useEffect(() => {
    let active = true;
    setFacetsLoading(true); setFacetError('');
    shopApi.facets().then(boundedFacets).then(values => { if (active) setFacets(values); }).catch(() => {
      if (active) setFacetError('Collections and brand navigation could not load. You can still browse products.');
    }).finally(() => { if (active) setFacetsLoading(false); });
    return () => { active = false; };
  }, [facetRevision]);

  // Only IDs come from browser history; every displayed product is re-read from /api/shop.
  useEffect(() => {
    let active = true;
    const ids: string[] = JSON.parse(recentIds);
    setRecentProducts([]); setRecentError(''); setRecentLoading(ids.length > 0);
    if (!ids.length) return;
    Promise.allSettled(ids.map(id => shopApi.product(id))).then(results => {
      if (!active) return;
      setRecentProducts(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
      if (results.some(result => result.status === 'rejected' && !(result.reason instanceof ShopApiError && result.reason.status === 404))) {
        setRecentError('Some recently viewed products could not be checked. Try again to see their current details.');
      }
      setRecentLoading(false);
    });
    return () => { active = false; };
  }, [recentIds, recentRevision]);

  const previewProducts = useMemo(() => {
    const unique = new Map<string, ShopProduct>();
    for (const product of [...(featured.page?.data || []), ...(newest.page?.data || [])]) unique.set(product.id, product);
    return [...unique.values()];
  }, [newest.page, featured.page]);
  const campaigns = useMemo(() => {
    const categories = new Set<string>();
    return previewProducts.flatMap(product => {
      const image = catalogImage(product);
      if (!image || !product.category || product.stock <= 0 || categories.has(product.category)) return [];
      categories.add(product.category);
      const params: SearchParams = product.category.toLowerCase() === 'kids' ? { searchGender: product.gender } : { searchCategory: product.category };
      return [{ product, image, params, ...campaignCopy(product.category) }];
    }).sort((a, b) => {
      const rank = (category: string) => /kurta|saree/i.test(category) ? 0 : /shirt/i.test(category) ? 1 : /footwear/i.test(category) ? 2 : 3;
      return rank(a.product.category) - rank(b.product.category);
    }).slice(0, 3);
  }, [previewProducts]);
  const currentIndex = Math.min(campaignIndex, Math.max(0, campaigns.length - 1));
  const campaign = campaigns[currentIndex];
  const fallbackCopy = campaignCopy('');
  const departments = homeDepartments(facets);
  const categories = facets.categories.filter(value => value.toLowerCase() !== 'kids').slice(0, 6);
  const brands = facets.brands.slice(0, 6);
  const loadedPages = [featured.page, newest.page];
  const sourceLabel = !loadedPages.some(Boolean) ? featured.loading || newest.loading ? 'Checking the catalog…' : 'Catalog unavailable' : catalogModeLabel(loadedPages);
  const sample = loadedPages.some(page => page?.catalogSource === 'sample');
  const lastUpdated = Math.max(featured.updatedAt || 0, newest.updatedAt || 0);

  return <MotionConfig reducedMotion="user"><div className="customer-home-surface isl-home">
    <div className="isl-announcement"><span>Find your style. Make it yours.</span><span className="isl-announcement-note">{sample ? 'Sample collection · prices in INR' : sourceLabel}</span></div>
    <main className="isl-content">
      <div className="isl-discover-bar"><nav className="isl-quick-pills" aria-label="Shop departments"><button type="button" className="is-active" onClick={() => search()}><Icons.AutoAwesome size={14} />For you</button>{departments.map(department => <button type="button" key={department.label} onClick={() => search(department.params)}>{department.label}</button>)}<button type="button" onClick={() => search({ searchSort: 'newest' })}>New in<Icons.ArrowUpRight size={12} /></button></nav><button type="button" className="isl-text-link isl-local-shortcut" onClick={() => navigate('customer_stores')}><Icons.LocationOn size={15} />Discover nearby</button></div>
      {facetError && <SectionError message={facetError} retry={retryFacets} />}
      {facetsLoading && !categories.length ? <div className="isl-category-loading" role="status">Finding collections…</div> : categories.length > 0 && <section className="isl-category-circles" aria-label="Shop by category">{categories.map(category => {
        const image = catalogImage(previewProducts.find(product => product.category === category && catalogImage(product)));
        return <button type="button" key={category} onClick={() => search({ searchCategory: category })}><span className="isl-category-photo">{image ? <RetailImage src={image.url} alt="" loading="lazy" /> : <Icons.Shirt size={28} aria-hidden="true" />}</span><strong>{category}</strong></button>;
      })}</section>}

      <section className="isl-campaign-section" aria-label="From the catalog" aria-roledescription={campaigns.length > 1 ? 'carousel' : undefined}>
        <div className={`isl-campaign isl-campaign-${campaign?.theme || 'ethnic'}`} id="home-campaign" role="group" aria-roledescription={campaigns.length > 1 ? 'slide' : undefined} aria-label={campaign ? `${currentIndex + 1} of ${campaigns.length}: ${campaign.product.category}` : 'Discover InStoreLook'}>
          <div className="isl-campaign-copy">
            <p className="isl-eyebrow"><span />THE EVERYDAY EDIT / {campaign?.product.category || 'InStoreLook'}</p>
            <h1>{(campaign?.title || fallbackCopy.title).map((line, index) => <React.Fragment key={line}>{index > 0 && <br />}{index === 1 ? <em>{line}</em> : line}</React.Fragment>)}</h1>
            <p className="isl-campaign-description">{campaign?.description || fallbackCopy.description}</p>
            <button type="button" className="isl-primary-button" onClick={() => search(campaign?.params)}>{campaign ? 'Discover the edit' : 'Explore the collection'}<Icons.ArrowForward size={17} /></button>
            <span className="isl-campaign-note">A LITTLE DISCOVERY. A LOT OF YOU.</span>
          </div>
          <div className="isl-campaign-photo" key={campaign?.product.id || 'intro'}>
            <span className="isl-hero-word" aria-hidden="true">you.</span>
            {campaign ? <RetailImage src={campaign.image.url} alt={campaign.image.alt} loading="eager" fetchPriority="high" /> : <div className="isl-editorial-placeholder" aria-hidden="true"><span>il</span><small>YOUR CITY.<br />YOUR STYLE.</small></div>}
            <span className="isl-photo-note">{sample ? 'REFERENCE IMAGERY' : 'FROM THE COLLECTION'}</span>
          </div>
        </div>
        {campaigns.length > 1 && <div className="isl-campaign-controls"><span className="isl-campaign-counter">THE COLLECTION <span>{String(currentIndex + 1).padStart(2, '0')} / {String(campaigns.length).padStart(2, '0')}</span></span><div className="isl-campaign-selectors">{campaigns.map((item, index) => <button key={item.product.id} type="button" onClick={() => setCampaignIndex(index)} aria-label={`Show ${item.product.category} collection`} aria-pressed={index === currentIndex} aria-controls="home-campaign"><span /></button>)}</div><div className="isl-campaign-arrows"><button type="button" aria-label="Previous collection" onClick={() => setCampaignIndex((currentIndex + campaigns.length - 1) % campaigns.length)}><Icons.ArrowBack size={17} /></button><button type="button" aria-label="Next collection" onClick={() => setCampaignIndex((currentIndex + 1) % campaigns.length)}><Icons.ArrowForward size={17} /></button></div></div>}
      </section>

      <section className="isl-budget" aria-label="Shop by budget"><div><p className="isl-eyebrow">THE PRICE-POINT EDIT</p><h2>Great style. <em>Your budget.</em></h2></div><div className="isl-budget-actions">{[999, 1499, 2499].map(price => <button type="button" key={price} onClick={() => search({ searchMaxPrice: price, searchSort: 'price_asc' })}><span>Finds up to</span><strong>₹{price.toLocaleString('en-IN')}</strong><Icons.ArrowUpRight size={17} /></button>)}</div></section>

      <section className="isl-section" aria-label="Featured products"><SectionHeading eyebrow="Small finds. Big personality." title="Love at first find." action="View all" onAction={() => search({ searchSort: 'price_asc', searchStatus: 'In Stock' })} /><ProductRail products={featured.page?.data || []} loading={featured.loading} error={featured.error} retry={featured.retry} navigate={navigate} /></section>

      {(brands.length > 0 || facetsLoading) && <section className="isl-section"><SectionHeading eyebrow="Your labels. Your way." title="Find your favourites." action="All brands" onAction={() => search()} />
        {facetsLoading && !brands.length ? <div className="isl-brand-grid" aria-busy="true" aria-label="Loading brands">{[1, 2, 3].map(item => <div key={item} className="isl-brand-skeleton shimmer-skeleton" />)}</div> : <div className="isl-brand-grid">{brands.map(brand => {
          const image = catalogImage(previewProducts.find(product => product.brand === brand && catalogImage(product)));
          return <button type="button" className="isl-brand-card" key={brand} onClick={() => search({ searchBrand: brand })}><div className="isl-brand-photo">{image ? <RetailImage src={image.url} alt="" loading="lazy" /> : <span className="isl-brand-monogram" aria-hidden="true">{brand.slice(0, 1)}</span>}</div><div className="isl-brand-copy"><h3>{brand}</h3><span>Explore the collection</span><Icons.ArrowUpRight size={19} /></div></button>;
        })}</div>}
      </section>}

      <section className="isl-section"><SectionHeading eyebrow="Another day. Another discovery." title="Fresh from the collection." action="See what's new" onAction={() => search({ searchSort: 'newest' })} /><ProductRail products={newest.page?.data || []} loading={newest.loading} error={newest.error} retry={newest.retry} navigate={navigate} /></section>

      {campaigns.length > 1 && <section className="isl-section"><SectionHeading eyebrow="Many moods. All you." title="Make room for a new mood" onAction={() => search()} /><div className="isl-mosaic">{campaigns.map((edit, index) => <button type="button" key={edit.product.id} className={`isl-mosaic-card isl-mosaic-${index === 0 ? 'festive' : index === 1 ? 'dress' : 'casual'}`} onClick={() => search(edit.params)}><RetailImage src={edit.image.url} alt="" loading="lazy" /><div><span>FROM THE CATALOG</span><h3>{edit.product.category}</h3><span className="isl-mosaic-cta">Explore collection <Icons.ArrowForward size={15} /></span></div></button>)}</div></section>}

      {recentlyViewed.length > 0 && <section className="isl-section"><SectionHeading eyebrow="Pick up where you left off" title="Recently viewed" action="Browse all" onAction={() => search()} /><ProductRail products={recentProducts} loading={recentLoading} error={recentError} retry={() => setRecentRevision(value => value + 1)} navigate={navigate} /><p className="isl-reference-note">Current catalog details for your recent views. Removed listings are left out.</p></section>}

      <section className="isl-local-section"><div className="isl-local-intro"><div className="isl-local-icon"><Icons.Store size={31} /></div><div><p className="isl-eyebrow">A little closer to home</p><h2>Good style is around the corner.</h2><p>Explore neighbourhood shops. Find a new place to fall in love with.</p></div><button type="button" className="isl-primary-button" onClick={() => navigate('customer_stores')}>Explore nearby<Icons.ArrowUpRight size={16} /></button></div><p className="isl-reference-note">Map listings do not confirm product availability.</p></section>

      <div className="isl-catalog-status"><div><Icons.Refresh size={16} /><span><strong>{sourceLabel}</strong><small>{sample ? 'Sample prices and availability · ' : ''}{featured.error || newest.error ? 'Some selections could not load. Retry them above.' : lastUpdated ? `Checked at ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Prices are shown in INR.'}</small></span></div><button type="button" className="isl-text-link" onClick={() => { featured.retry(); newest.retry(); retryFacets(); setRecentRevision(value => value + 1); }} disabled={featured.loading || newest.loading}>{featured.loading || newest.loading ? 'Refreshing…' : 'Refresh catalog'}</button></div>
      <footer className="isl-footer"><div><span className="isl-footer-wordmark">instore<span>look.</span></span><p>Made for the way you find your style.</p></div><div className="isl-footer-links"><button type="button" className="isl-text-link" onClick={() => navigate('customer_compare')}>Your comparisons ({comparison.length})</button><button type="button" className="isl-text-link" onClick={() => navigate('role_select')}>For store owners<Icons.ArrowUpRight size={14} /></button><button type="button" className="isl-text-link" onClick={() => navigate('customer_admin')}>Administration</button></div>{sample && <details className="isl-sample-details"><summary>About this sample collection</summary><p>Product photos are style references. Prices and stock are illustrative, not verified retailer offers. Brand names do not imply a partnership. Online purchasing opens when the store's commerce service is connected.</p></details>}</footer>
    </main>
  </div></MotionConfig>;
}
