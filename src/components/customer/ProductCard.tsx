import React from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { Product, discountPct, formatPrice } from '../../lib/customerApi';
import { useWishlist } from '../../context/WishlistContext';
import { useCommerce } from '../../commerce/CommerceContext';
import { isDemoCatalog } from '../../config';
import RetailImage from '../RetailImage';
import type { ShopProduct } from '../../commerce/contracts';
import { galleryMedia } from './productGalleryHelpers';
import { imageProvenance } from '../retailImageHelpers';
import './product-gallery.css';

interface ProductCardProps {
  key?: React.Key;
  product: Product | ShopProduct;
  onOpen: (id: string) => void;
  variant?: 'grid' | 'carousel';
  onCompare?: () => void;
  compared?: boolean;
}

export default function ProductCard({ product, onOpen, variant = 'grid', onCompare, compared }: ProductCardProps) {
  const { has, toggle } = useWishlist();
  const { comparison, toggleCompare } = useCommerce();
  const saved = has(product.id);
  const inComparison = compared ?? comparison.some(item => item.id === product.id);
  const sample = product.inventorySource ? product.inventorySource === 'sample' : isDemoCatalog;
  const media = galleryMedia(product)[0];
  const image = media?.url;
  const referenceImage = media && imageProvenance(media, sample ? 'sample' : 'live').reference;
  const off = discountPct(product);
  const outOfStock = product.status === 'Out of Stock' || product.stock === 0;
  const sizes = [...new Set(product.sizes?.map(size => size.sizeLabel) || [])];

  return (
    <motion.article layout whileTap={{ scale: 0.99 }} className={`product-card product-card-${variant}`}>
      <div className="product-card-visual">
        <button type="button" onClick={() => onOpen(product.id)} className="product-card-open" aria-label={`View ${product.name}`}>
          <RetailImage src={image} alt={media?.alt || product.name} imageSize="card" sizes={variant === 'carousel' ? '240px' : '(min-width: 1024px) 280px, (min-width: 640px) 30vw, 46vw'} loading="lazy" />
          {outOfStock && <span className="product-card-sold-out">Out of stock</span>}
        </button>
        {referenceImage && <span className="product-card-reference">{sample ? 'Sample · reference image' : 'Reference image'}</span>}
        <button type="button" onClick={() => toggle({ ...product, imageUrl: image })} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} title={saved ? 'Remove from wishlist' : 'Save to wishlist'} className="product-card-heart"><Icons.Favorite size={18} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="product-card-copy">
        <button type="button" onClick={() => onOpen(product.id)} className="product-card-title" aria-label={`View ${product.name}`}>
          {product.brand && <span className="product-card-brand">{product.brand}</span>}
          <h3>{product.name}</h3>
        </button>
        <div className="product-card-price"><strong>{formatPrice(product)}</strong>{product.mrp && product.mrp > product.price && <del>{formatPrice({ price: product.mrp, currency: product.currency })}</del>}{off > 0 && <span>{off}% off</span>}</div>
        <span className="product-card-inventory">{sample ? 'Illustrative price & stock' : product.inventoryVerified ? 'Inventory marked verified' : 'Inventory unverified'}</span>
        <div className="product-card-tools"><span>{sizes.length ? `${sizes.length} size${sizes.length === 1 ? '' : 's'}` : product.category}</span><button type="button" onClick={onCompare ?? (() => toggleCompare({ ...product, imageUrl: image }))} aria-pressed={inComparison} aria-label={`${inComparison ? 'Remove' : 'Add'} ${product.name} ${inComparison ? 'from' : 'to'} comparison`}>{inComparison ? <Icons.Check size={12} /> : <Icons.Add size={12} />}{inComparison ? 'Compared' : 'Compare'}</button></div>
      </div>
    </motion.article>
  );
}
