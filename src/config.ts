/**
 * Frontend-safe build configuration. The server keeps its own catalog
 * selection; Vite deployments can expose the same choice as
 * VITE_CATALOG_SOURCE without importing server/database code into the client.
 */
export type CatalogMode = 'demo' | 'mongo';

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const configuredSource = (
  viteEnv?.VITE_CATALOG_MODE || viteEnv?.VITE_CATALOG_SOURCE
)?.trim().toLowerCase();

export const catalogMode: CatalogMode = configuredSource === 'mongo' ? 'mongo' : 'demo';
export const isDemoCatalog = catalogMode === 'demo';
