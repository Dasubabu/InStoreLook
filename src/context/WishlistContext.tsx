import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Product } from '../lib/customerApi';

// A lightweight snapshot of a product, enough to render the Saved list without
// refetching. Persisted to localStorage so a shopper's saved items survive reloads.
export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  mrp?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  brand?: string | null;
  sellerId?: string | null;
  currency?: 'USD' | 'INR' | null;
}

interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  has: (id: string) => boolean;
  toggle: (product: Product | WishlistItem) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const STORAGE_KEY = 'instorelook_wishlist';

function toItem(p: Product | WishlistItem): WishlistItem {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    mrp: p.mrp ?? null,
    imageUrl: (p as Product).imageUrl ?? (p as Product).images?.[0] ?? (p as WishlistItem).imageUrl ?? null,
    category: p.category ?? null,
    brand: p.brand ?? null,
    sellerId: p.sellerId ?? null,
    currency: p.currency === 'INR' || (p.currency == null && p.id.startsWith('p-')) ? 'INR' : 'USD',
  };
}

function readItems(value: string | null): WishlistItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WishlistItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<WishlistItem>;
      return typeof candidate.id === 'string' && candidate.id.length > 0
        && typeof candidate.name === 'string'
        && typeof candidate.price === 'number'
        && Number.isFinite(candidate.price);
    }).map((item) => ({
      ...item,
      currency: item.currency === 'INR' ? 'INR' : 'USD',
    }));
  } catch {
    return [];
  }
}

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    try { setItems(readItems(localStorage.getItem(STORAGE_KEY))); } catch { /* Browsing still works when storage is blocked. */ }
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(readItems(event.newValue));
    };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);

  const persist = useCallback((next: WishlistItem[]) => {
    const safeItems = readItems(JSON.stringify(next));
    setItems(safeItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
    } catch {
      // The in-memory list remains usable when storage is unavailable.
    }
  }, []);

  const updateItems = useCallback((updater: (current: WishlistItem[]) => WishlistItem[]) => {
    setItems((current) => {
      const next = readItems(JSON.stringify(updater(current)));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The in-memory list remains usable when storage is unavailable.
      }
      return next;
    });
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback(
    (product: Product | WishlistItem) => {
      updateItems((current) => current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : [toItem(product), ...current]);
    },
    [updateItems],
  );

  const remove = useCallback((id: string) => updateItems((current) => current.filter((item) => item.id !== id)), [updateItems]);
  const clear = useCallback(() => persist([]), [persist]);

  return (
    <WishlistContext.Provider value={{ items, count: items.length, has, toggle, remove, clear }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
};
