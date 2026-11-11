import type { ProductMedia, ShopProduct, ShopVariant } from '../../commerce/contracts';

/** Keep labeled media in source order and retain any additional legacy images.
 * A partial metadata list must not silently discard a supplied view. */
export function galleryMedia(product: Pick<ShopProduct, 'name'> & Partial<Pick<ShopProduct, 'media' | 'images'>> & { imageUrl?: string | null }): ProductMedia[] {
  const media = (product.media ?? []).filter(item => item.url?.trim()).map((item, index) => ({
    ...item, url: item.url.trim(), alt: item.alt?.trim() || `${product.name}, image ${index + 1}`,
  }));
  const seen = new Set(media.map(item => item.url));
  for (const raw of [...(product.images ?? []), product.imageUrl]) {
    const url = raw?.trim();
    if (url && !seen.has(url)) {
      seen.add(url);
      media.push({ url, alt: `${product.name}, image ${media.length + 1}` });
    }
  }
  return media;
}

export function nextImageIndex(index: number, delta: number, count: number): number {
  return count > 0 ? ((index + delta) % count + count) % count : 0;
}

export function swipeDirection(start: { x: number; y: number }, end: { x: number; y: number }): number {
  const dx = end.x - start.x;
  return Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(end.y - start.y) ? (dx < 0 ? 1 : -1) : 0;
}

export function selectedVariant(variants: ShopVariant[], size: string, color: string): ShopVariant | undefined {
  if (!size || (!color && variants.some(variant => variant.color.trim()))) return undefined;
  return variants.find(variant => variant.size === size && variant.color === color && variant.stock > 0);
}

export function variantAvailability(variants: ShopVariant[], size: string, color: string): 'available' | 'sold-out' | 'not-offered' {
  const matching = variants.filter(variant => (!size || variant.size === size) && (!color || variant.color === color));
  return matching.some(variant => variant.stock > 0) ? 'available' : matching.length ? 'sold-out' : 'not-offered';
}

/** React state alone cannot guard two clicks before the next render. */
export async function runExclusiveAction(pending: { current: boolean }, action: () => Promise<void>): Promise<boolean> {
  if (pending.current) return false;
  pending.current = true;
  try { await action(); return true; } finally { pending.current = false; }
}

export function validPincode(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}
