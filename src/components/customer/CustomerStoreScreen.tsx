import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { Navigate } from '../../types';
import { customerApi, Store, Product, storeBanner } from '../../lib/customerApi';
import ProductCard from './ProductCard';
import { isDemoCatalog } from '../../config';

interface Props {
  navigate: Navigate;
  storeId?: string;
}

export default function CustomerStoreScreen({ navigate, storeId }: Props) {
  const [shop, setShop] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!storeId) {
      setError(true);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    customerApi
      .shop(storeId)
      .then(({ shop, products }) => {
        if (!active) return;
        setShop(shop);
        setProducts(products);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [storeId, retryToken]);

  const back = () => navigate('customer_stores');

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="h-40 shimmer-skeleton" />
        <div className="px-5 -mt-8 space-y-3">
          <div className="w-20 h-20 rounded-2xl shimmer-skeleton border-4 border-white" />
          <div className="h-5 w-40 rounded shimmer-skeleton" />
          <div className="h-3 w-56 rounded shimmer-skeleton" />
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="px-4 h-14 flex items-center border-b border-slate-200">
          <button onClick={back} className="p-2 -ml-2 active:scale-90" aria-label="Back">
            <Icons.ArrowBack size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Icons.Storefront size={44} className="text-slate-300 mb-3" />
          <p className="text-sm font-black text-[#1A1A1A]">Couldn’t load this store</p>
          <p className="mt-1 max-w-xs text-xs font-medium text-slate-500">The store may be offline or the link may have expired.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setRetryToken((value) => value + 1)} className="rounded-full bg-[#171717] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white">Try again</button>
            <button type="button" onClick={() => navigate('customer_stores')} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest">Back</button>
          </div>
        </div>
      </div>
    );
  }

  const mapsHref = shop.latitude && shop.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`
    : shop.shopAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.shopAddress)}`
      : null;
  const whatsapp = shop.whatsappNumber?.replace(/\D/g, '');

  return (
    <div className="min-h-full bg-[#f7f7f2] pb-10">
      {/* Banner */}
      <div className="relative h-40">
        <img src={storeBanner(shop)} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <button
          onClick={back}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-slate-700 shadow-sm active:scale-90"
          aria-label="Back"
        >
          <Icons.ArrowBack size={19} />
        </button>
        {shop.isStoreOpen != null && (
          <span className={`absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${shop.isStoreOpen ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>
            {shop.isStoreOpen ? 'Open Now' : 'Closed'}
          </span>
        )}
      </div>

      {/* Store header */}
      <div className="mx-auto -mt-10 max-w-6xl px-5 relative z-10 sm:px-8">
        <div className="flex items-end gap-3">
          <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-[#0d7d6f] font-black text-3xl shrink-0">
            {shop.logo ? <img src={shop.logo} alt="" className="w-full h-full object-cover" /> : (shop.shopName || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1A1A1A] line-clamp-1">{shop.shopName || shop.name || 'Local Store'}</h1>
              {shop.locationVerified && <Icons.Verified size={15} className="text-[#0d7d6f] shrink-0" />}
            </div>
            {shop.shopCategory && (
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{shop.shopCategory}</span>
            )}
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${isDemoCatalog ? 'bg-[#eff8cf] text-[#40520b]' : 'bg-[#e4f7da] text-[#2f7e1a]'}`}>
               {isDemoCatalog ? 'Sample catalog · verify in store' : 'Live store inventory'}
            </span>
          </div>
        </div>

        {/* Address + hours */}
        <div className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Icons.LocationOn size={18} className="text-[#0d7d6f] shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-[#1A1A1A] leading-snug">
              {shop.shopAddress || shop.formattedAddress || [shop.city, shop.district, shop.state].filter(Boolean).join(', ') || 'Address not provided'}
            </p>
          </div>
          {shop.workingHours && (
            <div className="flex items-center gap-3">
              <Icons.Schedule size={18} className="text-[#0d7d6f] shrink-0" />
              <p className="text-xs font-bold text-[#1A1A1A]">{shop.workingHours}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <ActionLink href={shop.phone ? `tel:${shop.phone}` : undefined} icon={<Icons.Call size={18} />} label="Call" />
          <ActionLink href={whatsapp ? `https://wa.me/${whatsapp}` : undefined} icon={<Icons.Chat size={18} />} label="WhatsApp" external />
          <ActionLink href={mapsHref || undefined} icon={<Icons.Directions size={18} />} label="Directions" external />
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider">
            Products {products.length > 0 && <span className="text-slate-400">({products.length})</span>}
          </h2>
        </div>
        {products.length ? (
          <motion.div layout className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={(id) => navigate('customer_product', { selectedProductId: id })} />
            ))}
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <Icons.ShoppingBag size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-black text-[#1A1A1A]">No products listed</p>
            <p className="text-xs font-medium text-slate-500 mt-1">This store hasn't added items yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  label,
  external,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  const disabled = !href;
  const cls =
    'h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all';
  if (disabled) {
    return (
      <div className={`${cls} bg-slate-50 border-slate-100 text-slate-300`}>
        {icon}
        {label}
      </div>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`${cls} bg-white border-slate-200 text-[#1A1A1A] active:scale-[0.98]`}
    >
      <span className="text-[#0d7d6f]">{icon}</span>
      {label}
    </a>
  );
}
