import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as Icons from '../Icons';
import { Navigate } from '../../types';
import { customerApi, NearbyPlace, PlacesCapabilities, PlaceSearchResult, Store } from '../../lib/customerApi';

interface Props { navigate: Navigate }
type Position = [number, number];
const storeIcon = L.divIcon({ className: '', html: '<div style="width:22px;height:22px;border-radius:50%;background:#0d7d6f;border:3px solid white;box-shadow:0 1px 5px #555"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
const centerIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const inputClass = `mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 ${focusClass}`;
const buttonClass = `min-h-11 rounded-lg bg-[#0d7d6f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${focusClass}`;
const linkClass = `inline-flex min-h-11 items-center rounded px-1 underline underline-offset-4 ${focusClass}`;
const message = (reason: unknown) => reason instanceof Error ? reason.message : 'Request failed. Please retry.';
const validPosition = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const verified = (store: Store) => store.inventorySource === 'live' && store.locationVerified === true;
const storeLabel = (store: Store) => store.inventorySource === 'sample' ? 'Sample store · unverified' : verified(store) ? 'Registered store · location confirmed' : 'Registered listing · unverified';
const directions = (lat: number, lon: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

function phoneUrl(raw?: string | null): string | undefined {
  if (!raw || !/^\+?[\d() .-]+$/.test(raw.trim())) return undefined;
  const number = raw.replace(/[() .-]/g, '');
  return /^\+?\d{3,15}$/.test(number) ? `tel:${number}` : undefined;
}

function websiteUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

type LocatedListing = { latitude?: number | null; longitude?: number | null };
type DiscoveryStatus = 'idle' | 'loading' | 'success' | 'error';

/** Each source settles and retries independently; stale requests cannot publish. */
function useNearbyResults<T extends LocatedListing>(position: Position | null, radius: number, enabled: boolean, request: (latitude: number, longitude: number, radius: number, signal?: AbortSignal) => Promise<T[]>, limit: number) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; status: DiscoveryStatus; data: T[]; error: string }>({ key: '', status: 'idle', data: [], error: '' });
  const key = position ? `${position[0]}:${position[1]}:${radius}` : '';
  useEffect(() => {
    if (!position || !enabled) return;
    const controller = new AbortController();
    setState({ key, status: 'loading', data: [], error: '' });
    request(position[0], position[1], radius, controller.signal).then(rows => {
      if (controller.signal.aborted) return;
      const data = rows.filter(row => typeof row.latitude === 'number' && typeof row.longitude === 'number' && validPosition(row.latitude, row.longitude) && L.latLng(position).distanceTo([row.latitude, row.longitude]) <= radius).slice(0, limit);
      setState({ key, status: 'success', data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ key, status: 'error', data: [], error: message(error) });
    });
    return () => controller.abort();
  }, [position, radius, enabled, request, limit, attempt, key]);
  const current = !position || !enabled ? { status: 'idle' as const, data: [], error: '' } : state.key === key ? state : { status: 'loading' as const, data: [], error: '' };
  return { ...current, retry: () => setAttempt(value => value + 1) };
}

function StartingIllustration() {
  return <section aria-labelledby="nearby-start-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-[#edf3ed] p-5 sm:flex sm:items-center sm:gap-8">
    <svg viewBox="0 0 260 150" className="mx-auto h-36 w-60 shrink-0" aria-hidden="true" focusable="false">
      <path d="M0 110H260M55 0V150M205 0V150" stroke="#d5e1d7" strokeWidth="20" />
      <path d="M0 110H260M55 0V150M205 0V150" stroke="#fff" strokeWidth="2" strokeDasharray="6 6" />
      <rect x="88" y="47" width="84" height="64" rx="4" fill="#fff" stroke="#617b6c" strokeWidth="2" />
      <path d="M84 48L94 25H166L176 48Z" fill="#a8c9b2" stroke="#617b6c" strokeWidth="2" />
      <path d="M84 48H176" stroke="#617b6c" strokeWidth="3" />
      <rect x="101" y="65" width="22" height="23" rx="2" fill="#e2ece4" />
      <rect x="138" y="65" width="21" height="45" rx="2" fill="#e2ece4" />
      <circle cx="149" cy="88" r="2" fill="#617b6c" />
      <circle cx="22" cy="32" r="12" fill="#c5d9bf" /><circle cx="235" cy="68" r="13" fill="#c5d9bf" />
    </svg>
    <div><p className="text-xs font-bold uppercase tracking-widest text-[#446553]">Explore stores across India</p><h2 id="nearby-start-heading" className="mt-2 text-xl font-bold">Choose a place to begin</h2><p className="mt-2 max-w-xl text-sm text-slate-600">This is a starting illustration, not your location. Enter coordinates or choose a city result. Browser location permission is requested only when you select “Use my location”.</p></div>
  </section>;
}

function Recenter({ center, radius }: { center: Position; radius: number }) {
  const map = useMap();
  useEffect(() => {
    map.getContainer().setAttribute('aria-label', 'Map of the selected search area');
    map.getContainer().setAttribute('aria-describedby', 'nearby-map-help');
    map.fitBounds(L.latLng(center).toBounds(radius * 2), { maxZoom: 14 });
  }, [map, center, radius]);
  return null;
}

export default function NearbyStoresScreen({ navigate }: Props) {
  const [position, setPosition] = useState<Position | null>(null);
  const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(5000);
  const [locating, setLocating] = useState(false); const [locationError, setLocationError] = useState('');
  const [query, setQuery] = useState(''); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]); const [searched, setSearched] = useState(false);
  const [capabilities, setCapabilities] = useState<PlacesCapabilities | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true); const [capabilitiesError, setCapabilitiesError] = useState(''); const [capabilitiesRetry, setCapabilitiesRetry] = useState(0);
  const [tileError, setTileError] = useState(false); const [tileRetry, setTileRetry] = useState(0);
  const locationGeneration = useRef(0); const searchGeneration = useRef(0);
  const searchController = useRef<AbortController | null>(null);
  const latitudeInput = useRef<HTMLInputElement>(null); const cityInput = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null); const matchesHeading = useRef<HTMLHeadingElement>(null);
  const registered = useNearbyResults(position, radius, true, customerApi.nearbyShops, 100);
  const mapped = useNearbyResults(position, radius, capabilities?.mapDiscovery.configured === true, customerApi.nearbyPlaces, 50);
  const stores: Store[] = registered.data; const places: NearbyPlace[] = mapped.data;
  const cityEnabled = capabilities?.citySearch.configured === true;
  const tileConfig = capabilities?.mapTiles;

  // Coordinates stay in component memory, never in the page URL or web storage.
  useEffect(() => () => { locationGeneration.current++; searchGeneration.current++; searchController.current?.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCapabilitiesLoading(true); setCapabilitiesError('');
    customerApi.placesCapabilities(controller.signal).then(value => {
      if (!controller.signal.aborted) setCapabilities(value);
    }).catch(error => {
      if (!controller.signal.aborted) { setCapabilities(null); setCapabilitiesError(message(error)); }
    }).finally(() => { if (!controller.signal.aborted) setCapabilitiesLoading(false); });
    return () => controller.abort();
  }, [capabilitiesRetry]);
  useEffect(() => { if (position) resultsHeading.current?.focus(); }, [position]);
  useEffect(() => { if (searched && results.length) matchesHeading.current?.focus(); }, [searched, results]);
  useEffect(() => { setTileError(false); }, [position, tileConfig?.urlTemplate]);

  const cancelLocationRequests = () => {
    locationGeneration.current++; searchGeneration.current++;
    searchController.current?.abort();
    setLocating(false); setSearching(false); setResults([]); setSearched(false); setSearchError(''); setLocationError('');
  };
  const choose = (next: Position) => {
    cancelLocationRequests();
    if (!validPosition(next[0], next[1])) { setLocationError('The selected location was invalid. Enter coordinates instead.'); return; }
    setLatitude(String(next[0])); setLongitude(String(next[1])); setPosition(next);
  };
  const locate = () => {
    cancelLocationRequests();
    const request = ++locationGeneration.current;
    if (!navigator.geolocation) { setLocationError('Location is unavailable in this browser. Enter coordinates below.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(value => {
      if (request !== locationGeneration.current) return;
      choose([value.coords.latitude, value.coords.longitude]);
    }, error => {
      if (request !== locationGeneration.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? 'Location permission was denied. Enter coordinates or search a city instead.' : error.code === 3 ? 'Finding your location timed out. Retry or enter coordinates.' : 'Your location could not be determined. Retry or enter coordinates.');
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
  };
  const submitCoordinates = (event: React.FormEvent) => {
    event.preventDefault();
    cancelLocationRequests();
    if (!latitude.trim() || !longitude.trim() || !validPosition(Number(latitude), Number(longitude))) { setLocationError('Enter latitude from -90 to 90 and longitude from -180 to 180.'); latitudeInput.current?.focus(); return; }
    choose([Number(latitude), Number(longitude)]);
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    cancelLocationRequests();
    const request = ++searchGeneration.current;
    if (!cityEnabled) { setSearchError('City search is unavailable. Enter coordinates or use your location.'); return; }
    if (query.trim().length < 2 || query.trim().length > 160) { setSearchError('Enter a city or address between 2 and 160 characters.'); cityInput.current?.focus(); return; }
    const controller = new AbortController(); searchController.current = controller;
    setSearching(true);
    try {
      const found = await customerApi.searchPlaces(query.trim(), controller.signal);
      if (request === searchGeneration.current) { setResults(found.filter(result => validPosition(result.latitude, result.longitude)).slice(0, 5)); setSearched(true); }
    } catch (error) { if (request === searchGeneration.current) setSearchError(message(error)); }
    finally { if (request === searchGeneration.current) setSearching(false); }
  };
  const recheckProviders = () => setCapabilitiesRetry(value => value + 1);
  const configurationMessage = (key: keyof PlacesCapabilities) => capabilities?.[key].message || (capabilitiesLoading ? 'Checking configuration…' : 'Configuration could not be checked. Retry provider settings.');

  return <div className="min-h-full bg-[#f7f7f2] pb-10">
    <header className="border-b border-[#e4e3db] px-5 py-5 sm:px-8"><div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-black tracking-tight">Find nearby stores</h1>
      <p className="mt-2 text-sm text-slate-600">Choose a search location. Map businesses are unverified; listings do not confirm stock or opening status.</p>
    </div></header>
    <main className="mx-auto max-w-6xl space-y-5 px-5 pt-5 sm:px-8">
      {!position && <StartingIllustration />}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Choose location">
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600" aria-busy={capabilitiesLoading}>
          <h2 className="font-bold text-slate-800">Provider settings</h2>
          <dl className="mt-2 grid gap-3 sm:grid-cols-3">{([['citySearch', 'City search'], ['mapDiscovery', 'Map businesses'], ['mapTiles', 'Map display']] as const).map(([key, label]) => <div key={key}><dt className="font-bold">{label}</dt><dd id={`nearby-${key}-status`} className="mt-1">{configurationMessage(key)}</dd></div>)}</dl>
          {capabilitiesError && <p role="alert" className="mt-2 text-rose-700">{capabilitiesError} Coordinate-based registered-store search remains available.</p>}
          <button onClick={recheckProviders} disabled={capabilitiesLoading} className={`${linkClass} mt-1 font-bold text-[#0d7d6f] disabled:opacity-50`}>{capabilitiesLoading ? 'Checking provider settings…' : 'Recheck provider settings'}</button>
        </div>
        <p id="nearby-location-privacy" className="text-xs text-slate-600">Choosing a location sends coordinates to this server and, when configured, its map-business provider. A displayed map requests tiles for that area. City text is sent only on submit. Coordinates stay in this page’s memory; no location is assumed.</p>
        <div className="flex flex-wrap items-center gap-3"><button onClick={locate} disabled={locating} aria-describedby="nearby-location-privacy" className={buttonClass}>{locating ? 'Finding location…' : 'Use my location'}</button>{locating && <button onClick={cancelLocationRequests} className={linkClass}>Cancel location request</button>}</div>
        {locating && <p role="status" className="text-sm text-slate-600">Waiting for location permission or a browser location result…</p>}
        <form onSubmit={submitCoordinates} aria-label="Search with coordinates" className="grid items-end gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold">Latitude<input ref={latitudeInput} type="number" step="any" min="-90" max="90" required value={latitude} onFocus={() => { if (locating || searching) cancelLocationRequests(); }} onChange={event => { cancelLocationRequests(); setLatitude(event.target.value); }} aria-describedby="nearby-coordinate-help nearby-location-error" aria-invalid={Boolean(locationError)} placeholder="−90 to 90" className={inputClass} /></label>
          <label className="text-xs font-bold">Longitude<input type="number" step="any" min="-180" max="180" required value={longitude} onFocus={() => { if (locating || searching) cancelLocationRequests(); }} onChange={event => { cancelLocationRequests(); setLongitude(event.target.value); }} aria-describedby="nearby-coordinate-help nearby-location-error" aria-invalid={Boolean(locationError)} placeholder="−180 to 180" className={inputClass} /></label>
          <button type="submit" className={buttonClass}>Search coordinates</button>
        </form>
        <p id="nearby-coordinate-help" className="text-xs text-slate-600">Manual coordinates work without city search. Both latitude and longitude are required.</p>
        <p id="nearby-location-error" role={locationError ? 'alert' : undefined} className="text-sm text-rose-700">{locationError}</p>
        <form onSubmit={search} aria-label="Search for a city or address" className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-xs font-bold">City or address (optional)<input ref={cityInput} maxLength={160} disabled={!cityEnabled} value={query} onChange={event => { cancelLocationRequests(); setQuery(event.target.value); }} onKeyDown={event => { if (event.key === 'Escape') { cancelLocationRequests(); cityInput.current?.focus(); } }} aria-describedby="nearby-citySearch-status nearby-city-help nearby-city-error" aria-invalid={Boolean(searchError)} aria-controls="nearby-city-matches" placeholder={cityEnabled ? 'Enter a city, then submit' : 'City search unavailable'} className={inputClass} /></label>
          <button type="submit" disabled={!cityEnabled || searching || query.trim().length < 2} className={buttonClass}>{searching ? 'Searching…' : searchError ? 'Retry city search' : 'Find location'}</button>
        </form>
        <p id="nearby-city-help" className="text-xs text-slate-600">No autocomplete requests. Submit 2–160 characters for up to 5 matches, then choose a result. Escape dismisses matches.</p>
        <p id="nearby-city-error" role={searchError ? 'alert' : undefined} className="text-sm text-rose-700">{searchError}</p>
        {searching && <p role="status" className="text-sm">Searching city locations…</p>}
        {searched && results.length === 0 && <p role="status" className="text-sm">No locations found. Try a nearby city or enter coordinates.</p>}
        <div id="nearby-city-matches" onKeyDown={event => { if (event.key === 'Escape') { cancelLocationRequests(); cityInput.current?.focus(); } }}>
          {results.length > 0 && <><h3 ref={matchesHeading} tabIndex={-1} className={`mb-2 text-sm font-bold ${focusClass}`}>{results.length} location matches — choose one</h3><ul aria-label="Location matches" className="divide-y rounded-lg border">{results.map(result => <li key={result.id}><button onClick={() => choose([result.latitude, result.longitude])} className={`min-h-11 w-full rounded p-3 text-left text-sm hover:bg-slate-50 ${focusClass}`}>{result.label}</button></li>)}</ul></>}
        </div>
        <label className="block text-xs font-bold">Search radius<select aria-label="Search radius" value={radius} onChange={event => setRadius(Number(event.target.value))} className={`${inputClass} sm:max-w-xs`}>{[1000, 5000, 10000, 25000].map(value => <option key={value} value={value}>{value / 1000} km</option>)}</select></label>
      </section>
      {position && <>
        <p className="text-xs text-slate-600">Searching within {radius / 1000} km of {position[0].toFixed(4)}, {position[1].toFixed(4)}. Distances are straight-line estimates.</p>
        {tileConfig?.configured && tileConfig.urlTemplate && tileConfig.attribution ? <section aria-label="Map of the selected search area">
          <p id="nearby-map-help" className="text-xs text-slate-600">Keyboard: focus the map to pan with arrow keys and zoom with + or −. Store details are also listed below.</p>
          <button onClick={() => resultsHeading.current?.focus()} className={`${linkClass} text-sm font-bold text-[#0d7d6f]`}>Skip map to store results</button>
          <div className="relative z-0 h-72 overflow-hidden rounded-2xl border border-slate-200" aria-describedby="nearby-map-help">
            <MapContainer center={position} zoom={12} scrollWheelZoom={false} keyboard style={{ height: '100%', width: '100%' }} attributionControl>
              <TileLayer key={`${tileConfig.urlTemplate}:${tileRetry}`} attribution={tileConfig.attribution} url={tileConfig.urlTemplate} eventHandlers={{ tileerror: () => setTileError(true) }} />
              <Recenter center={position} radius={radius} />
              <Marker position={position} icon={centerIcon} title="Selected search location" keyboard><Popup>Selected search location</Popup></Marker>
              {stores.map(store => <Marker key={store.id} position={[store.latitude!, store.longitude!]} icon={storeIcon} title={store.shopName || store.name || 'Store'} keyboard><Popup><strong>{store.shopName || store.name || 'Store'}</strong><p>{storeLabel(store)}</p><button onClick={() => navigate('customer_store', { selectedStoreId: store.id })} className={linkClass}>View store</button></Popup></Marker>)}
              {places.map(place => <Marker key={place.id} position={[place.latitude, place.longitude]} icon={storeIcon} title={`${place.name} — unverified map business`} keyboard><Popup><strong>{place.name}</strong><p>OpenStreetMap · unverified</p><a href={directions(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer" className={linkClass}>Directions <span className="sr-only">to {place.name} (opens in a new tab)</span></a></Popup></Marker>)}
            </MapContainer>
          </div>
        </section> : <div className="rounded-xl bg-amber-50 p-3 text-sm"><p>{configurationMessage('mapTiles')}</p><p className="mt-1">Store results do not require a map display.</p></div>}
        {tileError && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Map tiles could not fully load. Use the store lists below. <button onClick={() => { setTileError(false); setTileRetry(value => value + 1); }} className={linkClass}>Retry map display</button></div>}
        <section aria-label="Nearby results" className="space-y-5">
          <h2 ref={resultsHeading} tabIndex={-1} className={`rounded font-bold ${focusClass}`}>Nearby results</h2>
          <section aria-labelledby="nearby-registered-heading" aria-busy={registered.status === 'loading'} className="space-y-3">
            <h3 id="nearby-registered-heading" className="font-bold">Registered &amp; sample stores</h3>
            {registered.status === 'loading' && <p role="status" className="text-sm">Finding registered and sample listings…</p>}
            {registered.status === 'error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Registered-store search: {registered.error}</p><button onClick={registered.retry} className={`${linkClass} font-bold`}>Retry registered stores</button></div>}
            {registered.status === 'success' && <p role="status" className="text-sm text-slate-600">{stores.length} registered/sample listings within {radius / 1000} km.{!stores.length && ' Try another location or a larger radius.'}</p>}
            {stores.map(store => <article key={store.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="font-bold">{store.shopName || store.name || 'Store'}</h4><p className="mt-1 text-xs text-slate-600">{storeLabel(store)}{typeof store.distanceMeters === 'number' && ` · ${(store.distanceMeters / 1000).toFixed(1)} km`}</p>
              <p className="mt-2 text-sm">{store.shopAddress || store.formattedAddress || 'Address not provided'}</p>
              <p className="mt-1 text-xs text-slate-600">Reported hours: {store.workingHours || 'Not provided'} · Confirm before visiting.</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-[#0d7d6f]"><button onClick={() => navigate('customer_store', { selectedStoreId: store.id })} className={linkClass}>View store<span className="sr-only"> {store.shopName || store.name}</span></button>{phoneUrl(store.phone) && <a href={phoneUrl(store.phone)} className={linkClass}>Call<span className="sr-only"> {store.shopName || store.name}</span></a>}<a href={directions(store.latitude!, store.longitude!)} target="_blank" rel="noopener noreferrer" className={linkClass}>Directions<span className="sr-only"> to {store.shopName || store.name} (opens in a new tab)</span></a></div>
            </article>)}
          </section>
          <section aria-labelledby="nearby-mapped-heading" aria-busy={mapped.status === 'loading'} className="space-y-3">
            <h3 id="nearby-mapped-heading" className="font-bold">Map businesses · unverified</h3>
            {!capabilities?.mapDiscovery.configured && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>{configurationMessage('mapDiscovery')}</p><button onClick={recheckProviders} disabled={capabilitiesLoading} className={`${linkClass} font-bold disabled:opacity-50`}>Retry provider settings</button></div>}
            {mapped.status === 'loading' && <p role="status" className="text-sm">Finding map businesses… Registered-store results load separately.</p>}
            {mapped.status === 'error' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Map business search: {mapped.error}</p><button onClick={mapped.retry} className={`${linkClass} font-bold`}>Retry map businesses</button></div>}
            {mapped.status === 'success' && <p role="status" className="text-sm text-slate-600">{places.length} map listings within {radius / 1000} km. Coverage may be incomplete.{!places.length && ' Try another location or a larger radius.'}</p>}
            {places.map(place => <article key={place.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex justify-between gap-3"><h4 className="font-bold">{place.name}</h4><span className="text-sm">{(place.distanceMeters / 1000).toFixed(1)} km</span></div>
              <p className="mt-1 text-xs text-slate-600">{place.category} · OpenStreetMap · Unverified business</p><p className="mt-2 text-sm">{place.address}</p>
              <p className="mt-1 text-xs text-slate-600">Reported hours: {place.openingHours || 'Not provided'} · Confirm before visiting.</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-[#0d7d6f]">{phoneUrl(place.phone) && <a href={phoneUrl(place.phone)} className={linkClass}>Call<span className="sr-only"> {place.name}</span></a>}{websiteUrl(place.website) && <a href={websiteUrl(place.website)} target="_blank" rel="noopener noreferrer" className={linkClass}>Website<span className="sr-only"> for {place.name} (opens in a new tab)</span></a>}<a href={directions(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer" className={linkClass}>Directions<span className="sr-only"> to {place.name} (opens in a new tab)</span></a></div>
            </article>)}
          </section>
          {registered.status === 'success' && mapped.status === 'success' && !stores.length && !places.length && <div className="rounded-2xl border border-dashed bg-white p-8 text-center"><Icons.Storefront size={36} className="mx-auto mb-2 text-slate-400" /><p>No stores found within {radius / 1000} km.</p><p className="mt-2 text-sm text-slate-600">Try a different location or increase the radius. Map coverage is not complete.</p></div>}
          <p className="text-xs text-slate-600">Map business data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={`rounded underline ${focusClass}`}>OpenStreetMap contributors</a>. Business details and hours may be outdated. Listings do not confirm product stock; contact the store before visiting.</p>
        </section>
      </>}
    </main>
  </div>;
}
