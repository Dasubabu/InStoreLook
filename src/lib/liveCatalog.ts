import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { customerApi, Product } from './customerApi';
import { isDemoCatalog } from '../config';

export type LiveSyncStatus = 'syncing' | 'live' | 'demo' | 'offline';

export interface LiveCatalogSnapshot {
  featured: Product[];
  arrivals: Product[];
  checkedAt: Date;
}

interface BroadcastMessage {
  type: 'catalog-sync';
  source: string;
  snapshot: {
    featured: Product[];
    arrivals: Product[];
    checkedAt: string;
  };
}

interface LiveCatalogOptions {
  onUpdate: (snapshot: LiveCatalogSnapshot) => void;
  intervalMs?: number;
}

const CHANNEL_NAME = 'instorelook-live-catalog';

/**
 * Keep the storefront feeling alive across every deployment shape:
 * - local Express gets instant product events through Socket.IO;
 * - Vercel falls back to short polling (serverless-safe);
 * - multiple open tabs share the latest snapshot through BroadcastChannel.
 */
export function useLiveCatalog({ onUpdate, intervalMs = 20_000 }: LiveCatalogOptions) {
  const [status, setStatus] = useState<LiveSyncStatus>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sourceRef = useRef(`catalog-${Math.random().toString(36).slice(2)}`);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const sync = useCallback(async () => {
    setRefreshing(true);
    try {
      const [featured, arrivals] = await Promise.all([
        customerApi.featured(),
        customerApi.newArrivals(),
      ]);
      const checkedAt = new Date();
      const snapshot = { featured, arrivals, checkedAt };
      onUpdateRef.current(snapshot);
      setLastSyncedAt(checkedAt);
      // A successful request is not the same thing as live store inventory.
      // Demo mode remains explicitly demo even though it is refreshed locally.
      setStatus(isDemoCatalog || [...featured, ...arrivals].some(product => product.inventorySource === 'sample') ? 'demo' : 'live');

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        const message: BroadcastMessage = {
          type: 'catalog-sync',
          source: sourceRef.current,
          snapshot: {
            featured,
            arrivals,
            checkedAt: checkedAt.toISOString(),
          },
        };
        channel.postMessage(message);
        channel.close();
      }
    } catch {
      setStatus('offline');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel(CHANNEL_NAME)
      : null;

    const handleBroadcast = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;
      if (!active || !message || message.type !== 'catalog-sync' || message.source === sourceRef.current) return;
      const checkedAt = new Date(message.snapshot.checkedAt);
      onUpdateRef.current({
        featured: message.snapshot.featured,
        arrivals: message.snapshot.arrivals,
        checkedAt,
      });
      setLastSyncedAt(checkedAt);
      setStatus(isDemoCatalog || [...message.snapshot.featured, ...message.snapshot.arrivals].some(product => product.inventorySource === 'sample') ? 'demo' : 'live');
    };

    channel?.addEventListener('message', handleBroadcast);

    // Socket.IO is available in the local Express runtime. On Vercel there
    // is no long-lived socket server, so the polling interval remains the
    // reliable source of truth.
    let socket: Socket | null = null;
    const viteMeta = import.meta as ImportMeta & { env?: { DEV?: boolean; VITE_REALTIME_URL?: string } };
    const realtimeUrl = viteMeta.env?.VITE_REALTIME_URL;
    if (viteMeta.env?.DEV || realtimeUrl) {
      socket = io(realtimeUrl || undefined, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 2,
      });
      const handleProductEvent = () => {
        if (active) void sync();
      };
      socket.on('product_created', handleProductEvent);
      socket.on('product_updated', handleProductEvent);
      socket.on('product_deleted', handleProductEvent);
    }

    void sync();
    const timer = window.setInterval(() => {
      if (active) void sync();
    }, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
      channel?.removeEventListener('message', handleBroadcast);
      channel?.close();
      socket?.disconnect();
    };
  }, [intervalMs, sync]);

  return { status, mode: isDemoCatalog ? 'demo' as const : 'mongo' as const, lastSyncedAt, refreshing, refresh: sync };
}

export function formatLiveTime(value: Date | null): string {
  if (!value) return 'Connecting';
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 8) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}
