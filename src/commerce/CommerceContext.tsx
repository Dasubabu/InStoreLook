import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { shopApi } from './client';
import type { Cart, ShopInfo } from './contracts';
import { productSnapshot, readSnapshots, SNAPSHOT_KEYS, writeSnapshots, type ProductSnapshot } from './persistence';

interface CommerceValue {
  cart: Cart | null; loading: boolean; error: string | null;
  info: ShopInfo | null;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, variantId: string, quantity: number) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  comparison: ProductSnapshot[]; toggleCompare: (product: Parameters<typeof productSnapshot>[0]) => void;
  recentlyViewed: ProductSnapshot[]; rememberProduct: (product: Parameters<typeof productSnapshot>[0]) => void;
}
const CommerceContext = createContext<CommerceValue | null>(null);
function initialSnapshots(key: string, limit: number) {
  try { return readSnapshots(window.localStorage, key, limit); } catch { return []; }
}
export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState(() => initialSnapshots(SNAPSHOT_KEYS.comparison, 4));
  const [recentlyViewed, setRecentlyViewed] = useState(() => initialSnapshots(SNAPSHOT_KEYS.recent, 12));
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const run = useCallback((operation: () => Promise<Cart | null>) => {
    pending.current++; setLoading(true); setError(null);
    const task = queue.current.catch(() => {}).then(operation).then(next => { setCart(next); setError(null); }).catch(reason => {
      setError(reason instanceof Error ? reason.message : 'The cart is unavailable. Please retry.'); throw reason;
    }).finally(() => { pending.current--; setLoading(pending.current > 0); });
    queue.current = task.catch(() => {});
    return task;
  }, []);
  const refreshCart = useCallback(async () => {
    try {
      await run(async () => {
        const next = await shopApi.info();
        setInfo(next);
        return next.cartAvailable ? shopApi.cart() : null;
      });
    } catch { /* Exposed as error with a retry action. */ }
  }, [run]);
  const addItem = useCallback((productId: string, variantId: string, quantity: number) => run(() => shopApi.addItem(productId, variantId, quantity)), [run]);
  const updateItem = useCallback((id: string, quantity: number) => run(() => shopApi.updateItem(id, quantity)), [run]);
  const removeItem = useCallback((id: string) => run(() => shopApi.removeItem(id)), [run]);
  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => { try { writeSnapshots(window.localStorage, SNAPSHOT_KEYS.comparison, comparison, 4); } catch {} }, [comparison]);
  useEffect(() => { try { writeSnapshots(window.localStorage, SNAPSHOT_KEYS.recent, recentlyViewed, 12); } catch {} }, [recentlyViewed]);
  const toggleCompare = useCallback((product: Parameters<typeof productSnapshot>[0]) => {
    setComparison(previous => previous.some(item => item.id === product.id) ? previous.filter(item => item.id !== product.id) : [...previous, productSnapshot(product)].slice(-4));
  }, []);
  const rememberProduct = useCallback((product: Parameters<typeof productSnapshot>[0]) => {
    setRecentlyViewed(previous => [productSnapshot(product), ...previous.filter(item => item.id !== product.id)].slice(0, 12));
  }, []);
  return <CommerceContext.Provider value={{ cart, info, loading, error, refreshCart, addItem, updateItem, removeItem, comparison, toggleCompare, recentlyViewed, rememberProduct }}>{children}</CommerceContext.Provider>;
}
export function useCommerce() {
  const value = useContext(CommerceContext);
  if (!value) throw new Error('useCommerce must be used within CommerceProvider');
  return value;
}
