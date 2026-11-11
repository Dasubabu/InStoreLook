import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

export default function InventoryScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const firstImage = (product: any): string => {
    if (product.imageUrl) return product.imageUrl;
    if (Array.isArray(product.images)) return product.images.find(Boolean) || '';
    if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        return Array.isArray(parsed) ? parsed.find(Boolean) || '' : '';
      } catch {
        return '';
      }
    }
    return '';
  };
  
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', {
        headers: { 'x-user-id': authUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [authUser?.id]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    if (filter !== 'All') {
      if (filter === 'Low Stock') list = list.filter(p => p.stock > 0 && p.stock <= 5);
      if (filter === 'Out of Stock') list = list.filter(p => p.stock === 0 || p.status === 'Out of Stock');
      if (filter === 'In Stock') list = list.filter(p => p.stock > 5);
    }
    return list;
  }, [products, search, filter]);

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': authUser?.id || '' }
      });
      fetchProducts();
    } catch (e) {}
  };

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(`/api/products/${id}/duplicate`, {
        method: 'POST',
        headers: { 'x-user-id': authUser?.id || '' }
      });
      fetchProducts();
    } catch (e) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col h-full bg-[#F7F7FA] pb-20"
    >
      <header className="px-5 pt-5 pb-3 bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="flex justify-between items-center mb-4">
           <div>
             <h1 className="text-xl font-black text-[#1A1A1A]">Inventory</h1>
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Premium product workspace</p>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setScreen('media_gallery')} className="bg-white text-[#0d7d6f] p-2 rounded-xl border border-teal-200 shadow-sm" aria-label="Open media gallery">
               <Icons.ImageIcon size={20} />
             </button>
             <button onClick={() => setScreen('add_product')} className="bg-[#0d7d6f] text-white p-2 rounded-xl shadow-sm" aria-label="Add product">
               <Icons.Add size={20} />
             </button>
           </div>
        </div>
        
        <div className="relative group mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-[#1A1A1A] placeholder-slate-400 border border-slate-200 outline-none focus:border-[#0d7d6f] transition-all"
          />
          <Icons.Search size={18} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-[#0d7d6f]" />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap border ${
                filter === f ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map(p => (
            <div key={p.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex gap-3">
              <div className="w-20 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                <img src={firstImage(p)} className="w-full h-full object-cover" alt={p.name} />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.sku || 'NO SKU'}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDuplicate(p.id)} className="text-slate-400 hover:text-[#0d7d6f]"><Icons.Copy size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500"><Icons.Delete size={16} /></button>
                    </div>
                  </div>
                   <h3 className="text-xs font-bold text-[#1A1A1A] line-clamp-1 mt-0.5">{p.name}</h3>
                   <p className="text-[10px] font-bold text-slate-400 mt-1">{Array.isArray(p.images) ? p.images.filter(Boolean).length : 1} stored image{Array.isArray(p.images) && p.images.filter(Boolean).length === 1 ? '' : 's'}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-sm font-black text-[#0d7d6f]">₹{p.price}</span>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                    p.stock > 5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    p.stock > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {p.stock} In Stock
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Icons.ShoppingBag size={48} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm font-bold">No products found.</p>
          </div>
        )}
      </main>
    </motion.div>
  );
}
