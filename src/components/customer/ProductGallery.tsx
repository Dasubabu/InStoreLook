import React, { useEffect, useId, useRef, useState } from 'react';
import type { ShopProduct } from '../../commerce/contracts';
import RetailImage from '../RetailImage';
import { imageProvenance } from '../retailImageHelpers';
import { galleryMedia, nextImageIndex, swipeDirection } from './productGalleryHelpers';
import { openGalleryDialog, trapGalleryFocus } from './productGalleryDialog';
import './product-gallery.css';

export default function ProductGallery({ product }: { product: ShopProduct; key?: React.Key }) {
  const media = galleryMedia(product);
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const enlargedStage = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const titleId = useId();
  const hintId = useId();
  const item = media[active] ?? media[0];
  const activeIndex = media[active] ? active : 0;
  const provenance = item ? imageProvenance(item, product.inventorySource) : null;
  const move = (delta: number) => { setActive(index => nextImageIndex(index, delta, media.length)); setZoomed(false); };
  const close = () => { setFullscreen(false); setZoomed(false); touch.current = null; drag.current = null; };

  useEffect(() => {
    if (!fullscreen || !dialog.current) return;
    try { return openGalleryDialog(dialog.current, opener.current); }
    catch { setFullscreen(false); setGalleryError('Fullscreen is unavailable in this browser. You can still browse every supplied image below.'); }
  }, [fullscreen]);

  useEffect(() => {
    const stage = enlargedStage.current;
    if (!stage) return;
    // Centre the magnified view; mouse dragging, touch panning and keyboard
    // scrolling can then reach every edge of the original supplied photograph.
    const frame = requestAnimationFrame(() => {
      stage.scrollLeft = zoomed ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
      stage.scrollTop = zoomed ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomed, fullscreen, active]);

  const keyboard = (event: React.KeyboardEvent) => {
    if (!zoomed && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
    if (fullscreen && event.key === 'Escape') { event.preventDefault(); close(); }
    if (fullscreen && dialog.current) trapGalleryFocus(event, dialog.current);
  };

  const stage = (expanded: boolean) => <>
    <div ref={expanded ? enlargedStage : undefined} className={`product-gallery-stage ${expanded ? 'product-gallery-stage-full' : ''} ${zoomed && expanded ? 'is-zoomed' : ''}`}
      tabIndex={zoomed && expanded ? 0 : -1} role="group" aria-label={zoomed && expanded ? 'Zoomed image; scroll or use arrow keys to pan' : 'Product image'}
      onDoubleClick={() => { if (expanded) setZoomed(value => !value); }}
      onPointerDown={event => {
        if (!expanded || !zoomed || event.pointerType === 'touch' || event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.focus({ preventScroll: true });
        event.preventDefault();
      }}
      onPointerMove={event => {
        if (!drag.current) return;
        event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
        event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
      }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onTouchStart={event => { const point = event.touches[0]; touch.current = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : null; }}
      onTouchMove={event => { if (event.touches.length !== 1) touch.current = null; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const point = event.changedTouches[0];
        if (touch.current && point && !zoomed) { const delta = swipeDirection(touch.current, { x: point.clientX, y: point.clientY }); if (delta) move(delta); }
        touch.current = null;
      }}>
      {item ? <RetailImage key={item.url} src={item.url} alt={item.alt} className="product-gallery-image"
        imageSize={expanded ? 'fullscreen' : 'detail'} loading="eager" fetchPriority={!expanded && activeIndex === 0 ? 'high' : 'auto'}
        sizes={expanded ? (zoomed ? '180vw' : '90vw') : '(min-width: 1200px) 540px, (min-width: 768px) calc((100vw - 80px) / 2), calc(100vw - 32px)'} />
        : <p className="product-gallery-empty">Product imagery unavailable. No photos were supplied.</p>}
    </div>
    {item && <div className="product-gallery-controls">
      <button type="button" disabled={media.length < 2} onClick={() => move(-1)} aria-label="Previous product image">←</button>
      <p role="status" aria-live="polite" aria-atomic="true">{activeIndex + 1} / {media.length}{item.view ? ` · ${item.view}` : ''}</p>
      <button type="button" disabled={media.length < 2} onClick={() => move(1)} aria-label="Next product image">→</button>
    </div>}
  </>;

  const caption = provenance && <div className="product-gallery-provenance">
    <strong>{provenance.label}</strong>
    <p>{provenance.source ? `Source (as supplied): ${provenance.source}` : 'Image source attribution not provided.'}</p>
    <p>{provenance.note}</p>
  </div>;

  return <section className="product-gallery" aria-label={`${product.name} image gallery`} onKeyDown={keyboard}>
    {stage(false)}
    {item && <button ref={opener} type="button" className="product-gallery-expand" aria-haspopup="dialog" onClick={() => { setGalleryError(''); setFullscreen(true); setZoomed(false); }}>Expand image ↗</button>}
    {media.length > 0 && <div className="product-gallery-thumbnails" aria-label="Choose a product image">
      {media.map((image, index) => <GalleryThumbnail key={`${image.url}-${index}`} image={image} index={index} selected={activeIndex === index} onSelect={() => { setActive(index); setZoomed(false); }} />)}
    </div>}
    {caption}
    <p className="product-gallery-hint">{media.length > 1 ? 'Use the thumbnails, arrow keys or swipe to explore supplied images.' : 'Only supplied product imagery is shown.'}</p>
    {galleryError && <p role="alert" className="product-gallery-hint">{galleryError}</p>}
    {fullscreen && <dialog ref={dialog} className="product-gallery-dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={hintId}
      onClose={close} onCancel={event => { event.preventDefault(); close(); }}>
      <div className="product-gallery-dialog-header">
        <h2 id={titleId}>{product.name}</h2>
        <button type="button" onClick={close} aria-label="Close fullscreen gallery">Close ×</button>
        <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'Zoom out −' : 'Zoom in +'}</button>
      </div>
      {stage(true)}
      <p id={hintId} className="product-gallery-hint">{zoomed ? 'Drag, scroll or focus the image and use arrow keys to pan. Zoom out to swipe between images. Zoom enlarges the supplied image; it does not add detail.' : 'Use arrow keys or swipe to switch images. Escape closes this view. Double-click the image to zoom.'}</p>
      {caption}
    </dialog>}
  </section>;
}

/** Off-screen thumbnails do not fetch full supplier originals just because
 * native lazy-loading's look-ahead distance includes the entire image rail. */
function GalleryThumbnail({ image, index, selected, onSelect }: { image: ReturnType<typeof galleryMedia>[number]; index: number; selected: boolean; onSelect: () => void; key?: React.Key }) {
  const button = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = button.current;
    if (!element || visible) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { root: element.parentElement, rootMargin: '0px 80px', threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);
  return <button ref={button} type="button" aria-label={`Show ${image.view || `image ${index + 1}`}: ${image.alt}`} aria-pressed={selected} onClick={onSelect}>
    <RetailImage src={visible || selected ? image.url : undefined} alt="" imageSize="thumbnail" sizes="66px" loading="lazy" fetchPriority="low" />
    <span>{image.view || `${index + 1}`}</span>
  </button>;
}
