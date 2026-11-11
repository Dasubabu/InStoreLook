import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import * as Icons from '../Icons';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../types';

export default function NotificationsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { user: authUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { 'x-user-id': authUser?.id || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, [authUser]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'x-user-id': authUser?.id || '' }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="absolute inset-0 z-50 bg-[#F7F7FA] flex flex-col"
    >
      <header className="px-5 h-14 bg-white flex items-center gap-3 border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <button onClick={() => setScreen('seller_home')} className="p-1 -ml-2">
          <Icons.ArrowBack size={24} className="text-[#1A1A1A]" />
        </button>
        <h1 className="text-base font-black text-[#1A1A1A]">Notifications</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-2xl border transition-colors ${
                n.isRead ? 'bg-white border-slate-200' : 'bg-teal-50 border-teal-200 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'low_stock' ? 'bg-amber-100 text-amber-600' : 
                  n.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {n.type === 'low_stock' ? <Icons.Warning size={20} /> : <Icons.Notifications size={20} />}
                </div>
                <div>
                  <h3 className={`text-xs font-black ${n.isRead ? 'text-slate-700' : 'text-[#1A1A1A]'}`}>{n.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Icons.Notifications size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold">No notifications yet</p>
          </div>
        )}
      </main>
    </motion.div>
  );
}
