import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ShopVariant } from '../../commerce/contracts';
import { galleryMedia, nextImageIndex, runExclusiveAction, selectedVariant, swipeDirection, validPincode, variantAvailability } from './productGalleryHelpers';
import { imageProvenance, responsiveRetailImage, retailImageRequest } from '../retailImageHelpers';
import { INDIA_IMAGES, RETAIL_IMAGE_PLACEHOLDER } from '../../lib/indiaImages';
import { openGalleryDialog, trapGalleryFocus } from './productGalleryDialog';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RetailImage from '../RetailImage';

test('gallery uses supplied media in order, preserving source labels and not inventing alternate views', () => {
  const media = [{ url: '/front.jpg', alt: 'Blue shirt on hanger', view: 'Front', source: 'Retailer' }, { url: '/back.jpg', alt: 'Reverse of shirt', view: 'Back' }];
  const result = galleryMedia({ name: 'Shirt', images: ['/legacy.jpg'], media });
  assert.deepEqual(result.slice(0, 2), media);
  assert.notEqual(result[0], media[0]);
  assert.deepEqual(result[2], { url: '/legacy.jpg', alt: 'Shirt, image 3' });
});

test('partial metadata keeps additional images and imageUrl once without inventing view labels', () => {
  const result = galleryMedia({ name: 'Shirt', images: ['/front.jpg', ' /back.jpg ', '/back.jpg'], imageUrl: '/detail.jpg', media: [{ url: '/front.jpg', alt: 'Front of shirt', view: 'Supplied front view', source: 'Retailer claim' }] });
  assert.deepEqual(result.map(item => item.url), ['/front.jpg', '/back.jpg', '/detail.jpg']);
  assert.equal(result[0].source, 'Retailer claim');
  assert.equal(result[1].view, undefined);
  assert.deepEqual(galleryMedia({ name: 'Shirt', imageUrl: ' /single.jpg ' }), [{ url: '/single.jpg', alt: 'Shirt, image 1' }]);
});

test('gallery shows every supplied image without the old ten-image cap, and handles missing images honestly', () => {
  const images = Array.from({ length: 13 }, (_, index) => `/image-${index}.jpg`);
  assert.equal(galleryMedia({ name: 'Dress', images }).length, 13);
  assert.deepEqual(galleryMedia({ name: 'Dress', images: [] }), []);
  assert.deepEqual(galleryMedia({ name: 'Dress', images: ['  ', '/only.jpg'], media: [{ url: '', alt: '' }] }), [{ url: '/only.jpg', alt: 'Dress, image 1' }]);
});

test('image navigation wraps at both ends and remains safe for one or no images', () => {
  assert.equal(nextImageIndex(0, -1, 3), 2);
  assert.equal(nextImageIndex(2, 1, 3), 0);
  assert.equal(nextImageIndex(0, 1, 1), 0);
  assert.equal(nextImageIndex(0, -1, 0), 0);
});

test('horizontal swipes navigate while taps and vertical scrolling do not', () => {
  assert.equal(swipeDirection({ x: 100, y: 100 }, { x: 40, y: 110 }), 1);
  assert.equal(swipeDirection({ x: 100, y: 100 }, { x: 170, y: 110 }), -1);
  assert.equal(swipeDirection({ x: 100, y: 100 }, { x: 80, y: 102 }), 0);
  assert.equal(swipeDirection({ x: 100, y: 100 }, { x: 160, y: 200 }), 0);
});

test('cart variant requires explicit size and color and rejects sold-out or mismatched combinations', () => {
  const variants: ShopVariant[] = [
    { id: 'blue-m', sku: 'BM', size: 'M', color: 'Blue', stock: 2, priceMinor: 129999 },
    { id: 'blue-l', sku: 'BL', size: 'L', color: 'Blue', stock: 0, priceMinor: 129999 },
    { id: 'red-l', sku: 'RL', size: 'L', color: 'Red', stock: 1, priceMinor: 139999 },
  ];
  assert.equal(selectedVariant(variants, '', 'Blue'), undefined);
  assert.equal(selectedVariant(variants, 'M', ''), undefined);
  assert.equal(selectedVariant(variants, 'L', 'Blue'), undefined);
  assert.equal(selectedVariant(variants, 'M', 'Red'), undefined);
  assert.equal(selectedVariant(variants, 'M', 'Blue')?.id, 'blue-m');
  assert.equal(selectedVariant(variants, 'L', 'Red')?.priceMinor, 139999);
  assert.equal(variantAvailability(variants, 'L', 'Blue'), 'sold-out');
  assert.equal(variantAvailability(variants, 'M', 'Red'), 'not-offered');
  assert.equal(variantAvailability(variants, '', 'Red'), 'available');
  assert.equal(variantAvailability(variants, 'M', ''), 'available');
  assert.equal(variantAvailability([], '', ''), 'not-offered');
  const colorless = [{ ...variants[0], color: '' }];
  assert.equal(selectedVariant(colorless, 'M', '')?.id, 'blue-m');
  assert.equal(selectedVariant(colorless, '', ''), undefined);
});

test('pincode validation accepts only a six-digit Indian format without asserting serviceability', () => {
  assert.equal(validPincode('560001'), true);
  assert.equal(validPincode(' 110001 '), true);
  for (const value of ['', '000001', '56000', '5600011', '56a001', '+60001', '560 01']) assert.equal(validPincode(value), false, value);
});

test('rapid cart clicks submit once until the pending request settles', async () => {
  const pending = { current: false };
  let release!: () => void;
  let requests = 0;
  const first = runExclusiveAction(pending, () => { requests++; return new Promise<void>(resolve => { release = resolve; }); });
  assert.equal(await runExclusiveAction(pending, async () => { requests++; }), false);
  assert.equal(requests, 1);
  release();
  assert.equal(await first, true);
  assert.equal(await runExclusiveAction(pending, async () => { requests++; }), true);
  assert.equal(requests, 2);
});

test('a rejected cart request releases the click guard so the shopper can retry', async () => {
  const pending = { current: false };
  await assert.rejects(runExclusiveAction(pending, async () => { throw new Error('Unavailable'); }), /Unavailable/);
  assert.equal(pending.current, false);
  assert.equal(await runExclusiveAction(pending, async () => {}), true);
});

test('documented Shopify width candidates preserve the asset/version and never exceed supplied resolution', () => {
  for (const src of [INDIA_IMAGES.ethnic, INDIA_IMAGES.men]) {
    const result = responsiveRetailImage(src, 'card');
    assert.ok(result.srcSet);
    assert.equal(new URL(result.src!).pathname, new URL(src).pathname);
    assert.equal(new URL(result.src!).searchParams.get('v'), new URL(src).searchParams.get('v'));
    assert.equal(new URL(result.src!).searchParams.get('width'), '640');
    for (const candidate of result.srcSet!.split(', ')) {
      const [url, descriptor] = candidate.split(' ');
      assert.equal(descriptor, `${new URL(url).searchParams.get('width')}w`);
      assert.ok(Number.parseInt(descriptor) <= 900);
    }
  }
  const lowResolution = responsiveRetailImage(INDIA_IMAGES.ethnic.replace('width=900', 'width=100'), 'fullscreen');
  assert.equal(lowResolution.srcSet!.split(', ').length, 1);
  assert.match(lowResolution.srcSet!, /100w$/);
});

test('unknown, signed, cropped, local and unsupported source URLs remain byte-for-byte unchanged', () => {
  const sources = [
    'https://supplier.example/cdn/shop/files/product.jpg?width=900&token=secret',
    'https://www.wforwoman.com.evil.example/cdn/shop/files/product.jpg?width=900',
    'https://user:password@levi.in/cdn/shop/files/product.jpg?width=900',
    'https://levi.in:8443/cdn/shop/files/product.jpg?width=900',
    'https://levi.in/products/photo.jpg?width=900',
    'https://levi.in/cdn/shop/files/product.jpg',
    `${INDIA_IMAGES.ethnic}&signature=a%2Fb`, `${INDIA_IMAGES.ethnic}&height=500`,
    `${INDIA_IMAGES.ethnic}&width=100`, `${INDIA_IMAGES.ethnic}#fragment`,
    INDIA_IMAGES.ethnic.replace('width=900', 'width=NaN'),
    INDIA_IMAGES.ethnic.replace('width=900', 'width=9000'),
    INDIA_IMAGES.ethnic.replace('https:', 'http:'),
    INDIA_IMAGES.sneakers, '/uploads/supplied.jpg', 'blob:local-preview', RETAIL_IMAGE_PLACEHOLDER,
  ];
  for (const src of sources) assert.deepEqual(responsiveRetailImage(src, 'detail'), { src }, src);
  assert.deepEqual(responsiveRetailImage(INDIA_IMAGES.ethnic), { src: INDIA_IMAGES.ethnic });
});

test('responsive failures retry only the original supplied image, then clear candidates for a neutral placeholder', () => {
  const src = INDIA_IMAGES.ethnic;
  const options = { size: 'detail' as const, sizes: '50vw' };
  const initial = retailImageRequest(src, options);
  assert.equal(initial.canRetryOriginal, true);
  assert.ok(initial.srcSet);
  const original = retailImageRequest(src, options, 1);
  assert.equal(original.src, src);
  assert.equal(original.srcSet, undefined);
  assert.equal(original.sizes, undefined);
  assert.equal(original.canRetryOriginal, false);
  const failed = retailImageRequest(src, options, 2);
  assert.equal(failed.src, RETAIL_IMAGE_PLACEHOLDER);
  assert.equal(failed.srcSet, undefined);
  assert.equal(failed.sizes, undefined);
  assert.equal(failed.unavailable, true);
  assert.equal(retailImageRequest('/broken.jpg', {}, 1).unavailable, true);
  assert.equal(retailImageRequest(undefined, {}).unavailable, true);
  assert.equal(retailImageRequest('  ', {}).src, RETAIL_IMAGE_PLACEHOLDER);
});

test('caller-provided responsive candidates are also removed after failure', () => {
  const options = { srcSet: '/small.jpg 200w, /large.jpg 900w', sizes: '90vw' };
  assert.equal(retailImageRequest('/original.jpg', options).srcSet, options.srcSet);
  assert.equal(retailImageRequest('/original.jpg', options, 1).src, '/original.jpg');
  assert.equal(retailImageRequest('/original.jpg', options, 1).srcSet, undefined);
  assert.equal(retailImageRequest('/original.jpg', options, 2).src, RETAIL_IMAGE_PLACEHOLDER);
});

test('reference assets cannot become authentic catalog photography through a live inventory flag', () => {
  assert.equal(imageProvenance({ url: INDIA_IMAGES.ethnic }, 'live').reference, true);
  assert.equal(imageProvenance({ url: INDIA_IMAGES.ethnic.replace('width=900', 'width=240') }, 'live').reference, true);
  assert.equal(imageProvenance({ url: '/sample.jpg' }, 'sample').reference, true);
  assert.equal(imageProvenance({ url: '/live.jpg', source: 'Editorial reference' }, 'live').reference, true);
  const claim = imageProvenance({ url: '/live.jpg', source: 'Seller upload' }, 'live');
  assert.equal(claim.reference, false);
  assert.equal(claim.label, 'Catalog-supplied image');
  assert.equal(claim.source, 'Seller upload');
  assert.match(claim.note, /not independently verified/);
  assert.equal(imageProvenance({ url: '/unknown.jpg' }).source, undefined);
});

test('RetailImage renders accessible missing-image fallback, lazy defaults and explicit priority', () => {
  const missing = renderToStaticMarkup(React.createElement(RetailImage, { alt: 'Blue shirt' }));
  assert.match(missing, /data-image-state="unavailable"/);
  assert.match(missing, /alt="Blue shirt — image unavailable"/);
  assert.match(missing, /loading="lazy"/);
  assert.doesNotMatch(missing, /srcSet=|sizes=/);
  const decorative = renderToStaticMarkup(React.createElement(RetailImage, { alt: '' }));
  assert.match(decorative, /alt=""/);
  const supplied = renderToStaticMarkup(React.createElement(RetailImage, { src: INDIA_IMAGES.ethnic, alt: 'Reference garment', imageSize: 'detail', sizes: '50vw', loading: 'eager', fetchPriority: 'high' }));
  assert.match(supplied, /srcSet=/);
  assert.match(supplied, /fetchPriority="high"/);
  assert.match(supplied, /loading="eager"/);
  assert.match(supplied, /sizes="50vw"/);
});

function dialogFixture() {
  const document = { body: { style: { overflow: 'clip' } }, activeElement: null as unknown };
  const focusable = () => ({ isConnected: true, focus() { document.activeElement = this; } });
  const first = focusable(), last = focusable(), opener = focusable();
  let closes = 0;
  const dialog = {
    ownerDocument: document, open: false,
    showModal() { this.open = true; }, close() { closes++; this.open = false; },
    querySelector() { return first; }, querySelectorAll() { return [first, last]; },
    focus() { document.activeElement = this; },
  };
  return { document, first, last, opener, element: dialog as unknown as HTMLDialogElement, closes: () => closes };
}

test('modal cleanup closes once and restores exact scroll state and opener focus', () => {
  const fixture = dialogFixture();
  const cleanup = openGalleryDialog(fixture.element, fixture.opener as unknown as HTMLElement);
  assert.equal(fixture.element.open, true);
  assert.equal(fixture.document.body.style.overflow, 'hidden');
  assert.equal(fixture.document.activeElement, fixture.first);
  cleanup(); cleanup();
  assert.equal(fixture.element.open, false);
  assert.equal(fixture.document.body.style.overflow, 'clip');
  assert.equal(fixture.document.activeElement, fixture.opener);
  assert.equal(fixture.closes(), 1);
});

test('modal cleanup tolerates removed opener and native close; opening failure does not lock scroll', () => {
  const fixture = dialogFixture();
  const cleanup = openGalleryDialog(fixture.element, fixture.opener as unknown as HTMLElement);
  fixture.opener.isConnected = false;
  fixture.element.close(); cleanup();
  assert.equal(fixture.document.body.style.overflow, 'clip');
  assert.notEqual(fixture.document.activeElement, fixture.opener);
  assert.equal(fixture.closes(), 1);
  fixture.element.showModal = () => { throw new Error('Not supported'); };
  assert.throws(() => openGalleryDialog(fixture.element, null), /Not supported/);
  assert.equal(fixture.document.body.style.overflow, 'clip');
});

test('dialog traps forward/backward tabs and recovers focus from outside the dialog', () => {
  const fixture = dialogFixture();
  let prevented = 0;
  const key = (shiftKey = false) => ({ key: 'Tab', shiftKey, preventDefault() { prevented++; } });
  fixture.first.focus();
  trapGalleryFocus(key(true), fixture.element);
  assert.equal(fixture.document.activeElement, fixture.last);
  trapGalleryFocus(key(), fixture.element);
  assert.equal(fixture.document.activeElement, fixture.first);
  fixture.opener.focus();
  trapGalleryFocus(key(), fixture.element);
  assert.equal(fixture.document.activeElement, fixture.first);
  assert.equal(prevented, 3);
  trapGalleryFocus(key(), fixture.element); // native Tab may move between interior controls
  assert.equal(prevented, 3);
});
