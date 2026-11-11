import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

export default function DashboardScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [reminders, setReminders] = useState([
    { id: 1, title: 'Complete store profile', icon: Icons.Store, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' },
    { id: 2, title: 'Verify GST details', icon: Icons.VerifiedUser, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { id: 3, title: 'Upload summer collection', icon: Icons.UploadCloud, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' }
  ]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/analytics/dashboard', {
          headers: { 'x-user-id': authUser?.id || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [authUser]);

  const profileCompletion = () => {
    let score = 25; 
    if (authUser?.shopName && authUser?.email) score += 25;
    if (authUser?.shopAddress && authUser?.latitude) score += 25;
    if (metrics?.totalProducts > 0) score += 25;
    return score;
  };

  const banners = [
    { 
      id: 1, 
      tag: "New Feature", 
      title: "Automate your daily listings.", 
      subtitle: "Use AI to instantly generate descriptions and pricing for your new arrivals.",
      cta: "Upload Collection",
      img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1200&auto=format&fit=crop"
    },
    { 
      id: 2, 
      tag: "Trending", 
      title: "Winter Collection is live.", 
      subtitle: "Update your inventory with the latest seasonal wear to boost sales.",
      cta: "Manage Inventory",
      img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const quickStats = [
    { label: "Total Products", value: metrics?.totalProducts || 0, icon: Icons.Package, img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=200&auto=format&fit=crop" },
    { label: "Products Live", value: metrics?.activeProducts || 0, icon: Icons.Check, img: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=200&auto=format&fit=crop" },
    { label: "Inventory Value", value: `₹${(metrics?.totalInventoryValue || 0).toLocaleString()}`, icon: Icons.CurrencyRupee, img: "https://images.unsplash.com/photo-1555529733-0e67056058e1?q=80&w=200&auto=format&fit=crop" }
  ];

  const quickActions = [
    { label: "Live Navigation", sub: "Location Intel", id: "location_setup", img: "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&auto=format&fit=crop" },
    { label: "Upload Collection", sub: "Add new arrivals", id: "add_product", img: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?q=80&w=400&auto=format&fit=crop" },
    { label: "Inventory", sub: "Manage stock", id: "inventory", img: "https://images.unsplash.com/photo-1558769132-cb1fac08c04b?q=80&w=400&auto=format&fit=crop" },
    { label: "Analytics", sub: "Business insights", id: "analytics", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop" },
    { label: "Store Profile", sub: "Manage your shop", id: "store_profile", img: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=400&auto=format&fit=crop" },
  ];

  const activities = [
    { id: 1, text: "Product 'Blue Hoodie' uploaded", time: "10 mins ago", icon: Icons.UploadCloud, color: "text-blue-500", bg: "bg-blue-50" },
    { id: 2, text: "Price updated for 'Denim Jacket'", time: "2 hours ago", icon: Icons.Tag, color: "text-amber-500", bg: "bg-amber-50" },
    { id: 3, text: "Store location changed", time: "Yesterday", icon: Icons.MapPin, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#F6F7FF] via-[#FFFFFF] to-[#EEF4FF] pb-24 overflow-y-auto"
    >
      <div className="p-5 space-y-8">
        
        {/* Business Snapshot Card */}
        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative group">
          <div className="h-28 w-full bg-slate-100 relative overflow-hidden">
             <img src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Store Cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
             
             {/* Badges Overlay */}
             <div className="absolute top-4 right-4 flex gap-2">
               <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black text-[#0d7d6f] flex items-center gap-1 shadow-sm uppercase tracking-widest border border-white/50">
                 <Icons.VerifiedUser size={10} /> Premium Store
               </div>
               <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black text-emerald-600 flex items-center gap-1 shadow-sm uppercase tracking-widest border border-white/50">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Open
               </div>
             </div>
          </div>
          
          <div className="px-5 pb-5 relative">
             <div className="flex justify-between items-end -mt-10 mb-4">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-md border-[3px] border-white overflow-hidden z-10">
                   {authUser?.photoURL ? (
                     <img src={authUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-teal-50 flex items-center justify-center text-teal-500 font-black text-2xl">
                       {authUser?.name?.charAt(0) || 'S'}
                     </div>
                   )}
                </div>
                
                <div className="text-right z-10 pt-12">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</p>
                   <p className="text-sm font-black text-emerald-500 flex items-center gap-1 justify-end"><Icons.TrendingUp size={14}/> +12.4%</p>
                </div>
             </div>
             
             <div className="mb-5">
               <h2 className="text-xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-2">
                 {authUser?.shopName || authUser?.name || 'My Boutique'}
                 <Icons.VerifiedUser size={16} className="text-[#0d7d6f]" />
               </h2>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Last synced: Today, 10:42 AM</p>
             </div>

             <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Inventory Value</p>
                   <p className="text-lg font-black text-[#1A1A1A]">₹{(metrics?.totalInventoryValue || 0).toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Store Profile</p>
                   <div className="flex items-center gap-2 mt-1">
                     <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${profileCompletion()}%` }} className="h-full bg-[#0d7d6f] rounded-full"></motion.div>
                     </div>
                     <span className="text-[10px] font-black text-[#1A1A1A]">{profileCompletion()}%</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Dynamic Hero Banner Carousel */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-xl aspect-[16/9] cursor-pointer group">
          <AnimatePresence mode="wait">
            <motion.div
              key={bannerIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full"
              onClick={() => banners[bannerIndex].id === 3 ? setScreen('inventory') : setScreen('add_product')}
            >
              <img 
                src={banners[bannerIndex].img} 
                alt={banners[bannerIndex].title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
              
              <div className="absolute inset-x-0 bottom-0 p-6 z-10">
                <motion.div 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black uppercase tracking-[0.2em] mb-3 border border-white/30"
                >
                  {banners[bannerIndex].tag}
                </motion.div>
                <motion.h3 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-black text-white leading-tight mb-2 drop-shadow-md"
                >
                  {banners[bannerIndex].title.split('.').map((part, i, arr) => (
                    <React.Fragment key={i}>{part}{i < arr.length - 1 && <br/>}</React.Fragment>
                  ))}
                </motion.h3>
                
                <motion.button 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white text-[#1A1A1A] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 group-hover:bg-[#0d7d6f] group-hover:text-white transition-colors shadow-lg mt-4"
                >
                  {banners[bannerIndex].cta} <Icons.ArrowForward size={16} />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-4 right-4 flex gap-1.5 z-20">
             {banners.map((_, idx) => (
               <div 
                 key={idx} 
                 className={`h-1.5 rounded-full transition-all duration-300 ${idx === bannerIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} 
               />
             ))}
          </div>
        </div>

        {/* Smart Business Reminders */}
        <AnimatePresence>
          {reminders.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tasks for Today</h3>
              <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-hide">
                {reminders.map(rem => (
                   <motion.div layout key={rem.id} className="min-w-[200px] bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${rem.bg} ${rem.color} border ${rem.border} flex items-center justify-center`}>
                           <rem.icon size={14} />
                        </div>
                        <span className="text-xs font-bold text-[#1A1A1A] truncate max-w-[120px]">{rem.title}</span>
                     </div>
                     <button onClick={() => setReminders(prev => prev.filter(r => r.id !== rem.id))} className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100">
                        <Icons.Close size={12} />
                     </button>
                   </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Low Stock Center Widget */}
        <div className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[100px] -mr-10 -mt-10 pointer-events-none opacity-50"></div>
           
           <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                 <Icons.Warning size={14} />
               </div>
               <h3 className="text-sm font-black text-[#1A1A1A]">Low Stock Center</h3>
             </div>
             <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{metrics?.lowStock || 3} Items</span>
           </div>

           <div className="space-y-3 relative z-10">
             {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=100&auto=format&fit=crop" className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="text-xs font-black text-[#1A1A1A]">Premium Silk Top</p>
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Only 2 left</p>
                    </div>
                  </div>
                  <button onClick={() => setScreen('inventory')} className="text-[9px] font-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg uppercase tracking-widest text-[#0d7d6f] shadow-sm hover:bg-[#0d7d6f] hover:text-white transition-colors">
                    Restock
                  </button>
                </div>
             ))}
           </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Management Hub</h3>
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 scrollbar-hide">
            {quickActions.map((action, idx) => (
              <button 
                key={idx}
                onClick={() => setScreen(action.id as Screen)} 
                className="min-w-[200px] bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex-shrink-0 text-left overflow-hidden group active:scale-95 transition-all"
              >
                <div className="h-24 overflow-hidden relative">
                  <img src={action.img} alt={action.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-black text-[#1A1A1A]">{action.label}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{action.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Activity Timeline</h3>
           <div className="space-y-6">
              {activities.map((act, i) => (
                 <div key={act.id} className="flex gap-4 relative">
                   {i !== activities.length - 1 && (
                     <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>
                   )}
                   <div className={`w-8 h-8 rounded-full ${act.bg} ${act.color} flex items-center justify-center shrink-0 border-[3px] border-white shadow-sm z-10`}>
                     <act.icon size={14} />
                   </div>
                   <div className="pt-1.5">
                     <p className="text-xs font-bold text-[#1A1A1A]">{act.text}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{act.time}</p>
                   </div>
                 </div>
              ))}
           </div>
        </div>

      </div>
    </motion.div>
  );
}
