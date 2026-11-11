import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from '../Icons';
import { Screen } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SellerLayoutProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  children: React.ReactNode;
}

export default function SellerLayout({ currentScreen, setScreen, children }: SellerLayoutProps) {
  const { logout, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  const bottomTabs = [
    { id: 'seller_home', label: 'Home', icon: Icons.Home },
    { id: 'inventory', label: 'Inventory', icon: Icons.Box },
    // Center is floating upload
    { id: 'analytics', label: 'Analytics', icon: Icons.BarChart3 },
    { id: 'store_profile', label: 'Profile', icon: Icons.Store }
  ];

  const drawerLinks = [
    { id: 'seller_home', label: 'Dashboard', icon: Icons.Home },
    { id: 'add_product', label: 'Upload Garments', icon: Icons.UploadCloud },
    { id: 'media_gallery', label: 'Media Gallery', icon: Icons.ImageIcon },
    { id: 'inventory', label: 'Inventory', icon: Icons.Box },
    { id: 'add_product', label: 'AI Assistant', icon: Icons.Bot },
    { id: 'analytics', label: 'Analytics', icon: Icons.BarChart3 },
    { id: 'store_profile', label: 'Store Profile', icon: Icons.Store },
    { id: 'notifications', label: 'Notifications', icon: Icons.Notifications },
    { id: 'support', label: 'Support', icon: Icons.MessageSquare },
    { id: 'settings', label: 'Settings', icon: Icons.SettingsIcon }
  ];

  // We can pass toggleDrawer to children if we cloneElement, or we can just render the TopAppBar here.
  // The spec says TOP APP BAR for the dashboard. We'll render a global one here, and hide it on screens that want full control, OR just render it here for all.
  const showTopBar = ['seller_home'].includes(currentScreen);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] h-full overflow-hidden relative">
      
      {showTopBar && (
        <header className="px-4 h-16 bg-white flex items-center justify-between border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={toggleDrawer} className="p-2 -ml-2 text-[#1A1A1A] active:scale-95">
              <Icons.Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-sm">
                {user?.shopName ? user.shopName.charAt(0).toUpperCase() : "S"}
              </div>
              <h1 className="text-base font-black text-[#1A1A1A]">{user?.shopName || "My Store"}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-600 active:scale-95">
              <Icons.Search size={22} />
            </button>
            <button onClick={() => setScreen('notifications')} className="p-2 text-slate-600 active:scale-95 relative">
              <Icons.Notifications size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <button className="p-2 text-slate-600 active:scale-95">
              <Icons.MessageSquare size={22} />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Pass down toggleDrawer if children need it, but for now we just use the global top bar */}
        {children}
      </main>

      {/* Floating Upload Button */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => setScreen('add_product')}
          className="w-14 h-14 bg-[#0d7d6f] hover:bg-[#0a6659] text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30 border-4 border-[#F8FAFC] active:scale-95 transition-transform"
        >
          <Icons.AddAPhoto size={24} />
        </button>
      </div>

      {/* Fixed Bottom Nav */}
      <div className="bg-white border-t border-slate-200 sticky bottom-0 z-40 px-2 py-2 flex justify-between items-center h-16">
        <div className="flex flex-1 justify-around items-center pr-8">
          {bottomTabs.slice(0, 2).map((tab) => {
            const isActive = currentScreen === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id as Screen)}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  isActive ? "text-[#0d7d6f]" : "text-slate-500"
                }`}
              >
                <IconComp size={22} fill={isActive ? "#0d7d6f" : "none"} className={isActive ? "text-[#0d7d6f]" : "text-slate-500"} />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="flex flex-1 justify-around items-center pl-8">
          {bottomTabs.slice(2, 4).map((tab) => {
            const isActive = currentScreen === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id as Screen)}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  isActive ? "text-[#0d7d6f]" : "text-slate-500"
                }`}
              >
                <IconComp size={22} fill={isActive ? "#0d7d6f" : "none"} className={isActive ? "text-[#0d7d6f]" : "text-slate-500"} />
                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-out Drawer Overlay */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleDrawer}
              className="absolute inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white z-[110] shadow-2xl flex flex-col"
            >
              <div className="p-6 bg-gradient-to-br from-[#0d7d6f] to-teal-900 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-400 opacity-20 rounded-full blur-xl"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black mb-4 border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
                    {user?.shopName ? user.shopName.charAt(0).toUpperCase() : "S"}
                  </div>
                  <div className="bg-emerald-500/80 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-400/50 shadow-sm mt-1">
                    <Icons.Verified size={12} className="text-white" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Verified Store</span>
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    {user?.shopName || "My Store"}
                  </h2>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs font-bold text-teal-100 flex items-center gap-1.5 opacity-90">
                      <Icons.Email size={12} />
                      {user?.email || "owner@store.com"}
                    </p>
                    <p className="text-[10px] font-bold text-teal-200/80 uppercase tracking-widest flex items-center gap-1.5">
                      <Icons.LocationOn size={12} />
                      {user?.shopAddress || "Premium Location"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                {drawerLinks.map(link => {
                  const IconComp = link.icon;
                  const isActive = currentScreen === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        setScreen(link.id as Screen);
                        toggleDrawer();
                      }}
                      className={`w-full flex items-center gap-4 px-6 py-3 transition-colors ${
                        isActive ? 'bg-teal-50 border-r-4 border-[#0d7d6f] text-[#0d7d6f]' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp size={20} className={isActive ? 'text-[#0d7d6f]' : 'text-slate-400'} />
                      <span className="text-sm font-bold">{link.label}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    await logout();
                    setScreen('login');
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold"
                >
                  <Icons.LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
