import { INDIA_IMAGES, RETAIL_IMAGE_PLACEHOLDER } from '../lib/indiaImages';

export type RetailImageSize = 'thumbnail' | 'card' | 'detail' | 'fullscreen';
const imageWidths: Record<RetailImageSize, number[]> = {
  thumbnail: [80, 160, 240],
  card: [240, 360, 480, 640],
  detail: [320, 480, 640, 900, 1200],
  fullscreen: [640, 900, 1200, 1600],
};

/** Only these existing Shopify storefronts have a known width transform.
 * Shopify documents `?width=` and width-descriptor srcsets at:
 * https://shopify.dev/docs/api/liquid/filters/image_url#image_url-width
 * https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-widths
 * Do not guess transforms for Puma, signed URLs, uploads or other suppliers.
 */
export function responsiveRetailImage(src: string | undefined, size?: RetailImageSize): { src: string | undefined; srcSet?: string } {
  if (!src || !size) return { src };
  let url: URL;
  try { url = new URL(src); } catch { return { src }; }
  if (url.protocol !== 'https:' || !['www.wforwoman.com', 'levi.in'].includes(url.hostname)
    || url.port || url.username || url.password || url.hash
    || !/^\/cdn\/shop\/files\/[^/]+\.(jpe?g|png|webp|avif)$/i.test(url.pathname)
    || [...url.searchParams.keys()].some(key => key !== 'v' && key !== 'width')
    || url.searchParams.getAll('width').length !== 1 || url.searchParams.getAll('v').length > 1) return { src };

  // The supplied width is our ceiling; never promise invented extra resolution.
  const suppliedWidth = Number(url.searchParams.get('width'));
  if (!Number.isInteger(suppliedWidth) || suppliedWidth < 1 || suppliedWidth > 5760) return { src };
  const candidates = [...new Set(imageWidths[size].map(width => Math.min(width, suppliedWidth)))];
  const atWidth = (width: number) => {
    const candidate = new URL(url);
    candidate.searchParams.set('width', String(width));
    return candidate.href.replaceAll(',', '%2C');
  };
  return {
    src: atWidth(candidates[candidates.length - 1]),
    srcSet: candidates.map(width => `${atWidth(width)} ${width}w`).join(', '),
  };
}

export interface RetailImageRequest {
  src: string;
  srcSet?: string;
  sizes?: string;
  unavailable: boolean;
  canRetryOriginal: boolean;
}

/** A failed resized request retries the exact supplied URL once, then stops.
 * Clearing both srcSet and sizes is essential: otherwise the browser keeps
 * selecting the failed candidate instead of the neutral placeholder.
 */
export function retailImageRequest(src: string | undefined, options: { size?: RetailImageSize; srcSet?: string; sizes?: string }, failures = 0): RetailImageRequest {
  const responsive = options.srcSet ? { src, srcSet: options.srcSet } : responsiveRetailImage(src, options.size);
  const hasCandidates = Boolean(responsive.srcSet);
  const unavailable = !src?.trim() || src === RETAIL_IMAGE_PLACEHOLDER || failures >= (hasCandidates ? 2 : 1);
  return {
    src: unavailable ? RETAIL_IMAGE_PLACEHOLDER : failures ? src! : responsive.src!,
    srcSet: unavailable || failures ? undefined : responsive.srcSet,
    sizes: unavailable || failures || !hasCandidates ? undefined : options.sizes,
    unavailable,
    canRetryOriginal: !unavailable && hasCandidates && failures === 0,
  };
}

function assetIdentity(src: string): string {
  try { const url = new URL(src); return `${url.origin}${url.pathname}`; } catch { return src; }
}
const referenceAssets = new Set(Object.values(INDIA_IMAGES).map(assetIdentity));

/** A catalog's live-stock flag never makes an editorial reference authentic. */
export function imageProvenance(image: { url: string; source?: string }, inventorySource?: 'sample' | 'live') {
  const source = image.source?.trim();
  const reference = inventorySource === 'sample' || referenceAssets.has(assetIdentity(image.url))
    || /\b(reference|sample|demo|editorial)\b/i.test(source ?? '');
  return {
    reference,
    label: reference ? 'Reference image' : 'Catalog-supplied image',
    source,
    note: reference
      ? 'Reference imagery; the exact item, color and fabric match are not verified. No brand partnership is implied.'
      : 'Image authenticity and variant match are not independently verified. Source attribution is a catalog-supplied claim.',
  };
}
