import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

export default function AnalyticsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    let score = 25; // Base score for creating store
    if (authUser?.shopName && authUser?.email) score += 25;
    if (authUser?.shopAddress && authUser?.latitude) score += 25;
    if (metrics?.totalProducts > 0) score += 25;
    return score;
  };

  const cats = metrics?.categoryDistribution ? Object.keys(metrics.categoryDistribution) : [];
  const mostUploaded = cats.length > 0 ? cats.reduce((a, b) => metrics.categoryDistribution[a] > metrics.categoryDistribution[b] ? a : b) : "N/A";

  const overviewStats = [
    { label: "Products Uploaded", value: metrics?.totalProducts || 0, icon: Icons.UploadCloud, color: "from-[#0d7d6f] to-[#0d7d6f]", bgImg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop" },
    { label: "Inventory Value", value: `₹${(metrics?.totalInventoryValue || 0).toLocaleString()}`, icon: Icons.CurrencyRupee, color: "from-[#10B981] to-[#059669]", bgImg: "https://images.unsplash.com/photo-1574634534894-89d7576c8259?q=80&w=400&auto=format&fit=crop" },
    { label: "Low Stock Items", value: metrics?.lowStock || 0, icon: Icons.Warning, color: "from-[#F59E0B] to-[#D97706]", bgImg: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=400&auto=format&fit=crop" },
    { label: "Active Listings", value: metrics?.activeProducts || 0, icon: Icons.Check, color: "from-[#3B82F6] to-[#2563EB]", bgImg: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=400&auto=format&fit=crop" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#F6F7FF] via-[#FFFFFF] to-[#EEF4FF] pb-24 overflow-y-auto"
    >
      <header className="px-6 h-16 flex items-center justify-between sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">Analytics</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Business Intelligence</p>
        </div>
        <button onClick={() => setScreen('seller_home')} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-[#1A1A1A] border border-slate-200">
          <Icons.Close size={20} />
        </button>
      </header>

      <main className="flex-1 p-5 space-y-6">
        
        {/* Hero Banner for Analytics */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-xl aspect-[21/9] group">
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop" 
            alt="Business Analytics" 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
          
          <div className="absolute inset-y-0 left-0 p-6 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-white leading-tight mb-1">Store<br/>Performance</h3>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Updated just now</p>
          </div>
        </div>

        {/* Premium Overview Grid */}
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            {overviewStats.map((stat, idx) => (
              <div key={idx} className="relative bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden group p-4 flex flex-col justify-between h-36">
                
                {/* Subtle Image Background */}
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                  <img src={stat.bgImg} alt="" className="w-full h-full object-cover" />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} mix-blend-color opacity-50`}></div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md`}>
                    <stat.icon size={18} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="relative z-10 mt-auto">
                  <p className="text-2xl font-black text-[#1A1A1A] tracking-tighter leading-none mb-1">{stat.value}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-[100px] -mr-10 -mt-10 pointer-events-none opacity-50"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-500 border border-teal-100">
              <Icons.PieChart size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1A1A1A]">Category Distribution</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory breakdown</p>
            </div>
          </div>

          <div className="relative z-10">
            {cats.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <Icons.BarChart3 size={32} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold text-slate-400">Not enough data to display charts.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {cats.map((cat) => {
                  const val = metrics.categoryDistribution[cat];
                  const max = Math.max(...Object.values(metrics.categoryDistribution as Record<string, number>));
                  const pct = Math.round((val / max) * 100);
                  
                  return (
                    <div key={cat} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">{cat}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{val} items</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-gradient-to-r from-[#0d7d6f] to-[#0d7d6f] h-full rounded-full group-hover:opacity-80 transition-opacity" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Store Health Score in Analytics */}
        <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
             <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
               <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               <path className="text-emerald-500 transition-all duration-1000 ease-out" strokeDasharray={`${profileCompletion()}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
             </svg>
             <div className="absolute flex flex-col items-center justify-center">
               <span className="text-2xl font-black text-[#1A1A1A] leading-none">{profileCompletion()}%</span>
             </div>
          </div>
          <div className="flex-1">
             <h4 className="text-sm font-black text-[#1A1A1A] mb-1">Store Health</h4>
             <p className="text-xs font-bold text-slate-500 mb-3 leading-relaxed">Your store is perfectly optimized for customer discovery.</p>
             <button onClick={() => setScreen('store_profile')} className="text-[10px] font-black text-white bg-[#0d7d6f] px-4 py-2 rounded-lg uppercase tracking-widest shadow-sm active:scale-95 transition-transform">
               View Profile
             </button>
          </div>
        </div>

      </main>
    </motion.div>
  );
}
