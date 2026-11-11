import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import * as Icons from '../Icons';
import type { Navigate } from '../../types';
import { shopApi } from '../../commerce/client';
import { useCommerce } from '../../commerce/CommerceContext';
import type { ShopProduct, ShopFacets } from '../../commerce/contracts';
import { pathForScreen, type SearchRouteParams } from '../../routing';
import ProductCard from './ProductCard';
import { activeFilters, boundedFacets, boundedSuggestions, checkShopPage, clearFilter, EMPTY_FACETS, EMPTY_FILTERS, filterError, filtersFromRoute, nextSuggestionIndex, pageWindow, SEARCH_PAGE_SIZE, SORT_OPTIONS, toSearchRoute, toShopQuery, type SearchFilters } from './storefrontHelpers';
import './customer-search.css';

interface Props { navigate: Navigate; initialCategory?: string; initialFilters?: SearchRouteParams }

export default function CustomerSearchScreen({ navigate, initialCategory, initialFilters = {} }: Props) {
  const [query, setQuery] = useState(initialFilters.searchQuery || '');
  const [debounced, setDebounced] = useState(initialFilters.searchQuery?.trim() || '');
  const [filters, setFilters] = useState(() => filtersFromRoute(initialFilters, initialCategory));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [facets, setFacets] = useState<ShopFacets>(EMPTY_FACETS);
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [facetError, setFacetError] = useState(false);
  const [facetRevision, setFacetRevision] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionError, setSuggestionError] = useState(false);
  const [suggestionRevision, setSuggestionRevision] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [source, setSource] = useState<'sample' | 'live' | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialFilters.searchPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const refineRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  const suggestionsId = useId();
  const { comparison, toggleCompare } = useCommerce();
  const pendingQuery = query.trim() !== debounced;
  const validationError = filterError(filters);
  const chips = activeFilters(query, filters);
  const refinementCount = chips.filter(chip => chip.key !== 'query' && chip.key !== 'sort').length;
  const showSuggestions = suggestionsOpen && suggestions.length > 0;

  const update = (key: keyof SearchFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
  const changeQuery = (value: string) => { setQuery(value); setPage(1); setSuggestionsOpen(true); setActiveSuggestion(-1); };
  const chooseSuggestion = (value: string) => {
    setQuery(value); setDebounced(value.trim()); setPage(1); setSuggestionsOpen(false); setActiveSuggestion(-1);
    inputRef.current?.focus();
  };
  const clearAll = () => {
    setQuery(''); setDebounced(''); setFilters({ ...EMPTY_FILTERS }); setPage(1); setSuggestionsOpen(false); setActiveSuggestion(-1);
  };
  const removeChip = (key: keyof SearchFilters | 'query') => {
    if (key === 'query') { setQuery(''); setDebounced(''); setSuggestionsOpen(false); }
    else setFilters(current => clearFilter(current, key));
    setPage(1);
  };

  useEffect(() => {
    if (!pendingQuery) return;
    const timer = window.setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query, pendingQuery]);

  useEffect(() => {
    let active = true;
    setFacetError(false); setFacetsLoading(true);
    shopApi.facets().then(boundedFacets).then(values => { if (active) setFacets(values); })
      .catch(() => { if (active) setFacetError(true); }).finally(() => { if (active) setFacetsLoading(false); });
    return () => { active = false; };
  }, [facetRevision]);

  useEffect(() => {
    let active = true;
    setSuggestions([]); setSuggestionError(false); setActiveSuggestion(-1);
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      shopApi.suggestions(query.trim().slice(0, 200)).then(boundedSuggestions).then(values => { if (active) setSuggestions(values); })
        .catch(() => { if (active) setSuggestionError(true); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, suggestionRevision]);

  const filterQuery = useMemo(() => toShopQuery(debounced, filters, page), [debounced, filters, page]);

  // Keep the complete selection and the current bounded page in the shareable URL.
  useEffect(() => {
    const path = pathForScreen('customer_search', toSearchRoute(query, filters, page));
    if (path && window.location.pathname.replace(/\/$/, '') === '/search') window.history.replaceState(window.history.state, '', path);
  }, [query, filters, page]);

  useEffect(() => {
    const request = ++generation.current;
    setError(''); setProducts([]); setTotal(0); setTotalPages(0); setSource(null);
    if (validationError) { setLoading(false); return; }
    setLoading(true);
    if (!pendingQuery) {
      shopApi.products(filterQuery).then(result => {
        if (request !== generation.current) return;
        checkShopPage(result, page, SEARCH_PAGE_SIZE);
        // Inventory changes can remove a previously shared page. Resolve to the
        // last remaining page without dropping any combined filters.
        const lastPage = Math.max(1, Math.min(10000, result.totalPages));
        if (page > lastPage) { setPage(lastPage); return; }
        setProducts(result.data); setTotal(result.total); setTotalPages(Math.min(10000, result.totalPages)); setSource(result.catalogSource);
      }).catch(reason => {
        if (request === generation.current) setError(reason instanceof Error ? reason.message : 'The catalog could not be loaded. Please try again.');
      }).finally(() => { if (request === generation.current) setLoading(false); });
    }
    return () => { generation.current++; };
  }, [filterQuery, page, retryToken, validationError, pendingQuery]);

  const goToPage = (next: number) => {
    setPage(Math.max(1, Math.min(totalPages, next)));
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const closeFilters = () => { setFiltersOpen(false); refineRef.current?.focus(); };
  useEffect(() => {
    const dialog = filterDialog.current;
    if (!dialog || !filtersOpen) return;
    const mobile = window.matchMedia('(max-width: 700px)');
    const show = () => { if (dialog.open) dialog.close(); if (mobile.matches) dialog.showModal(); else dialog.show(); };
    show();
    mobile.addEventListener('change', show);
    return () => { mobile.removeEventListener('change', show); if (dialog.open) dialog.close(); };
  }, [filtersOpen]);

  const select = (label: string, key: keyof SearchFilters, values: readonly string[]) => (
    <label className="isl-filter-field">{label}<select value={filters[key]} onChange={event => update(key, event.target.value)}>
      <option value="All">Any {label.toLowerCase()}</option>
      {filters[key] !== 'All' && !values.includes(filters[key]) && <option value={filters[key]}>{filters[key]}</option>}
      {values.map(value => <option key={value} value={value}>{value}</option>)}
    </select></label>
  );
  const ratingOptions = ['1', '2', '3', '4', '5'];
  const discountOptions = ['10', '20', '30', '40', '50'];
  const resultLabel = validationError ? 'Adjust your filters to continue' : error ? 'Catalog unavailable' : loading ? 'Finding your next look…' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'item' : 'items'} found`;

  return <MotionConfig reducedMotion="user"><div className="isl-search-page">
    <header className="isl-search-header">
      <div className="isl-search-container">
        <div className="isl-search-breadcrumb"><button type="button" onClick={() => navigate('customer_home')}><Icons.ArrowBack size={16} />InStoreLook</button><span aria-hidden="true">/</span><span>Explore</span><button type="button" className="isl-search-stores" onClick={() => navigate('customer_stores')}><Icons.LocationOn size={15} />Find a store</button></div>
        <div className="isl-search-intro"><div><p className="isl-search-eyebrow">YOUR NEXT FAVOURITE IS IN HERE.</p><h1>{filters.category !== 'All' ? `${filters.category}.` : query.trim() ? 'Search results.' : 'The collection.'}</h1></div><p className="isl-search-mode">{source === 'sample' ? 'Sample collection · illustrative prices & availability' : 'Find the pieces that feel like you.'}</p></div>
        <form className="isl-search-form" role="search" onSubmit={event => { event.preventDefault(); setDebounced(query.trim()); setPage(1); setSuggestionsOpen(false); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setSuggestionsOpen(false); setActiveSuggestion(-1); } }}>
          <div className="isl-search-input-wrap">
            <Icons.Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor={`${suggestionsId}-input`}>Search clothes, brands and styles</label>
            <input id={`${suggestionsId}-input`} ref={inputRef} type="search" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-controls={showSuggestions ? suggestionsId : undefined} aria-expanded={showSuggestions} aria-activedescendant={showSuggestions && activeSuggestion >= 0 ? `${suggestionsId}-${activeSuggestion}` : undefined} autoComplete="off" value={query} maxLength={200} placeholder="Try a style, a fabric or your favourite brand" onChange={event => changeQuery(event.target.value)} onFocus={() => setSuggestionsOpen(true)} onKeyDown={event => {
              if (event.nativeEvent.isComposing) return;
              if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
                event.preventDefault(); setSuggestionsOpen(true);
                setActiveSuggestion(current => nextSuggestionIndex(suggestionsOpen ? current : -1, event.key === 'ArrowDown' ? 1 : -1, suggestions.length));
              } else if (event.key === 'Enter' && showSuggestions && activeSuggestion >= 0) {
                event.preventDefault(); chooseSuggestion(suggestions[activeSuggestion]);
              } else if (event.key === 'Escape') { event.preventDefault(); setSuggestionsOpen(false); setActiveSuggestion(-1); }
              else if (event.key === 'Tab') { setSuggestionsOpen(false); setActiveSuggestion(-1); }
            }} />
            {query && <button type="button" className="isl-search-clear" aria-label="Clear search text" onClick={() => { removeChip('query'); inputRef.current?.focus(); }}><Icons.Close size={18} /></button>}
          </div>
          <button type="submit" className="isl-search-submit">Search<Icons.ArrowForward size={16} /></button>
          {showSuggestions && <ul id={suggestionsId} className="isl-search-suggestions" role="listbox" aria-label="Search suggestions">{suggestions.map((value, index) => <li id={`${suggestionsId}-${index}`} key={value} role="option" aria-selected={activeSuggestion === index} onMouseDown={event => event.preventDefault()} onMouseMove={() => setActiveSuggestion(index)} onClick={() => chooseSuggestion(value)}><Icons.Search size={15} aria-hidden="true" /><span>{value}</span><Icons.ArrowUpRight size={15} aria-hidden="true" /></li>)}</ul>}
        </form>
        {suggestionError && <p className="isl-search-hint">Suggestions are unavailable; you can still search. <button type="button" onClick={() => { setSuggestionRevision(value => value + 1); setSuggestionsOpen(true); inputRef.current?.focus(); }}>Retry suggestions</button></p>}
        {facets.categories.length > 0 && <nav className="isl-search-categories" aria-label="Quick category filters"><button type="button" aria-pressed={filters.category === 'All'} onClick={() => update('category', 'All')}>All categories</button>{facets.categories.filter(value => value.toLowerCase() !== 'kids').slice(0, 7).map(category => <button type="button" key={category} aria-pressed={filters.category === category} onClick={() => update('category', category)}>{category}</button>)}{facets.categories.length > 7 && <button type="button" onClick={() => setFiltersOpen(true)}>More categories<Icons.Add size={13} /></button>}</nav>}
      </div>
    </header>

    <main className="isl-search-container isl-search-main">
      <div className="isl-search-toolbar">
        <div className="isl-search-toolbar-start"><button ref={refineRef} type="button" className="isl-refine-button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(value => !value)}><Icons.FilterList size={16} />Filters{refinementCount > 0 && <span>{refinementCount}</span>}</button><h2 ref={resultsRef} tabIndex={-1} className="isl-results-count" role="status" aria-live="polite">{resultLabel}</h2></div>
        <label className="isl-sort-field"><span>Sort by</span><select value={filters.sort} onChange={event => update('sort', event.target.value)}>{SORT_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      {chips.length > 0 && <div className="isl-active-filters" aria-label="Active filters">{chips.map(chip => <button type="button" key={chip.key} aria-label={`Remove ${chip.label}`} onClick={() => removeChip(chip.key)}><span>{chip.label}</span><Icons.Close size={13} aria-hidden="true" /></button>)}<button type="button" className="isl-clear-all" onClick={clearAll}>Clear all</button></div>}
      {facetError && <div className="isl-search-notice" role="alert"><p>Filter options could not load. Your existing selection is kept.</p><button type="button" onClick={() => setFacetRevision(value => value + 1)}>Retry filters</button></div>}
      {validationError && <div className="isl-search-notice" role="alert"><p id="search-filter-error">{validationError}</p><button type="button" onClick={() => setFiltersOpen(true)}>Edit filters</button></div>}

      <div className={`isl-results-layout${filtersOpen ? ' is-refining' : ''}`}>
        <dialog ref={filterDialog} id="catalog-filters" className="isl-filter-panel" aria-label="Refine catalog results" onCancel={event => { event.preventDefault(); closeFilters(); }}>
          <div className="isl-filter-panel-heading"><h2>Make it yours</h2><button type="button" onClick={closeFilters} aria-label="Close filters"><Icons.Close size={18} /></button></div>
          <p className="isl-filter-description">Filters work together. Results update as you choose.</p>
          {facetsLoading && <p className="isl-search-hint" role="status">Loading filter options…</p>}
          <details className="isl-filter-group" open><summary>Collection</summary><fieldset><legend className="sr-only">Collection filters</legend>{select('Category', 'category', facets.categories.filter(value => value.toLowerCase() !== 'kids'))}{select('Gender', 'gender', facets.genders)}{select('Brand', 'brand', facets.brands)}{select('Availability', 'status', ['In Stock', 'Out of Stock'])}</fieldset></details>
          <details className="isl-filter-group" open={Boolean(filters.minPrice || filters.maxPrice || filters.minDiscount || filters.minRating)}><summary>Price & offers</summary><fieldset><legend className="sr-only">Price and offers</legend>
            <div className="isl-price-fields"><label className="isl-filter-field">Min price (₹)<input type="number" min="0" max="1000000" step="0.01" value={filters.minPrice} onChange={event => update('minPrice', event.target.value)} placeholder="0" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'search-filter-error' : undefined} /></label><label className="isl-filter-field">Max price (₹)<input type="number" min="0" max="1000000" step="0.01" value={filters.maxPrice} onChange={event => update('maxPrice', event.target.value)} placeholder="Any price" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'search-filter-error' : undefined} /></label></div>
            <label className="isl-filter-field">Minimum discount<select value={filters.minDiscount} onChange={event => update('minDiscount', event.target.value)}><option value="">Any discount</option>{filters.minDiscount && !discountOptions.includes(filters.minDiscount) && <option value={filters.minDiscount}>{filters.minDiscount}% or more</option>}{discountOptions.map(value => <option key={value} value={value}>{value}% or more</option>)}</select></label>
            <label className="isl-filter-field">Minimum rating<select value={filters.minRating} onChange={event => update('minRating', event.target.value)}><option value="">Any rating</option>{filters.minRating && !ratingOptions.includes(filters.minRating) && <option value={filters.minRating}>{filters.minRating} stars or more</option>}{ratingOptions.map(value => <option key={value} value={value}>{value} stars or more</option>)}</select></label>
          </fieldset></details>
          <details className="isl-filter-group" open={filters.size !== 'All' || filters.fit !== 'All'}><summary>Size & fit</summary><fieldset><legend className="sr-only">Size and fit</legend>{select('Size', 'size', facets.sizes)}{select('Fit', 'fit', facets.fits)}</fieldset></details>
          <details className="isl-filter-group" open={[filters.color, filters.fabric, filters.pattern, filters.occasion].some(value => value !== 'All')}><summary>Colour & details</summary><fieldset><legend className="sr-only">Colour and details</legend>{select('Colour', 'color', facets.colors)}{select('Fabric', 'fabric', facets.fabrics)}{select('Pattern', 'pattern', facets.patterns)}<label className="isl-filter-field">Occasion<input maxLength={120} value={filters.occasion === 'All' ? '' : filters.occasion} onChange={event => update('occasion', event.target.value || 'All')} placeholder="Any occasion" /></label></fieldset></details>
          {refinementCount > 0 && <button type="button" className="isl-filter-reset" onClick={() => { setFilters(current => ({ ...EMPTY_FILTERS, sort: current.sort })); setPage(1); }}>Clear filters, keep search</button>}
          <div className="isl-filter-footer"><button type="button" onClick={() => { setFilters({ ...EMPTY_FILTERS }); setPage(1); }}>Clear all</button><button type="button" className="isl-search-action" onClick={closeFilters}>Show results<Icons.ArrowForward size={15} /></button></div>
        </dialog>

        <section className="isl-search-results" aria-label="Products" aria-busy={loading}>
          {loading ? <div className="isl-results-grid" aria-label="Loading products">{Array.from({ length: 8 }, (_, index) => <div key={index} className="isl-search-skeleton shimmer-skeleton" />)}</div>
            : error ? <div className="isl-search-empty" role="alert"><Icons.Warning size={30} /><h2>Couldn’t load this selection</h2><p>{error}</p><button type="button" className="isl-search-action" onClick={() => setRetryToken(value => value + 1)}>Try again</button></div>
              : products.length > 0 ? <>
                <div className="isl-results-grid">{products.map(product => <ProductCard key={product.id} product={product} onOpen={id => navigate('customer_product', { selectedProductId: id })} onCompare={() => toggleCompare(product)} compared={comparison.some(item => item.id === product.id)} />)}</div>
                <div className="isl-results-footer"><p>Showing {((page - 1) * SEARCH_PAGE_SIZE + 1).toLocaleString('en-IN')}–{((page - 1) * SEARCH_PAGE_SIZE + products.length).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</p>
                  {totalPages > 1 && <nav className="isl-search-pagination" aria-label="Product pages"><button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Previous page"><Icons.ArrowBack size={16} /></button>{pageWindow(page, totalPages).map(value => <button type="button" key={value} aria-label={`Page ${value}`} aria-current={page === value ? 'page' : undefined} onClick={() => goToPage(value)}>{value}</button>)}<button type="button" disabled={page >= totalPages} onClick={() => goToPage(page + 1)} aria-label="Next page"><Icons.ArrowForward size={16} /></button></nav>}
                  {totalPages > 1 && <p>Page {page.toLocaleString('en-IN')} of {totalPages.toLocaleString('en-IN')}</p>}
                </div>
              </> : <div className="isl-search-empty"><Icons.Search size={34} /><h2>{validationError ? 'Let’s adjust those filters' : 'No matches just yet'}</h2><p>{validationError || 'Try a broader search, or remove one of the active filters above.'}</p>{chips.length > 0 && <button type="button" className="isl-search-action" onClick={clearAll}>Clear all & explore</button>}</div>}
          {source === 'sample' && products.length > 0 && <p className="isl-search-footnote">These are sample listings, not verified retailer inventory. Review each product’s details before ordering.</p>}
        </section>
      </div>
    </main>
  </div></MotionConfig>;
}
