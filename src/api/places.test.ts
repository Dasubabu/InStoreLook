import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPlacesCapabilities, listNearbyMapPlaces, parseLocation, PlacesError, searchPlaces } from './places';
import { createServer } from 'node:http';
import express from 'express';
import customerRoutes from './routes/customer';
import vercelCustomer from '../../api/customer/[...path]';
import { customerApi } from '../lib/customerApi';

test('manual coordinates accept zero and geographic boundaries without credentials', () => {
  assert.deepEqual(parseLocation('0', '0'), { latitude: 0, longitude: 0, radius: 5000 });
  assert.deepEqual(parseLocation('-90', '180', '25000'), { latitude: -90, longitude: 180, radius: 25000 });
});

test('missing, nonfinite or out-of-bounds coordinates and radii are rejected', () => {
  for (const latitude of [undefined, null, '', ' ', NaN, Infinity, 91, -91, [], {}]) assert.throws(() => parseLocation(latitude, 0), PlacesError);
  for (const longitude of [undefined, '', 181, -181, Infinity]) assert.throws(() => parseLocation(0, longitude), PlacesError);
  for (const radius of [0, 499, 25001, '', Infinity]) assert.throws(() => parseLocation(0, 0, radius), PlacesError);
});

test('unconfigured geocoding and production Overpass fail closed', async () => {
  const env = { ...process.env };
  try {
    delete process.env.GEOCODING_URL; delete process.env.OSM_OVERPASS_URL; process.env.NODE_ENV = 'production';
    await assert.rejects(searchPlaces('Hyderabad'), (error: PlacesError) => error.code === 'GEOCODING_NOT_CONFIGURED');
    await assert.rejects(listNearbyMapPlaces(17, 78), (error: PlacesError) => error.code === 'MAP_NOT_CONFIGURED');
    await assert.rejects(searchPlaces('x'), (error: PlacesError) => error.status === 400);
  } finally { process.env = env; }
});

test('public Nominatim and insecure provider URLs are not silently enabled', async () => {
  const env = { ...process.env };
  try {
    process.env.GEOCODING_URL = 'https://nominatim.openstreetmap.org/search';
    await assert.rejects(searchPlaces('Delhi'), (error: PlacesError) => error.code === 'GEOCODING_CONFIGURATION');
    process.env.GEOCODING_URL = 'http://provider.example/search';
    await assert.rejects(searchPlaces('Delhi'), (error: PlacesError) => error.code === 'PLACES_CONFIGURATION');
  } finally { process.env = env; }
});

test('explicit geocoding is bounded, validates coordinates, caches and rate limits misses', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch; let requests = 0;
  try {
    process.env.GEOCODING_URL = 'https://geocoder.example/search';
    globalThis.fetch = async (input) => {
      requests++;
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('limit'), '5'); assert.equal(url.searchParams.get('format'), 'jsonv2');
      return new Response(JSON.stringify([{ place_id: 1, display_name: 'Chosen city', lat: '17.4', lon: '78.5' }, { place_id: 2, display_name: 'Invalid', lat: '100', lon: '78' }]));
    };
    const first = await searchPlaces('Chosen city');
    assert.deepEqual(first, [{ id: '1', label: 'Chosen city', latitude: 17.4, longitude: 78.5 }]);
    assert.deepEqual(await searchPlaces('Chosen city'), first); assert.equal(requests, 1);
    await assert.rejects(searchPlaces('Another city'), (error: PlacesError) => error.status === 429);
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('nearby map results exclude distant/invalid locations, retain hours and stay unverified', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch; let requests = 0;
  try {
    process.env.OSM_OVERPASS_URL = 'https://overpass.example/api/interpreter';
    globalThis.fetch = async (_input, init) => {
      requests++; assert.ok(init?.signal); assert.match(String(init?.body), /200/);
      return new Response(JSON.stringify({ elements: [
        { id: 1, type: 'node', lat: 17, lon: 78, tags: { name: 'Local shop', shop: 'clothes', opening_hours: 'Mo-Sa 10:00-19:00' } },
        { id: 2, lat: 28, lon: 77, tags: { name: 'Far away', shop: 'clothes' } },
        { id: 3, lat: 999, lon: 78, tags: { name: 'Invalid' } },
      ] }));
    };
    const found = await listNearbyMapPlaces(17, 78, 5000);
    assert.equal(found.length, 1); assert.equal(found[0].name, 'Local shop'); assert.equal(found[0].verified, false);
    assert.equal(found[0].openingHours, 'Mo-Sa 10:00-19:00'); assert.equal(found[0].distanceMeters, 0);
    assert.deepEqual(await listNearbyMapPlaces(17, 78, 5000), found); assert.equal(requests, 1);
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('Express and Vercel return matching location validation and geocoder errors', async () => {
  const env = { ...process.env };
  delete process.env.GEOCODING_URL;
  const app = express(); app.use('/local', customerRoutes);
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/api/customer/')) void vercelCustomer(req, res);
    else app(req, res);
  });
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    for (const [path, status, code] of [
      ['/places/nearby?latitude=&longitude=0', 400, 'INVALID_LOCATION'],
      ['/shops/nearby?latitude=0&longitude=0&radius=25001', 400, 'INVALID_RADIUS'],
      ['/places/search?q=Delhi', 503, 'GEOCODING_NOT_CONFIGURED'],
    ] as const) {
      for (const prefix of ['/local', '/api/customer']) {
        const response = await fetch(`http://127.0.0.1:${address.port}${prefix}${path}`);
        assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal((await response.json()).error.code, code);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    process.env = env;
  }
});

const providerVariables = ['GEOCODING_URL', 'GEOCODING_API_KEY', 'OSM_OVERPASS_URL', 'MAP_TILE_URL', 'MAP_TILE_ATTRIBUTION', 'VITE_MAP_TILE_URL', 'VITE_MAP_TILE_ATTRIBUTION'] as const;
function clearProviderConfiguration() {
  for (const name of providerVariables) delete process.env[name];
  process.env.NODE_ENV = 'production';
}

async function withCustomerServer(check: (origin: string) => Promise<void>) {
  const app = express(); app.use('/local', customerRoutes);
  const server = createServer((req, res) => {
    if (req.url?.startsWith('/api/customer/')) void vercelCustomer(req, res);
    else app(req, res);
  });
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('capabilities fail closed independently without upstream requests or secret disclosure', () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  try {
    clearProviderConfiguration();
    process.env.GEOCODING_API_KEY = 'test-only-secret-not-a-real-key';
    globalThis.fetch = async () => { throw new Error('Capabilities must not contact providers'); };
    const empty = getPlacesCapabilities();
    assert.equal(empty.citySearch.configured, false); assert.equal(empty.citySearch.code, 'GEOCODING_NOT_CONFIGURED');
    assert.equal(empty.mapDiscovery.configured, false); assert.equal(empty.mapDiscovery.code, 'MAP_NOT_CONFIGURED');
    assert.equal(empty.mapTiles.configured, false); assert.equal(empty.mapTiles.code, 'MAP_TILES_NOT_CONFIGURED');
    assert.equal(empty.mapTiles.urlTemplate, undefined);
    assert.deepEqual(parseLocation('0', '0'), { latitude: 0, longitude: 0, radius: 5000 });

    process.env.GEOCODING_URL = 'http://invalid-geocoder.example/search';
    process.env.OSM_OVERPASS_URL = 'https://private-overpass.example/interpreter?credential=hidden-test-token';
    process.env.MAP_TILE_URL = 'https://raster.example/{z}/{x}/{y}.png';
    process.env.MAP_TILE_ATTRIBUTION = '© Example provider';
    const partial = getPlacesCapabilities();
    assert.equal(partial.citySearch.configured, false); assert.equal(partial.mapDiscovery.configured, true); assert.equal(partial.mapTiles.configured, true);
    process.env.GEOCODING_URL = 'https://private-geocoder.example/search?credential=hidden-test-token';
    const configured = getPlacesCapabilities();
    assert.equal(configured.citySearch.configured, true);
    assert.doesNotMatch(JSON.stringify(configured), /hidden-test-token|test-only-secret|private-geocoder|private-overpass/);
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('explicit shared public providers cannot enable production discovery', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  try {
    clearProviderConfiguration();
    globalThis.fetch = async () => { throw new Error('Blocked endpoints must not be requested'); };
    process.env.GEOCODING_URL = 'https://nominatim.openstreetmap.org./search';
    process.env.OSM_OVERPASS_URL = 'https://overpass-api.de./api/interpreter';
    process.env.MAP_TILE_URL = 'https://tile.openstreetmap.org./{z}/{x}/{y}.png';
    const capabilities = getPlacesCapabilities();
    assert.equal(capabilities.citySearch.code, 'GEOCODING_CONFIGURATION');
    assert.equal(capabilities.mapDiscovery.code, 'MAP_CONFIGURATION');
    assert.equal(capabilities.mapTiles.code, 'MAP_TILES_CONFIGURATION');
    await assert.rejects(searchPlaces('Synthetic city'), (error: PlacesError) => error.code === capabilities.citySearch.code);
    await assert.rejects(listNearbyMapPlaces(0, 0), (error: PlacesError) => error.code === capabilities.mapDiscovery.code);
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('map capabilities accept attributed XYZ raster providers and reject unsafe or unsupported configuration', () => {
  const env = { ...process.env };
  try {
    clearProviderConfiguration();
    process.env.VITE_MAP_TILE_URL = 'https://{s}.tiles.example/{z}/{x}/{y}{r}.png';
    process.env.VITE_MAP_TILE_ATTRIBUTION = '© <a href="https://tiles.example/terms?one=1&amp;two=2">Example tiles</a>';
    const valid = getPlacesCapabilities().mapTiles;
    assert.equal(valid.configured, true); assert.equal(valid.urlTemplate, process.env.VITE_MAP_TILE_URL);
    assert.match(valid.attribution!, /rel="noopener noreferrer"/);
    assert.match(valid.attribution!, /one=1&amp;two=2/);
    for (const invalid of [
      'http://tiles.example/{z}/{x}/{y}.png',
      'https://secret:password@tiles.example/{z}/{x}/{y}.png',
      'https://tiles.example/style.json',
      'https://tiles.example/{z}/{x}/{y}.pbf',
      'https://tiles.example/{z}/{x}/{y}.mvt',
      'https://tiles.example/{zoom}/{x}/{y}.png',
      'https://tiles.example/{z}/{x}/{y}/{unknown}.png',
    ]) {
      process.env.MAP_TILE_URL = invalid;
      const rejected = getPlacesCapabilities().mapTiles;
      assert.equal(rejected.configured, false); assert.equal(rejected.urlTemplate, undefined);
    }
    process.env.MAP_TILE_URL = 'https://tiles.example/{z}/{x}/{y}.png';
    for (const invalid of ['', '<img src=x onerror=alert(1)>', '<a href="javascript:alert(1)">Unsafe</a>', '<a href="https://example.com" onclick="alert(1)">Unsafe</a>', '<script>alert(1)</script>']) {
      process.env.MAP_TILE_ATTRIBUTION = invalid;
      const rejected = getPlacesCapabilities().mapTiles;
      assert.equal(rejected.configured, false); assert.equal(rejected.attribution, undefined);
    }
    process.env.MAP_TILE_ATTRIBUTION = '© Valid provider';
    assert.equal(getPlacesCapabilities().mapTiles.configured, true);
  } finally { process.env = env; }
});

test('Express and Vercel expose matching no-store capabilities without a location or catalog dependency', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  try {
    clearProviderConfiguration(); process.env.CATALOG_SOURCE = 'invalid-test-source';
    globalThis.fetch = async (input, init) => {
      assert.equal(new URL(String(input)).hostname, '127.0.0.1', 'No upstream request should be made');
      return originalFetch(input, init);
    };
    await withCustomerServer(async origin => {
      for (const prefix of ['/local', '/api/customer']) {
        const response = await fetch(`${origin}${prefix}/places/capabilities`);
        assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual((await response.json()).data, getPlacesCapabilities());
      }
    });
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('registered coordinate searches settle while map discovery is pending and survive map failure on both adapters', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  let releaseProvider: ((response: Response) => void) | undefined;
  try {
    clearProviderConfiguration(); process.env.CATALOG_SOURCE = 'demo';
    await withCustomerServer(async origin => {
      for (const [index, prefix] of ['/local', '/api/customer'].entries()) {
        process.env.OSM_OVERPASS_URL = `https://pending-${index}.example/interpreter`;
        let markStarted!: () => void;
        const started = new Promise<void>(resolve => { markStarted = resolve; });
        globalThis.fetch = async (input, init) => {
          if (String(input).startsWith('https://pending-')) {
            const response = new Promise<Response>(resolve => { releaseProvider = resolve; });
            markStarted(); return response;
          }
          assert.equal(new URL(String(input)).hostname, '127.0.0.1');
          return originalFetch(input, init);
        };
        const mapRequest = fetch(`${origin}${prefix}/places/nearby?latitude=0&longitude=0&radius=5000`);
        await started;
        try {
          const registered = await fetch(`${origin}${prefix}/shops/nearby?latitude=0&longitude=0&radius=5000`, { signal: AbortSignal.timeout(3000) });
          assert.equal(registered.status, 200); assert.equal(registered.headers.get('cache-control'), 'no-store');
          assert.deepEqual((await registered.json()).data, []);
        } finally { releaseProvider!(new Response('Provider unavailable', { status: 503 })); }
        const mapped = await mapRequest;
        assert.equal(mapped.status, 502); assert.equal((await mapped.json()).error.code, 'PLACES_PROVIDER_ERROR');
        assert.equal(getPlacesCapabilities().mapDiscovery.configured, true, 'Configured does not claim provider health');
        assert.equal(getPlacesCapabilities().citySearch.configured, false, 'No geocoder is needed for coordinate lookup');
      }
    });
  } finally { releaseProvider?.(new Response('Provider unavailable', { status: 503 })); process.env = env; globalThis.fetch = originalFetch; }
});

test('map listings survive registered-store failure and expose safe destination URLs on both adapters', async () => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  try {
    clearProviderConfiguration(); process.env.CATALOG_SOURCE = 'invalid-test-source';
    process.env.OSM_OVERPASS_URL = 'https://independent-map.example/interpreter';
    globalThis.fetch = async (input, init) => {
      if (String(input).startsWith('https://independent-map.example')) return new Response(JSON.stringify({ elements: [
        { id: 1, type: 'node', lat: 0, lon: 0, tags: { name: 'Synthetic shop', website: 'javascript:alert(1)' } },
        { id: 2, type: 'node', lat: 0, lon: 0, tags: { name: 'Synthetic website', website: 'https://shop.example/' } },
        null,
      ] }));
      assert.equal(new URL(String(input)).hostname, '127.0.0.1');
      return originalFetch(input, init);
    };
    await withCustomerServer(async origin => {
      for (const prefix of ['/local', '/api/customer']) {
        const registered = await fetch(`${origin}${prefix}/shops/nearby?latitude=0&longitude=0`);
        assert.equal(registered.status, 500); assert.equal((await registered.json()).error.code, 'INVALID_CATALOG_SOURCE');
        const response = await fetch(`${origin}${prefix}/places/nearby?latitude=0&longitude=0`);
        assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
        const { data } = await response.json();
        assert.equal(data.length, 2); assert.equal(data[0].verified, false); assert.equal(data[0].website, undefined);
        assert.equal(data[1].website, 'https://shop.example/');
        const directions = new URL(data[0].directionsUrl);
        assert.equal(directions.origin, 'https://www.google.com'); assert.equal(directions.searchParams.get('destination'), '0,0');
        assert.equal(directions.searchParams.has('origin'), false);
      }
    });
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('failed map-provider requests can be retried after cooldown and failures are not cached', async context => {
  const env = { ...process.env }; const originalFetch = globalThis.fetch;
  let now = Date.now(); let requests = 0;
  context.mock.method(Date, 'now', () => now);
  try {
    clearProviderConfiguration(); process.env.OSM_OVERPASS_URL = 'https://retryable-map.example/interpreter';
    globalThis.fetch = async () => ++requests === 1 ? new Response('Unavailable', { status: 503 }) : new Response(JSON.stringify({ elements: [] }));
    await assert.rejects(listNearbyMapPlaces(0, 0), (error: PlacesError) => error.code === 'PLACES_PROVIDER_ERROR');
    await assert.rejects(listNearbyMapPlaces(0, 0), (error: PlacesError) => error.code === 'PLACES_RATE_LIMIT');
    now += 1101;
    assert.deepEqual(await listNearbyMapPlaces(0, 0), []);
    assert.deepEqual(await listNearbyMapPlaces(0, 0), []); assert.equal(requests, 2);
  } finally { process.env = env; globalThis.fetch = originalFetch; }
});

test('customer location requests support cancellation without cancelling another provider or using browser cache', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let geocoderSignal: AbortSignal | undefined; let mapSignal: AbortSignal | undefined;
    globalThis.fetch = async (input, init) => {
      assert.equal(init?.cache, 'no-store'); assert.ok(init?.signal);
      if (String(input).includes('/shops/nearby')) return new Response(JSON.stringify({ data: [] }));
      if (String(input).includes('/places/search')) geocoderSignal = init.signal;
      if (String(input).includes('/places/nearby')) mapSignal = init.signal;
      return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }));
    };
    const cityController = new AbortController(); const mapController = new AbortController();
    const city = customerApi.searchPlaces('Synthetic city', cityController.signal);
    const map = customerApi.nearbyPlaces(0, 0, 5000, mapController.signal);
    const cancelledCity = assert.rejects(city, (error: Error) => error.name === 'AbortError');
    const cancelledMap = assert.rejects(map, (error: Error) => error.name === 'AbortError');
    cityController.abort(); await cancelledCity;
    assert.equal(geocoderSignal?.aborted, true); assert.equal(mapSignal?.aborted, false);
    assert.deepEqual(await customerApi.nearbyShops(0, 0), []);
    mapController.abort(); await cancelledMap;
  } finally { globalThis.fetch = originalFetch; }
});
