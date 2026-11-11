import React, { useState } from 'react';
import * as Icons from '../Icons';
import type { Navigate, Screen } from '../../types';
import { useWishlist } from '../../context/WishlistContext';
import { useCommerce } from '../../commerce/CommerceContext';

export default function StorefrontHeader({ current, navigate, themeToggle }: { current: Screen; navigate: Navigate; themeToggle?: React.ReactNode }) {
  const [query, setQuery] = useState('');
  const { count } = useWishlist();
  const { cart } = useCommerce();
  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return <header className={`storefront-header${current === 'customer_home' ? ' has-search' : ''}`}>
    <div className="storefront-header-inner">
      <button type="button" className="storefront-logo" onClick={() => navigate('customer_home')} aria-label="InStoreLook home"><span className="storefront-logomark" aria-hidden="true">i<span>l</span><i /></span><span>instore<span>look</span><small>GOOD FINDS. GREAT STYLE.</small></span></button>
      <nav className="storefront-desktop-nav" aria-label="Main navigation">
        <button type="button" aria-current={current === 'customer_home' ? 'page' : undefined} onClick={() => navigate('customer_home')}>Discover</button>
        <button type="button" aria-current={current === 'customer_search' ? 'page' : undefined} onClick={() => navigate('customer_search')}>The collection</button>
        <button type="button" aria-current={current === 'customer_stores' ? 'page' : undefined} onClick={() => navigate('customer_stores')}>Stores near you<Icons.ArrowUpRight size={13} /></button>
      </nav>
      {current === 'customer_home' && <form className="storefront-search" role="search" onSubmit={event => { event.preventDefault(); navigate('customer_search', query.trim() ? { searchQuery: query.trim() } : {}); }}>
        <Icons.Search size={19} aria-hidden="true" /><label htmlFor="storefront-search" className="sr-only">Search products, brands and styles</label><input id="storefront-search" type="search" value={query} maxLength={200} placeholder="Search for a little something you love" onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icons.Close size={16} /></button>}<button type="submit" aria-label="Search catalog"><Icons.ArrowForward size={18} /></button>
      </form>}
      <div className="storefront-header-actions">
        <button type="button" className="storefront-orders" onClick={() => navigate('customer_orders')} aria-current={current === 'customer_orders' ? 'page' : undefined}><Icons.Package size={20} /><span>Orders</span></button>
        {themeToggle}
        <button type="button" className="storefront-icon-button" onClick={() => navigate('customer_saved')} aria-label={`Wishlist${count ? `, ${count} saved items` : ''}`}><Icons.Favorite size={21} />{count > 0 && <span className="storefront-count">{count > 9 ? '9+' : count}</span>}</button>
        <button type="button" className="storefront-icon-button" onClick={() => navigate('customer_cart')} aria-label={`Shopping bag${cart ? `, ${cartCount} items` : ''}`}><Icons.ShoppingBag size={21} />{cartCount > 0 && <span className="storefront-count">{cartCount > 9 ? '9+' : cartCount}</span>}</button>
      </div>
    </div>
  </header>;
}
