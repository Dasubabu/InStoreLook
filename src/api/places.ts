export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  source: 'OpenStreetMap';
  directionsUrl: string;
  openingHours?: string;
  verified: false;
}

export interface PlaceSearchResult { id: string; label: string; latitude: number; longitude: number }
export interface PlaceProviderCapability {
  configured: boolean;
  code: string;
  message: string;
}
export interface MapTilesCapability extends PlaceProviderCapability {
  /** Public browser-facing XYZ raster template; never a server credential. */
  urlTemplate?: string;
  /** Plain text and validated HTTPS attribution links only. */
  attribution?: string;
}
export interface PlacesCapabilities {
  citySearch: PlaceProviderCapability;
  mapDiscovery: PlaceProviderCapability;
  mapTiles: MapTilesCapability;
}
export class PlacesError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

/** Shared by Express and Vercel. Empty coordinates are not the Gulf of Guinea. */
export function parseLocation(latitude: unknown, longitude: unknown, radius: unknown = 5000) {
  const numeric = (value: unknown) => typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
  const lat = numeric(latitude); const lon = numeric(longitude); const meters = numeric(radius);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new PlacesError(400, 'INVALID_LOCATION', 'Enter latitude from -90 to 90 and longitude from -180 to 180.');
  if (!Number.isFinite(meters) || meters < 500 || meters > 25000) throw new PlacesError(400, 'INVALID_RADIUS', 'Radius must be between 500 and 25000 meters.');
  return { latitude: lat, longitude: lon, radius: meters };
}

// In-memory, per-instance limits; production provider/gateway must enforce an
// aggregate quota across replicas. No location or query is persisted or logged.
const cache = new Map<string, { expires: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const providerState = new Map<string, { next: number; active: boolean }>();
async function cached<T>(key: string, provider: string, operation: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [entry, value] of cache) if (value.expires <= now) cache.delete(entry);
  const hit = cache.get(key);
  if (hit) return hit.value as T;
  if (pending.has(key)) return pending.get(key) as Promise<T>;
  const state = providerState.get(provider);
  if (state && (state.active || state.next > now)) throw new PlacesError(429, 'PLACES_RATE_LIMIT', 'Location service is busy. Wait a moment and retry.');
  providerState.set(provider, { next: now + 1100, active: true });
  const request = operation().then(value => {
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 300_000, value });
    return value;
  }).finally(() => { pending.delete(key); providerState.set(provider, { next: Date.now() + 1100, active: false }); });
  pending.set(key, request);
  return request;
}

function configuredUrl(raw: string, name: string): URL {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error();
    if (url.username || url.password) throw new Error();
    return url;
  } catch { throw new PlacesError(503, 'PLACES_CONFIGURATION', `${name} needs a valid HTTPS provider endpoint.`); }
}

const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const publicHost = (hostname: string, domain: string) => {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return normalized === domain || normalized.endsWith(`.${domain}`);
};

function geocodingEndpoint(): URL {
  if (!process.env.GEOCODING_URL?.trim()) throw new PlacesError(503, 'GEOCODING_NOT_CONFIGURED', 'City search is not configured. Enter coordinates or use your location instead.');
  const endpoint = configuredUrl(process.env.GEOCODING_URL, 'GEOCODING_URL');
  // Public Nominatim must not become a generic generated geocoding service.
  if (publicHost(endpoint.hostname, 'nominatim.openstreetmap.org') || publicHost(endpoint.hostname, 'nominatim.osm.org')) throw new PlacesError(503, 'GEOCODING_CONFIGURATION', 'Configure a self-hosted or contracted Nominatim-compatible provider. Manual coordinates remain available.');
  return endpoint;
}

function overpassEndpoint(): URL {
  if (process.env.NODE_ENV === 'production' && !process.env.OSM_OVERPASS_URL?.trim()) throw new PlacesError(503, 'MAP_NOT_CONFIGURED', 'Map business discovery is not configured. Registered-store search is separate.');
  const endpoint = configuredUrl(process.env.OSM_OVERPASS_URL || DEFAULT_OVERPASS_URL, 'OSM_OVERPASS_URL');
  // Do not turn the development fallback (or a known shared public instance)
  // into the production provider by merely copying its URL into configuration.
  const publicInstances = ['overpass-api.de', 'gall.openstreetmap.de', 'lambert.openstreetmap.de', 'overpass.kumi.systems', 'overpass.private.coffee', 'overpass.openstreetmap.ru', 'overpass.openstreetmap.fr', 'overpass.osm.ch', 'overpass.atownsend.org.uk'];
  if (process.env.NODE_ENV === 'production' && publicInstances.some(host => publicHost(endpoint.hostname, host))) throw new PlacesError(503, 'MAP_CONFIGURATION', 'Production map discovery needs a self-hosted or contracted Overpass provider. Registered-store search is separate.');
  return endpoint;
}

function providerCapability(resolve: () => unknown, message: string): PlaceProviderCapability {
  try {
    resolve();
    return { configured: true, code: 'CONFIGURED', message };
  } catch (error) {
    return { configured: false, code: error instanceof PlacesError ? error.code : 'PLACES_CONFIGURATION', message: error instanceof PlacesError ? error.message : 'Provider configuration is unavailable.' };
  }
}

function attributionHtml(raw: string): string {
  const invalid = () => new PlacesError(503, 'MAP_TILES_CONFIGURATION', 'Map tiles need attribution text with optional HTTPS links.');
  if (!raw.trim() || raw.length > 2000) throw invalid();
  // Leaflet inserts attribution as HTML. Accept only text and simple links;
  // reject scripts, event handlers and arbitrary markup instead of injecting it.
  const anchors = /<a\s+href=(["'])([^"'<>]+)\1\s*>([^<>]+)<\/a>/gi;
  const withoutLinks = raw.replace(anchors, '');
  if (/[<>]/.test(withoutLinks)) throw invalid();
  return raw.trim().replace(anchors, (_match, _quote, href: string, label: string) => {
    const url = configuredUrl(href.replace(/&amp;/g, '&'), 'Map attribution');
    if (url.protocol !== 'https:') throw invalid();
    const escapedUrl = url.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
}

function mapTilesCapability(): MapTilesCapability {
  try {
    // VITE_* remains a compatible alias, but configuration is now checked by
    // the server so the screen can explain an unavailable map before searching.
    const configured = process.env.MAP_TILE_URL ?? process.env.VITE_MAP_TILE_URL;
    const urlTemplate = configured?.trim() || (process.env.NODE_ENV !== 'production' ? DEFAULT_TILE_URL : '');
    if (!urlTemplate) throw new PlacesError(503, 'MAP_TILES_NOT_CONFIGURED', 'Map tiles are not configured. Store lists and directions still work.');
    const placeholders: string[] = urlTemplate.match(/\{[^{}]*\}/g) || [];
    if (!['{z}', '{x}', '{y}'].every(token => placeholders.includes(token)) || placeholders.some(token => !['{z}', '{x}', '{y}', '{s}', '{r}'].includes(token)) || /[{}]/.test(urlTemplate.replace(/\{[^{}]*\}/g, ''))) throw new PlacesError(503, 'MAP_TILES_CONFIGURATION', 'Map tiles need a supported XYZ raster URL containing {z}, {x} and {y}.');
    const endpoint = configuredUrl(urlTemplate.replace(/\{s\}/g, 'a').replace(/\{r\}/g, '').replace(/\{[zxy]\}/g, '0'), 'MAP_TILE_URL');
    if (/\.(?:pbf|mvt|json)$/i.test(endpoint.pathname) || endpoint.hash) throw new PlacesError(503, 'MAP_TILES_CONFIGURATION', 'This map supports XYZ raster tiles, not vector styles or vector tiles.');
    const publicTiles = publicHost(endpoint.hostname, 'tile.openstreetmap.org');
    if (process.env.NODE_ENV === 'production' && publicTiles) throw new PlacesError(503, 'MAP_TILES_CONFIGURATION', 'Production maps need a configured self-hosted or contracted raster tile provider with attribution.');
    const attribution = attributionHtml((process.env.MAP_TILE_ATTRIBUTION ?? process.env.VITE_MAP_TILE_ATTRIBUTION) || (publicTiles ? OSM_ATTRIBUTION : ''));
    return { configured: true, code: 'CONFIGURED', message: publicTiles ? 'Development map tiles configured; service availability is not guaranteed.' : 'Map tiles configured; service availability is checked when the map loads.', urlTemplate, attribution };
  } catch (error) {
    return { configured: false, code: error instanceof PlacesError ? error.code : 'MAP_TILES_CONFIGURATION', message: error instanceof PlacesError ? error.message : 'Map tile configuration is unavailable.' };
  }
}

/** Configuration only: no location, upstream request, DB probe or secret output. */
export function getPlacesCapabilities(): PlacesCapabilities {
  return {
    citySearch: providerCapability(geocodingEndpoint, 'City search configured; availability is checked when you submit.'),
    mapDiscovery: providerCapability(overpassEndpoint, 'Map business discovery configured; availability is checked when you search.'),
    mapTiles: mapTilesCapability(),
  };
}

async function providerJson(url: URL, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': process.env.PLACES_USER_AGENT || 'InStoreLook/1.0 (store discovery)', ...init.headers } });
    if (!response.ok) throw new PlacesError(502, 'PLACES_PROVIDER_ERROR', 'Location provider is unavailable. Please retry.');
    // Bound response size even if an upstream ignores its requested result limit.
    if (!response.body) throw new Error();
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof PlacesError) throw error;
    throw new PlacesError(502, controller.signal.aborted ? 'PLACES_TIMEOUT' : 'PLACES_PROVIDER_ERROR', controller.signal.aborted ? 'Location provider timed out. Please retry.' : 'Location provider returned an unusable response. Please retry.');
  } finally { clearTimeout(timer); }
}

/** Explicit submit only. GEOCODING_URL is a private/self-hosted Nominatim-compatible /search endpoint. */
export async function searchPlaces(query: unknown): Promise<PlaceSearchResult[]> {
  if (typeof query !== 'string' || query.trim().length < 2 || query.trim().length > 160) throw new PlacesError(400, 'INVALID_QUERY', 'Enter a city or address between 2 and 160 characters.');
  const endpoint = geocodingEndpoint();
  endpoint.searchParams.set('q', query.trim()); endpoint.searchParams.set('format', 'jsonv2'); endpoint.searchParams.set('limit', '5');
  return cached(`geocode:${endpoint}`, `geocode:${endpoint.origin}`, async () => {
    const payload = await providerJson(endpoint, { headers: process.env.GEOCODING_API_KEY ? { Authorization: `Bearer ${process.env.GEOCODING_API_KEY}` } : {} });
    if (!Array.isArray(payload)) throw new PlacesError(502, 'PLACES_PROVIDER_ERROR', 'Location provider returned an unusable response.');
    return payload.slice(0, 5).flatMap((row, index) => {
      if (!row || typeof row !== 'object' || typeof row.display_name !== 'string') return [];
      try {
        const position = parseLocation(row.lat, row.lon);
        return [{ id: String(row.place_id || index).slice(0, 100), label: row.display_name.slice(0, 400), latitude: position.latitude, longitude: position.longitude }];
      } catch { return []; }
    });
  });
}

const EARTH_RADIUS_METERS = 6_371_000;

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 400) : undefined;
}

function website(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function formatAddress(tags: Record<string, string>): string {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.join(', ') || 'Address not listed by OpenStreetMap';
}

function category(tags: Record<string, string>): string {
  const shop = tags.shop;
  if (shop === 'clothes') return 'Clothing store';
  if (shop === 'shoes') return 'Shoe store';
  if (shop === 'boutique') return 'Boutique';
  if (shop === 'department_store') return 'Department store';
  if (shop === 'mall') return 'Mall';
  return shop ? shop.replace(/_/g, ' ') : 'Retail store';
}

export async function listNearbyMapPlaces(
  latitude: number,
  longitude: number,
  radiusMeters = 5_000,
): Promise<NearbyPlace[]> {
  const { radius } = parseLocation(latitude, longitude, radiusMeters);
  const endpoint = overpassEndpoint();
  const query = `[out:json][timeout:20][maxsize:2097152];(nwr[shop~"^(clothes|boutique|shoes|department_store|mall|fashion)$"](around:${radius},${latitude},${longitude}););out center tags 200;`;
  return cached(`nearby:${endpoint}:${latitude}:${longitude}:${radius}`, `overpass:${endpoint.origin}`, async () => {
  const payload = await providerJson(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ data: query }),
  }) as { elements?: Array<{ id: number; type?: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
  if (!payload || !Array.isArray(payload.elements)) throw new PlacesError(502, 'PLACES_PROVIDER_ERROR', 'Map provider returned an unusable response.');
  return payload.elements.slice(0, 200).map((element): NearbyPlace | null => {
    if (!element || typeof element !== 'object') return null;
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (distanceMeters(latitude, longitude, lat, lon) > radius) return null;
    const name = text(tags.name) || text(tags['brand']) || 'Unnamed local store';
    const destination = `${lat},${lon}`;
    const landmark = text(tags['addr:suburb']) || text(tags['addr:neighbourhood']) || text(tags['addr:quarter']);
    return {
      id: `osm-${element.type || 'place'}-${element.id}`,
      name,
      category: category(tags),
      address: formatAddress(tags),
      phone: text(tags.phone) || text(tags['contact:phone']),
      website: website(tags.website) || website(tags['contact:website']),
      landmark,
      latitude: lat,
      longitude: lon,
      distanceMeters: Math.round(distanceMeters(latitude, longitude, lat, lon)),
      source: 'OpenStreetMap' as const,
      openingHours: text(tags.opening_hours),
      verified: false,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    } satisfies NearbyPlace;
  }).filter((place): place is NearbyPlace => place !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 50);
  });
}
