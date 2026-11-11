import React from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { Screen } from '../../types';
import StyleQuote from '../StyleQuote';
import { isDemoCatalog } from '../../config';

interface RoleSelectScreenProps {
  setScreen: (s: Screen) => void;
}

export default function RoleSelectScreen({ setScreen }: RoleSelectScreenProps) {
  return (
    <motion.div
      key="role_select"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="entry-role-screen absolute inset-0 flex flex-col overflow-y-auto bg-gradient-to-b from-[#f7f7f2] via-white to-[#e7e4ff]"
      aria-labelledby="role-select-title"
    >
      {/* Brand header */}
      <header className="relative px-8 pb-5 pt-16 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#171717] shadow-[0_12px_28px_rgba(23,23,23,0.18)]"
        >
          <Icons.Store size={30} className="text-[#d6ff62]" aria-hidden="true" />
        </motion.div>
        <h1 id="role-select-title" className="text-2xl font-black tracking-tight text-[#1A1A1A]">InStoreLook</h1>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Find it nearby. Know before you go.
        </p>

        {isDemoCatalog && (
          <span role="status" className="mt-4 inline-flex rounded-full border border-[#c9d98c] bg-[#eff8cf] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#40520b]">
            Curated demo catalog
          </span>
        )}

        <StyleQuote className="mx-auto mt-5 max-w-xs text-[#5144c7]" />
      </header>

      {/* Choice cards */}
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 pb-8" aria-label="Choose how to use InStoreLook">
        <p className="mb-1 text-center text-xs font-bold text-slate-500">
          Browse the local edit as a shopper, or manage your store as a seller.
        </p>
        {/* Shopper */}
        <motion.button
          type="button"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setScreen('customer_home')}
          aria-label="Shop nearby without an account"
          className="group relative overflow-hidden rounded-3xl border border-white/60 text-left shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6557f5] focus-visible:ring-offset-2 active:shadow-xl"
        >
          <img
            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop"
            alt="Shop nearby"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/90 via-[#1A1A1A]/40 to-transparent" />
          <div className="relative p-6 pt-24 text-white">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-full mb-3 border border-white/30">
              <Icons.ShoppingBag size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">For Shoppers</span>
            </div>
            <h2 className="text-xl font-black tracking-tight mb-1">Shop Nearby</h2>
            <p className="text-xs font-medium text-white/80 leading-snug max-w-[16rem]">
              Discover clothes and check what's in stock at physical stores around you — before you step out.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
              Start Browsing
              <Icons.ArrowForward size={16} strokeWidth={3} className="transition-transform group-active:translate-x-1" aria-hidden="true" />
            </div>
          </div>
        </motion.button>

        {/* Seller */}
        <motion.button
          type="button"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setScreen('login')}
          aria-label="Open seller login"
          className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6557f5] focus-visible:ring-offset-2 active:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-[#d6ff62]">
            <Icons.Storefront size={22} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#1A1A1A]">I'm a Seller</h2>
               <span className="rounded bg-[#e7e4ff] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#5144c7]">
                Business
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-snug mt-0.5">
              List your store & manage inventory
            </p>
          </div>
          <Icons.ChevronRight size={20} className="shrink-0 text-slate-300" aria-hidden="true" />
        </motion.button>

        <div className="mt-2 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setScreen('customer_home')}
            className="rounded-full bg-[#171717] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-[#6557f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6557f5] focus-visible:ring-offset-2"
          >
            Continue as shopper
          </button>
          <button
            type="button"
            onClick={() => setScreen('customer_home')}
            className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6557f5] focus-visible:ring-offset-2"
          >
            Skip intro
          </button>
        </div>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          No account needed to browse
        </p>
      </main>
    </motion.div>
  );
}
