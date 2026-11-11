import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../../types';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import StyleQuote from '../StyleQuote';

export default function WelcomeScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [locationText, setLocationText] = useState("Location Pending Setup");
  const [isLocating, setIsLocating] = useState(false);

  const handleDetectLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          if (data && data.address) {
            setLocationText(data.display_name || "Location Found");
          } else {
            setLocationText("Location Found");
          }
        } catch (e) {
          setLocationText("Location Found");
        }
        setIsLocating(false);
      }, () => {
        setIsLocating(false);
        setLocationText("Location access denied");
      });
    } else {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="entry-welcome-screen relative absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#F6F7FF] via-[#FFFFFF] to-[#EEF4FF] p-6 text-[#1A1A1A]"
      aria-labelledby="seller-welcome-title"
    >
      {/* Decorative Premium Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }} 
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] pointer-events-none opacity-40 mix-blend-multiply"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(79, 70, 229, 0.08) 0%, transparent 40%)'
        }}
      />

      <main className="z-10 flex w-full max-w-sm flex-col items-center text-center">
        
        {/* Header Illustration */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-36 h-36 rounded-[2rem] shadow-2xl flex items-center justify-center border-4 border-white z-10 relative overflow-hidden bg-white"
          >
            <img 
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop" 
              alt="Premium Storefront" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-3 -right-3 bg-[#10B981] text-white rounded-full p-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.4)] border-[3px] border-white z-20"
          >
              <Icons.Check size={18} strokeWidth={4} aria-hidden="true" />
          </motion.div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Welcome Back</p>
          <h1 id="seller-welcome-title" className="mb-1 text-3xl font-black tracking-tight text-[#1A1A1A]">{user?.name?.split(' ')[0] || "Seller"}</h1>
          <p className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#0d7d6f] to-[#0d7d6f]">
            {user?.shopName || "My Fashion Store"}
          </p>
        </motion.div>

        {/* Location Card with Heavy Glassmorphism */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full bg-white/40 backdrop-blur-2xl p-5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/60 mt-8 mb-8 text-left flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Subtle reflection inside card */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-[2rem]"></div>

          <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                <Icons.VerifiedUser size={12} aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-widest">Verified Seller</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
            </div>
          </div>

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/80 rounded-2xl flex items-center justify-center text-[#0d7d6f] shadow-sm shrink-0 border border-white">
                <Icons.LocationOn size={20} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-0.5">Store Address</p>
              <p className="text-sm font-black text-[#1A1A1A] leading-tight line-clamp-2">
                {user?.shopAddress || locationText}
              </p>
            </div>
            {!user?.shopAddress && (
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                aria-label={isLocating ? 'Detecting store location' : 'Detect store location'}
                aria-busy={isLocating}
                className="bg-white/80 hover:bg-white text-[#0d7d6f] p-2.5 rounded-xl shadow-sm border border-white active:scale-95 transition-all"
              >
                {isLocating ? <Icons.Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Icons.MyLocation size={18} aria-hidden="true" />}
              </button>
            )}
          </div>
          
          <div className="h-px bg-slate-200/50 w-full relative z-10"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/80 rounded-2xl flex items-center justify-center text-[#0d7d6f] shadow-sm shrink-0 border border-white">
              <Icons.Schedule size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-0.5">{currentDate}</p>
              <p className="text-sm font-black text-[#1A1A1A] leading-none">{currentTime}</p>
            </div>
          </div>
        </motion.div>

        {/* Action Button & Footer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full"
        >
          <StyleQuote className="mb-5 mt-1 max-w-xs text-[#5144c7]" />

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setScreen('seller_home')}
            className="group w-full bg-gradient-to-r from-[#0d7d6f] via-[#0d7d6f] to-[#EC4899] text-white h-16 rounded-2xl flex items-center justify-center gap-3 shadow-[0_8px_24px_rgba(124,58,237,0.3)] hover:shadow-[0_12px_32px_rgba(124,58,237,0.4)] transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-xs font-black uppercase tracking-[0.2em] relative z-10 text-white shadow-sm">Enter My Store</span>
            <motion.div 
              initial={{ x: 0 }} 
              animate={{ x: [0, 5, 0] }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="relative z-10 text-white"
            >
              <Icons.ArrowForward size={20} strokeWidth={3} aria-hidden="true" />
            </motion.div>
          </motion.button>
          
          <p className="text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-[0.2em]">
            Manage your inventory with confidence.
          </p>
        </motion.div>

      </main>
    </motion.div>
  );
}
