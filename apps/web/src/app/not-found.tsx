"use client";

import Link from"next/link";
import { VibrantBackground } from"@/components/ui/vibrant-background";
import { Globe, Home, ArrowLeft } from"lucide-react";

export default function NotFound() {
 return (
 <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
 <VibrantBackground />
 
 <div className="relative z-10 space-y-8 max-w-2xl px-4 py-16 premium-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[3rem]">
 {/* Animated Icon Container */}
 <div className="flex justify-center">
 <div className="relative">
 <Globe className="w-24 h-24 text-emerald-500 animate-pulse" />
 <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 -z-10 animate-ping" />
 </div>
 </div>

 {/* Text Content */}
 <div className="space-y-4">
 <h1 className="text-8xl font-bold tracking-tighter cmm-text-primary dark:text-white leading-none">
 404
 </h1>
 <h2 className="text-2xl font-bold cmm-text-secondary tracking-tight">
 Coordonnées Introuvables
 </h2>
 <p className="cmm-text-muted dark:cmm-text-muted max-w-sm mx-auto leading-relaxed">
 Même les meilleurs navigateurs s&apos;égarent parfois. Cet emplacement n&apos;est pas répertorié dans notre base de données géographique.
 </p>
 </div>

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
 <Link 
 href="/"
 className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-emerald-500/20"
 >
 <Home size={18} />
 RETOUR À L&apos;ACCUEIL
 </Link>
 
 <button 
 onClick={() => window.history.back()}
 className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 cmm-text-primary dark:text-white border font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
 >
 <ArrowLeft size={18} />
 PAGE PRÉCÉDENTE
 </button>
 </div>
 </div>

 {/* Decorative Badge */}
 <div className="mt-12 opacity-50 flex items-center gap-2 cmm-text-caption font-bold uppercase tracking-[0.2em] cmm-text-muted">
 <span className="w-8 h-px bg-slate-300 dark:bg-slate-700" />
 CleanMyMap Core Discovery
 <span className="w-8 h-px bg-slate-300 dark:bg-slate-700" />
 </div>
 </div>
 );
}
