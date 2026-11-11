import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customMarkerIcon = new L.DivIcon({
  className: 'custom-premium-marker',
  html: `
    <div style="width: 40px; height: 40px; background: #0d7d6f; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); border: 3px solid white;">
      <div style="transform: rotate(45deg); color: white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={customMarkerIcon} draggable={true} eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }} />
  );
}

export default function StoreProfileScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser, setAuthUser } = useAuth();
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Map state
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'terrain'>('street');

  // AI Name state
  const [suggestingName, setSuggestingName] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

  useEffect(() => {
    if (authUser) {
      setFormData({
        logo: authUser.logo || '',
        banner: authUser.banner || '',
        shopName: authUser.shopName || '',
        ownerName: authUser.ownerName || '',
        gstNumber: authUser.gstNumber || '',
        businessRegistration: authUser.businessRegistration || '',
        phone: authUser.phone || '',
        email: authUser.email || '',
        whatsappNumber: authUser.whatsappNumber || '',
        shopAddress: authUser.shopAddress || '',
        city: authUser.city || '',
        state: authUser.state || '',
        country: authUser.country || '',
        postalCode: authUser.postalCode || '',
        workingHours: authUser.workingHours || '',
        returnPolicy: authUser.returnPolicy || ''
      });
      if (authUser.latitude && authUser.longitude) {
        setPosition(new L.LatLng(authUser.latitude, authUser.longitude));
      } else {
        // Default to Hyderabad
        setPosition(new L.LatLng(17.3850, 78.4867));
      }
    }
  }, [authUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        latitude: position?.lat,
        longitude: position?.lng
      };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUser?.id || ''
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setAuthUser(updatedUser);
        setSaved(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLocateMe = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition(new L.LatLng(lat, lng));
        
        // Reverse Geocoding
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          if (data && data.address) {
            setFormData((prev: any) => ({
              ...prev,
              shopAddress: data.display_name || prev.shopAddress,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              state: data.address.state || prev.state,
              postalCode: data.address.postcode || prev.postalCode
            }));
            setSaved(false);
          }
        } catch(e) {}
        setLocating(false);
      }, () => {
        alert("Location access denied.");
        setLocating(false);
      });
    } else {
      setLocating(false);
    }
  };

  const suggestStoreNames = async () => {
    setSuggestingName(true);
    try {
      const res = await fetch('/api/ai/suggest-store-name', { method: 'POST' });
      const data = await res.json();
      if (data.names && data.names.length > 0) {
        setSuggestedNames(data.names);
      }
    } catch (e) {} finally {
      setSuggestingName(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#F7F7FA] pb-20"
    >
      <header className="px-5 h-14 bg-white flex items-center justify-between border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <h1 className="text-base font-black text-[#1A1A1A]">Store Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="text-xs font-black text-white bg-[#0d7d6f] px-4 py-1.5 rounded-lg disabled:opacity-50 active:scale-95"
        >
          {loading ? 'SAVING...' : saved ? 'SAVED' : 'SAVE'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-[#0d7d6f] uppercase tracking-widest">Business Identity</h2>
            {!formData.shopName && (
               <button onClick={suggestStoreNames} disabled={suggestingName} className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                 <Icons.AutoAwesome size={12} /> {suggestingName ? 'THINKING...' : 'AI SUGGEST'}
               </button>
            )}
          </div>
          
          {suggestedNames.length > 0 && !formData.shopName && (
            <div className="flex flex-wrap gap-2 mb-2">
              {suggestedNames.map(name => (
                <button 
                  key={name}
                  onClick={() => { setFormData({...formData, shopName: name}); setSuggestedNames([]); }}
                  className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-bold hover:bg-[#0d7d6f] hover:text-white transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Shop Logo (URL)</label>
              <input name="logo" value={formData.logo || ''} onChange={handleChange} placeholder="https://..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Shop Banner (URL)</label>
              <input name="banner" value={formData.banner || ''} onChange={handleChange} placeholder="https://..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Store Name</label>
            <input name="shopName" value={formData.shopName || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Owner Name</label>
            <input name="ownerName" value={formData.ownerName || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">GST Number (Optional)</label>
              <input name="gstNumber" value={formData.gstNumber || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Registration No (Optional)</label>
              <input name="businessRegistration" value={formData.businessRegistration || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
          </div>
        </div>

        {/* Location & Map */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-[#0d7d6f] uppercase tracking-widest">Store Location</h2>
            <button onClick={handleLocateMe} disabled={locating} className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
              <Icons.MyLocation size={12} /> {locating ? 'LOCATING...' : 'LOCATE ME'}
            </button>
          </div>

          <div className="h-96 -mx-4 -mb-4 mt-4 bg-slate-100 rounded-b-2xl overflow-hidden border-t border-slate-200 z-10 relative" style={{ width: 'calc(100% + 2rem)' }}>
            
            {/* Custom Glassmorphism Map Layer Toggle */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex gap-1 p-1.5 bg-white/60 backdrop-blur-xl border border-white/80 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <button 
                onClick={(e) => { e.preventDefault(); setMapStyle('street'); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${mapStyle === 'street' ? 'bg-white text-[#0d7d6f] shadow-sm scale-105' : 'text-slate-700 hover:bg-white/60'}`}
              >
                Street
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); setMapStyle('satellite'); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${mapStyle === 'satellite' ? 'bg-white text-[#0d7d6f] shadow-sm scale-105' : 'text-slate-700 hover:bg-white/60'}`}
              >
                Satellite
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); setMapStyle('terrain'); }} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${mapStyle === 'terrain' ? 'bg-white text-[#0d7d6f] shadow-sm scale-105' : 'text-slate-700 hover:bg-white/60'}`}
              >
                3D Terrain
              </button>
            </div>

            {position && (
              <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                {mapStyle === 'street' && (
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                )}
                {mapStyle === 'satellite' && (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                )}
                {mapStyle === 'terrain' && (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
                )}
                <LocationMarker position={position} setPosition={setPosition} />
              </MapContainer>
            )}
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Store Address</label>
            <textarea name="shopAddress" value={formData.shopAddress || ''} onChange={handleChange} rows={2} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
              <input name="city" value={formData.city || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
              <input name="state" value={formData.state || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">PIN</label>
              <input name="postalCode" value={formData.postalCode || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Country</label>
              <input name="country" value={formData.country || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-[10px] font-black text-[#0d7d6f] uppercase tracking-widest">Contact Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
              <input name="phone" value={formData.phone || ''} onChange={handleChange} disabled className="w-full mt-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp Number</label>
              <input name="whatsappNumber" value={formData.whatsappNumber || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
            <input name="email" value={formData.email || ''} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>
        </div>

        {/* Store Operations */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-[10px] font-black text-[#0d7d6f] uppercase tracking-widest">Operations</h2>
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Working Hours</label>
            <input name="workingHours" value={formData.workingHours || ''} onChange={handleChange} placeholder="e.g. Mon-Sat 10 AM to 9 PM" className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Return Policy</label>
            <textarea name="returnPolicy" value={formData.returnPolicy || ''} onChange={handleChange} rows={3} placeholder="Describe return conditions..." className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]" />
          </div>
        </div>
      </main>
    </motion.div>
  );
}
