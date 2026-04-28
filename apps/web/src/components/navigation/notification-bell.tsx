"use client";

import { useState, useEffect } from"react";
import { Bell, ShieldCheck, UserCheck, AlertTriangle, MessageSquare, Check } from"lucide-react";
import { formatDistanceToNow } from"date-fns";
import { fr } from"date-fns/locale";

type AppNotification = {
 id: string;
 type: 'validation' | 'community' | 'system' | 'security';
 title: string;
 content: string;
 read_at: string | null;
 created_at: string;
};

export function NotificationBell() {
 const [notifications, setNotifications] = useState<AppNotification[]>([]);
 const [isOpen, setIsOpen] = useState(false);
 const [loading, setLoading] = useState(false);

 const fetchNotifications = async () => {
 setLoading(true);
 try {
 const res = await fetch("/api/notifications");
 if (res.ok) {
 const data = await res.json();
 setNotifications(data.notifications || []);
 }
 } catch (err) {
 console.error("Failed to fetch notifications", err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchNotifications();
 // In a real app, you might use Supabase Realtime here
 const interval = setInterval(fetchNotifications, 60000); // Poll every minute
 return () => clearInterval(interval);
 }, []);

 const unreadCount = notifications.filter(n => !n.read_at).length;

 // Haptic feedback on new notification
 useEffect(() => {
 if (unreadCount > 0 && typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
 const latest = notifications.filter(n => !n.read_at)[0];
 const isMajor = latest?.type === 'system' && latest?.title.includes('Niveau Supérieur');

 try {
 if (isMajor) {
 // Double pulse for Level Up
 navigator.vibrate([20, 50, 20]);
 } else {
 // Soft single pulse for regular notifications
 navigator.vibrate(15);
 }
 } catch (e) {
 // Silent fail
 }
 }
 }, [unreadCount, notifications]);

 const markAsRead = async (id: string) => {
 try {
 const res = await fetch("/api/notifications", {
 method:"PATCH",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ id }),
 });
 if (res.ok) {
 setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
 }
 } catch (err) {
 console.error("Failed to mark as read", err);
 }
 };

 const getTypeIcon = (type: AppNotification['type']) => {
 switch (type) {
 case 'validation': return <ShieldCheck className="text-emerald-500" size={16} />;
 case 'security': return <AlertTriangle className="text-rose-500" size={16} />;
 case 'community': return <UserCheck className="text-blue-500" size={16} />;
 default: return <MessageSquare className="cmm-text-muted" size={16} />;
 }
 };

 return (
 <div className="relative">
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
 aria-label={`Notifications (${unreadCount} non lues)`}
 aria-expanded={isOpen}
 >
 <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-emerald-500 animate-swing' : 'cmm-text-muted dark:cmm-text-muted'}`} aria-hidden="true" />
 {unreadCount > 0 && (
 <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 cmm-text-caption items-center justify-center text-white font-bold">
 {unreadCount}
 </span>
 </span>
 )}
 </button>

 {isOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
 <div className="absolute right-0 mt-2 w-80 max-h-[32rem] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border rounded-3xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300">
 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
  <h3 className="font-bold cmm-text-caption uppercase tracking-widest cmm-text-primary dark:text-white">Centre de notifications</h3>
 {loading && <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />}
 </div>

 <div className="overflow-y-auto max-h-96 custom-scrollbar">
 {notifications.length === 0 ? (
  <div className="p-12 text-center space-y-2">
  <div className="inline-flex items-center justify-center w-12 h-12 cmm-surface-muted rounded-full text-slate-300">
  <Check size={24} />
  </div>
  <p className="cmm-text-caption font-bold cmm-text-muted uppercase tracking-tighter">Tout est à jour !</p>
  <p className="cmm-text-caption cmm-text-muted">Vous n'avez pas de nouvelles notifications pour le moment.</p>
  </div>
 ) : (
 notifications.map((n) => (
 <div
 key={n.id}
 className={`p-4 border-b border-slate-50 dark:border-slate-800 flex group/item transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.read_at ? 'bg-emerald-500/5' : ''}`}
 >
 <div className="mt-1 mr-3 flex-shrink-0">
 <div className={`p-2 rounded-xl ${!n.read_at ? 'bg-white dark:bg-slate-800 shadow-sm' : 'cmm-surface-muted/50 opacity-60'}`}>
 {getTypeIcon(n.type)}
 </div>
 </div>
 <div className="flex-1 space-y-1">
 <div className="flex items-center justify-between">
 <span className={`cmm-text-caption font-bold tracking-tight ${!n.read_at ? 'cmm-text-primary dark:text-white' : 'cmm-text-muted'}`}>
 {n.title}
 </span>
 <span className="cmm-text-caption cmm-text-muted">
 {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
 </span>
 </div>
 <p className={`cmm-text-caption leading-relaxed ${!n.read_at ? 'cmm-text-secondary dark:cmm-text-muted' : 'cmm-text-muted opacity-80'}`}>
 {n.content}
 </p>
 {!n.read_at && (
 <button
 onClick={() => markAsRead(n.id)}
 className="mt-2 cmm-text-caption font-bold uppercase text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
 >
 Marquer comme lu
 </button>
 )}
 </div>
 </div>
 ))
 )}
 </div>

 <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center">
 <button className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted hover:cmm-text-secondary dark:hover:text-slate-200 transition-colors">
 Toutes les notifications
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
