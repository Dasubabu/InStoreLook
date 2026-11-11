import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

type GalleryImage = {
  src: string;
  productName: string;
  productId: string;
  index: number;
  analysis?: any;
};

function parseImages(product: any): string[] {
  const source = Array.isArray(product.images)
    ? product.images
    : typeof product.images === 'string'
      ? (() => { try { return JSON.parse(product.images); } catch { return []; } })()
      : [];
  return [...new Set([product.imageUrl, ...source].filter((value): value is string => typeof value === 'string' && value.trim().length > 0))].slice(0, 10);
}

function parseAnalysis(product: any): any {
  if (product.aiMetadata && typeof product.aiMetadata === 'object') return product.aiMetadata;
  if (typeof product.aiMetadata === 'string') {
    try { return JSON.parse(product.aiMetadata); } catch { return undefined; }
  }
  return product.aiData;
}

export default function MediaGalleryScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/products', { headers: { 'x-user-id': user?.id || '' } })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Unable to load gallery')))
      .then((data) => { if (!cancelled) setProducts(data.data || []); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const images = useMemo<GalleryImage[]>(() => products.flatMap((product) => {
    const analysis = parseAnalysis(product);
    return parseImages(product).map((src, index) => ({ src, productName: product.name || 'Untitled product', productId: product.id, index, analysis }));
  }).filter((image) => image.productName.toLowerCase().includes(query.toLowerCase().trim()) || !query.trim()), [products, query]);

  const uniqueProducts = new Set(images.map((image) => image.productId)).size;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-h-full bg-[#f7f7f2] pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7f7f2]/95 px-5 pb-4 pt-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0d7d6f]">Media intelligence library</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#15221e]">All Product Images</h1>
            <p className="mt-1 max-w-md text-xs font-medium leading-relaxed text-slate-500">One premium workspace for every uploaded image, detected object, and image-review signal.</p>
          </div>
          <button onClick={() => setScreen('inventory')} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm"><Icons.Close size={18} /></button>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Icons.Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by product name" className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold outline-none focus:border-[#0d7d6f]" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Library</p>
            <p className="text-sm font-black text-[#0d7d6f]">{images.length} images · {uniqueProducts} products</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="aspect-[4/5] animate-pulse rounded-3xl bg-slate-200" />)}</div>
        ) : images.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => {
              const assessment = image.analysis?.qualityAuthenticity?.assessment;
              return (
                <button key={`${image.productId}-${image.index}-${image.src}`} onClick={() => setSelected(image)} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="aspect-[4/5] overflow-hidden bg-slate-100">
                    <img src={image.src} alt={`${image.productName} image ${image.index + 1}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur">View {image.index + 1}</span>
                    {assessment && <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur ${assessment === 'likely_synthetic' ? 'bg-rose-500/85 text-white' : assessment === 'likely_authentic' ? 'bg-emerald-500/85 text-white' : 'bg-amber-400/90 text-[#352600]'}`}>{assessment === 'likely_synthetic' ? 'Flag' : assessment === 'likely_authentic' ? 'Likely real' : 'Review'}</span>}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-black text-[#15221e]">{image.productName}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">Stored media · image {image.index + 1}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
            <Icons.ImageIcon size={44} className="mx-auto mb-4 text-slate-300" />
            <h2 className="text-base font-black text-[#15221e]">Your image library is ready</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">Upload a product image to store it here with its detection result and image-review signal.</p>
            <button onClick={() => setScreen('add_product')} className="mt-5 rounded-2xl bg-[#0d7d6f] px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg">Upload an image</button>
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07110f]/80 p-4 backdrop-blur-xl" onClick={() => setSelected(null)}>
          <div className="grid w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl md:grid-cols-[1.1fr_0.9fr]" onClick={(event) => event.stopPropagation()}>
            <div className="relative min-h-[360px] bg-slate-100 md:min-h-[580px]"><img src={selected.src} alt={selected.productName} className="h-full w-full object-contain" /><button onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full bg-black/55 p-2 text-white"><Icons.Close size={18} /></button></div>
            <div className="p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0d7d6f]">Stored media record</p>
              <h2 className="mt-2 text-2xl font-black text-[#15221e]">{selected.productName}</h2>
              <p className="mt-1 text-xs font-bold text-slate-400">Image {selected.index + 1} · Product ID {selected.productId}</p>
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Detected object</p><p className="mt-1 text-sm font-black text-[#15221e]">{selected.analysis?.productDetection?.objectType || 'Analysis not available'}</p><p className="mt-1 text-xs text-slate-500">{selected.analysis?.productDetection?.category || 'Upload analysis will appear here'}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-amber-700">Authenticity screening</p><p className="mt-1 text-sm font-black text-amber-950">{selected.analysis?.qualityAuthenticity?.authenticityStatus || 'Review required'}</p><p className="mt-1 text-xs leading-relaxed text-amber-900/70">{selected.analysis?.qualityAuthenticity?.rationale || 'Image analysis cannot prove genuine or counterfeit status without provenance and human review.'}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
