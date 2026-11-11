import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProductGallery from './ProductGallery';
import ProductCard from './ProductCard';
import FabricGuide from './FabricGuide';
import { CommerceProvider } from '../../commerce/CommerceContext';
import { WishlistProvider } from '../../context/WishlistContext';
import type { ShopProduct } from '../../commerce/contracts';
import { INDIA_IMAGES } from '../../lib/indiaImages';

// This focused SSR smoke suite is bundled with the installed esbuild (CSS
// loader: empty) before node --test; no DOM package or remote images needed.
const product: ShopProduct = {
  id: 'gallery-check', name: 'Supplied shirt', brand: 'Example', category: 'Shirts', gender: 'Unisex',
  price: 1000, currency: 'INR', stock: 2, status: 'In Stock', color: 'Blue', description: '',
  inventorySource: 'live', inventoryVerified: false, variants: [],
  images: Array.from({ length: 13 }, (_, index) => `/view-${index}.jpg`),
  media: [{ url: '/view-0.jpg', alt: 'Supplied front', view: 'Front', source: 'Retailer upload claim' }],
};

test('gallery exposes all supplied views while only mounting the active full-size image', () => {
  const html = renderToStaticMarkup(<ProductGallery product={product} />);
  assert.equal((html.match(/aria-label="Show /g) ?? []).length, 13);
  assert.equal((html.match(/loading="eager"/g) ?? []).length, 1);
  assert.equal((html.match(/<img[^>]*src="\/view-/g) ?? []).length, 2); // active stage + its thumbnail
  assert.doesNotMatch(html, /<dialog|src="\/view-12.jpg"/);
  assert.match(html, /fetchPriority="high"/);
  assert.match(html, /Source \(as supplied\): Retailer upload claim/);
  assert.match(html, /not independently verified/);
});

test('a gallery with no imagery offers neither fabricated views nor an empty fullscreen dialog', () => {
  const html = renderToStaticMarkup(<ProductGallery product={{ ...product, images: [], media: [] }} />);
  assert.match(html, /No photos were supplied/);
  assert.doesNotMatch(html, /<img|<dialog|Expand image|Show image/);
});

test('live inventory cannot hide a known reference-image disclosure', () => {
  const html = renderToStaticMarkup(<ProductGallery product={{ ...product, images: [INDIA_IMAGES.ethnic], media: [] }} />);
  assert.match(html, /Reference image/);
  assert.match(html, /exact item, color and fabric match are not verified/);
  assert.match(html, /No brand partnership is implied/);
});

test('cards always expose compare and wishlist actions, preserve source alt and keep lazy image loading', () => {
  const html = renderToStaticMarkup(<WishlistProvider><CommerceProvider><ProductCard product={product} onOpen={() => {}} /></CommerceProvider></WishlistProvider>);
  assert.match(html, /Save Supplied shirt to wishlist/);
  assert.match(html, /Add Supplied shirt to comparison/);
  assert.match(html, /alt="Supplied front"/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /fetchPriority="high"/);
});

test('fabric education is clearly separated from product-specific evidence', () => {
  const html = renderToStaticMarkup(<FabricGuide />);
  assert.match(html, /General guidance — not verified attributes of this item/);
  assert.match(html, /photograph alone does not establish the exact blend/);
});
