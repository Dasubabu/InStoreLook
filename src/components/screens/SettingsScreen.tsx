import React from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

export default function SettingsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { logout } = useAuth();
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [darkEnabled, setDarkEnabled] = React.useState(false);
  const [aiAutoFillEnabled, setAiAutoFillEnabled] = React.useState(() => {
    return localStorage.getItem("aiAutoFillEnabled") !== "false";
  });

  React.useEffect(() => {
    if (darkEnabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkEnabled]);

  const toggleAiAutoFill = () => {
    const nextVal = !aiAutoFillEnabled;
    setAiAutoFillEnabled(nextVal);
    localStorage.setItem("aiAutoFillEnabled", String(nextVal));
  };

  const handleLogout = async () => {
    await logout();
    setScreen('login');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#F7F7FA] dark:bg-slate-900 pb-20 transition-colors"
    >
      <header className="px-5 h-14 bg-white dark:bg-slate-800 flex items-center border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm transition-colors">
        <h1 className="text-base font-black text-[#1A1A1A] dark:text-white">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* AI & Automation Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#0d7d6f] flex items-center justify-center border border-teal-200 dark:border-teal-800">
                <Icons.Sparkles size={18} />
              </div>
              <div>
                <span className="block text-sm font-bold text-[#1A1A1A] dark:text-white">AI Auto-Fill Listings</span>
                <span className="block text-[10px] font-bold text-slate-400">13-Stage Product Intelligence Pipeline</span>
              </div>
            </div>
            <button 
              onClick={toggleAiAutoFill}
              className={`w-10 h-6 rounded-full relative transition-colors ${aiAutoFillEnabled ? 'bg-[#0d7d6f]' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${aiAutoFillEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
            </button>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 transition-colors">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Notifications size={18} className="text-[#0d7d6f]" />
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">Push Notifications</span>
            </div>
            <button 
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-10 h-6 rounded-full relative transition-colors ${pushEnabled ? 'bg-[#0d7d6f]' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${pushEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
            </button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icons.Moon size={18} className="text-[#0d7d6f]" />
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">Dark Mode</span>
            </div>
            <button 
              onClick={() => setDarkEnabled(!darkEnabled)}
              className={`w-10 h-6 rounded-full relative transition-colors ${darkEnabled ? 'bg-[#0d7d6f]' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${darkEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
            <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">Privacy Policy</span>
            <Icons.ChevronRight size={16} className="text-slate-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
            <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">Terms of Service</span>
            <Icons.ChevronRight size={16} className="text-slate-400" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
            <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">Help & Support</span>
            <Icons.ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 mt-4 bg-red-50 text-red-600 font-black rounded-2xl border border-red-200 active:scale-95 transition-all text-xs uppercase shadow-sm"
        >
          LOG OUT
        </button>

      </main>
    </motion.div>
  );
}
