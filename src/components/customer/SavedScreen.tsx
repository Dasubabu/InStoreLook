import React from 'react';
import * as Icons from '../Icons';
import type { Navigate } from '../../types';
import { useWishlist } from '../../context/WishlistContext';
import ProductCard from './ProductCard';

export default function SavedScreen({ navigate }: { navigate: Navigate }) {
  const { items, clear, count } = useWishlist();
  return <main className="saved-page">
    <header className="saved-heading"><div><p className="isl-eyebrow">THE ONES YOU LOVE</p><h1>Your wishlist.</h1><p>{count ? `${count} little reason${count === 1 ? '' : 's'} to come back.` : 'A little space for your next favourite.'}</p></div>{count > 0 && <button type="button" className="isl-text-link" onClick={clear}>Clear wishlist<Icons.Close size={14} /></button>}</header>
    {count === 0 ? <section className="saved-empty"><div aria-hidden="true"><Icons.Favorite size={40} strokeWidth={1} /></div><p className="isl-eyebrow">SOMETHING WILL CATCH YOUR EYE.</p><h2>Love it? Keep it close.</h2><p>Tap the heart on a product to save it here. Your favourites stay in this browser, ready for another look.</p><button type="button" className="isl-primary-button" onClick={() => navigate('customer_search')}>Find your favourites<Icons.ArrowForward size={17} /></button></section> : <><div className="saved-product-grid">{items.map(item => <ProductCard key={item.id} product={item} onOpen={id => navigate('customer_product', { selectedProductId: id })} />)}</div><p className="saved-footnote">Saved browsing snapshots · Open an item for current price, sizes and availability.</p></>}
  </main>;
}
