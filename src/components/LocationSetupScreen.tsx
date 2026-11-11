import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as Icons from './Icons';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../types';

// Premium Pulsing Blue Dot for Current Location
const liveLocationIcon = L.divIcon({
  className: "custom-live-location",
  html: `<div class="relative flex items-center justify-center">
    <div class="absolute w-14 h-14 bg-blue-500/20 rounded-full animate-ping"></div>
    <div class="absolute w-8 h-8 bg-blue-500/40 rounded-full animate-pulse"></div>
    <div class="w-5 h-5 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)] border-[3px] border-white relative z-10"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Premium Store Location Pin
const storeMarkerIcon = L.divIcon({
  className: 'custom-premium-marker',
  html: `
    <div style="width: 44px; height: 44px; background: #1A1A1A; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4); border: 3px solid white;">
      <div style="transform: rotate(45deg); color: white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

function MapController({ center, zoom, mapRotation }: { center: [number, number]; zoom: number; mapRotation: number }) {
  const map = useMap();
  useEffect(() => {
      map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);

  useEffect(() => {
      const container = map.getContainer();
      container.style.transition = "transform 0.5s ease-out";
      container.style.transform = `rotate(${mapRotation}deg)`;
  }, [mapRotation, map]);

  return null;
}

export default function LocationSetupScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser } = useAuth();
  
  // State for Live GPS
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'denied'>('searching');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Compass state
  const [compassHeading, setCompassHeading] = useState(0);
  
  // Map State
  const [mapType, setMapType] = useState<'street' | 'satellite' | 'hybrid' | '3d'>('street');
  const [zoom, setZoom] = useState(15);
  const [mapRotation, setMapRotation] = useState(0);

  // Address
  const [addressDetails, setAddressDetails] = useState<any>(null);

  // Store Location (target)
  const storeLocation: [number, number] = [
    authUser?.latitude || 17.3850, 
    authUser?.longitude || 78.4867
  ];

  useEffect(() => {
    // 1. Watch GPS Position
    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
          setAccuracy(Math.round(pos.coords.accuracy));
          setGpsStatus('active');
          setLastUpdated(new Date());
          
          // Reverse geocode once when we get first lock
          if (!addressDetails) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=18&addressdetails=1`)
              .then(res => res.json())
              .then(data => {
                if(data && data.address) setAddressDetails(data);
              }).catch(e => console.error(e));
          }
        },
        (err) => {
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      setGpsStatus('denied');
    }

    // 2. Compass Sensor
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // e.webkitCompassHeading is for iOS, e.alpha for Android
      let heading = (e as any).webkitCompassHeading || (360 - (e.alpha || 0));
      if ((e as any).webkitCompassHeading) {
      heading = (e as any).webkitCompassHeading;(Math.round(heading));
      }
      if (heading) {
        setCompassHeading(Math.round(heading));
      }
    };
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const getHeadingText = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'North';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'East';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'South';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'West';
    return 'NW';
  };

  const getTileUrl = () => {
    switch (mapType) {
      case 'satellite': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'hybrid': return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'; // usually needs overlay
      case '3d': return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      default: return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // Mock distance calc
  const distanceKm = currentLocation ? 
    Math.sqrt(Math.pow(currentLocation[0] - storeLocation[0], 2) + Math.pow(currentLocation[1] - storeLocation[1], 2)) * 111
    : 0;
  
  const estDriveMins = Math.max(1, Math.round((distanceKm / 30) * 60));
  const estWalkMins = Math.max(1, Math.round((distanceKm / 5) * 60));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col h-full bg-[#F6F7FF] relative overflow-hidden">
      
      {/* Absolute Full Map Background */}
      <div className={`absolute inset-0 z-0 transition-transform duration-1000 ${mapType === '3d' ? 'scale-125 perspective-1000 rotate-x-[30deg]' : ''}`}>
        <MapContainer center={currentLocation || storeLocation} zoom={zoom} zoomControl={false} className="w-full h-full">
          <TileLayer url={getTileUrl()} />
          
          {currentLocation && <Marker position={currentLocation} icon={liveLocationIcon} />}
          <Marker position={storeLocation} icon={storeMarkerIcon} />
          
          {currentLocation && (
            <Polyline 
              positions={[currentLocation, storeLocation]} 
              color="#0d7d6f" 
              weight={4} 
              dashArray="8, 8" 
              opacity={0.8}
            />
          )}

          <MapController center={currentLocation || storeLocation} zoom={zoom} mapRotation={mapRotation} />
        </MapContainer>
      </div>

      {/* Top Header / Nav */}
      <header className="px-5 h-16 flex items-center justify-between sticky top-0 z-40 bg-white/60 backdrop-blur-2xl border-b border-white/40 shadow-sm mt-safe">
        <div className="flex items-center gap-3">
           <button onClick={() => setScreen('seller_home')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1A1A1A] border border-slate-200 shadow-sm active:scale-90 transition-transform">
             <Icons.ArrowBack size={20} />
           </button>
           <div>
             <h1 className="text-sm font-black text-[#1A1A1A]">Location Intelligence</h1>
             <div className="flex items-center gap-1.5 mt-0.5">
               {gpsStatus === 'active' ? (
                 <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">LIVE GPS TRACKING</span></>
               ) : (
                 <><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">SEARCHING SATELLITES</span></>
               )}
             </div>
           </div>
        </div>
      </header>

      {/* Main Content Overlay (Pointer events none for the wrapper, auto for cards) */}
      <div className="flex-1 z-10 flex flex-col justify-between pointer-events-none p-4 pb-24">
         
         {/* Top Data Cards (Compass & Weather) */}
         <div className="flex gap-3 pointer-events-auto">
            {/* Live Compass Card */}
            <div className="bg-white/80 backdrop-blur-2xl p-4 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex-1 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-20"><Icons.Explore size={64} /></div>
               
               <div className="relative w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center mb-2 shadow-inner bg-white">
                 <motion.div 
                   className="w-full h-full flex flex-col items-center justify-center relative"
                   style={{ rotate: -compassHeading }}
                 >
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[20px] border-l-transparent border-r-transparent border-b-rose-500 absolute top-1"></div>
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[20px] border-l-transparent border-r-transparent border-t-slate-800 absolute bottom-1"></div>
                 </motion.div>
               </div>
               
               <p className="text-2xl font-black text-[#1A1A1A] leading-none">{compassHeading}°</p>
               <p className="text-[9px] font-bold text-[#0d7d6f] uppercase tracking-widest mt-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">Facing {getHeadingText(compassHeading)}</p>
            </div>

            {/* Weather & Sun Card */}
            <div className="bg-white/80 backdrop-blur-2xl p-4 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex-1 flex flex-col justify-between">
               <div className="flex items-start justify-between">
                 <div>
                   <h3 className="text-3xl font-black text-[#1A1A1A] leading-none">28°<span className="text-lg text-slate-400">C</span></h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Mostly Clear</p>
                 </div>
                 <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shadow-inner">
                   <Icons.AutoAwesome size={20} />
                 </div>
               </div>
               
               <div className="space-y-1.5 mt-3">
                 <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Icons.ArrowUp size={10}/> Sunrise</span>
                    <span className="text-[10px] font-black text-[#1A1A1A]">06:12 AM</span>
                 </div>
                 <div className="flex items-center justify-between bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Icons.ArrowDown size={10}/> Sunset</span>
                    <span className="text-[10px] font-black text-[#1A1A1A]">06:45 PM</span>
                 </div>
               </div>
            </div>
         </div>

         {/* Bottom Control Hub */}
         <div className="mt-auto space-y-4 pointer-events-auto">
            
            {/* Map Tools */}
            <div className="flex justify-end gap-3">
               <div className="flex flex-col gap-2 bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
                  <button onClick={() => setMapType('street')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${mapType==='street'?'bg-[#1A1A1A] text-white':'text-slate-600 hover:bg-slate-100'}`}><Icons.Map size={18}/></button>
                  <button onClick={() => setMapType('satellite')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${mapType==='satellite'?'bg-[#1A1A1A] text-white':'text-slate-600 hover:bg-slate-100'}`}><Icons.ImageIcon size={18}/></button>
                  <button onClick={() => setMapType('3d')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${mapType==='3d'?'bg-[#0d7d6f] text-white':'text-slate-600 hover:bg-slate-100'}`}><Icons.Layers size={18}/></button>
               </div>
               
               <div className="flex flex-col gap-2 justify-end">
                  <button onClick={() => setMapRotation(prev => (prev + 90) % 360)} className="w-12 h-12 bg-white/90 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-lg flex items-center justify-center text-[#1A1A1A] active:scale-95 transition-transform"><Icons.Refresh size={20}/></button>
                  <button onClick={() => setZoom(prev => Math.min(prev+1, 19))} className="w-12 h-12 bg-white/90 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-lg flex items-center justify-center text-[#1A1A1A] active:scale-95 transition-transform font-bold text-xl">+</button>
                  <button onClick={() => setZoom(prev => Math.max(prev-1, 5))} className="w-12 h-12 bg-white/90 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-lg flex items-center justify-center text-[#1A1A1A] active:scale-95 transition-transform font-bold text-xl">-</button>
               </div>
            </div>

            {/* Premium Location Card */}
            <div className="bg-white/90 backdrop-blur-3xl rounded-[2rem] p-5 border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
               
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-[#0d7d6f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
                        <Icons.Store size={22} />
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-[#1A1A1A] leading-tight">{authUser?.shopName || 'Premium Boutique'}</h2>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Open until 9 PM</p>
                     </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Routing</p>
                     <p className="text-xl font-black text-[#1A1A1A]">{distanceKm.toFixed(1)}<span className="text-xs text-slate-500 ml-0.5">km</span></p>
                  </div>
               </div>

               {/* Address Reverse Geocode Result */}
               {addressDetails && (
                 <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Detected Area</p>
                    <p className="text-sm font-bold text-[#1A1A1A] leading-snug">{addressDetails.display_name}</p>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Icons.DirectionsWalk size={14} /></div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Walk</p>
                        <p className="text-sm font-black text-[#1A1A1A]">{estWalkMins} min</p>
                     </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Icons.LocalMall size={14} /></div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Drive</p>
                        <p className="text-sm font-black text-[#1A1A1A]">{estDriveMins} min</p>
                     </div>
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="flex gap-3">
                  <button className="flex-1 bg-slate-100 text-[#1A1A1A] font-black text-[10px] uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                     <Icons.ShareIcon size={14} /> Share
                  </button>
                  <button className="flex-[2] bg-[#1A1A1A] text-white font-black text-xs uppercase tracking-wider py-4 rounded-xl shadow-xl shadow-black/20 flex items-center justify-center gap-2 hover:bg-black transition-colors active:scale-95">
                     <Icons.Navigation size={16} /> Start Navigation
                  </button>
               </div>

            </div>
         </div>
      </div>
    </motion.div>
  );
}
