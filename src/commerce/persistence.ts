export interface ProductSnapshot {
  id: string; name: string; price: number; brand?: string; imageUrl?: string;
  fabricType?: string; materialComposition?: string; compositionVerified?: boolean;
  fit?: string; pattern?: string; color?: string; careInstructions?: string;
  returnPolicy?: string; inventorySource?: 'sample' | 'live';
}
type SnapshotInput = { id: string; name: string; price: number } & { [K in Exclude<keyof ProductSnapshot, 'id' | 'name' | 'price'>]?: ProductSnapshot[K] | null };
export const SNAPSHOT_KEYS = { comparison: 'instorelook.compare.v1', recent: 'instorelook.recent.v1' };
/** Explicit allowlist: never serialize an entire API product or user-supplied object. */
export function productSnapshot(value: SnapshotInput): ProductSnapshot {
  const result: ProductSnapshot = { id: value.id.slice(0, 200), name: value.name.slice(0, 250), price: value.price };
  for (const key of ['brand', 'imageUrl', 'fabricType', 'materialComposition', 'fit', 'pattern', 'color', 'careInstructions', 'returnPolicy'] as const) {
    if (typeof value[key] === 'string') result[key] = value[key].slice(0, key === 'imageUrl' ? 2000 : 500);
  }
  if (typeof value.compositionVerified === 'boolean') result.compositionVerified = value.compositionVerified;
  if (value.inventorySource === 'sample' || value.inventorySource === 'live') result.inventorySource = value.inventorySource;
  return result;
}
export function readSnapshots(storage: Pick<Storage, 'getItem'>, key: string, limit: number): ProductSnapshot[] {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 150000) return [];
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    return values.filter((value): value is SnapshotInput => !!value && typeof value.id === 'string' && !!value.id && typeof value.name === 'string' && typeof value.price === 'number' && Number.isFinite(value.price) && value.price >= 0)
      .map(productSnapshot).filter(value => !seen.has(value.id) && !!seen.add(value.id)).slice(0, limit);
  } catch { return []; }
}
export function writeSnapshots(storage: Pick<Storage, 'setItem'>, key: string, values: ProductSnapshot[], limit: number) {
  try { storage.setItem(key, JSON.stringify(values.slice(0, limit).map(productSnapshot))); } catch { /* Storage is optional (private browsing / quota). */ }
}
