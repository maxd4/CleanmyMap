"use client";

import { User, Shield, Droplets } from"lucide-react";
import Image from"next/image";
import {
 BadgePictogram,
 getGamificationBadgeIconName,
} from"@/components/gamification/badge-icon";

type ImpactCardProps = {
 userName: string;
 level: number;
 rank: number | null;
 totalKg: number;
 totalButts: number;
 waterSaved: number;
 topBadges: string[];
};

export function ImpactCard({ 
 userName, 
 level, 
 rank, 
 totalKg, 
 totalButts, 
 waterSaved, 
 topBadges 
}: ImpactCardProps) {
 return (
 <div id="impact-card" className="relative w-full max-w-[400px] aspect-[4/5] bg-gradient-to-br from-emerald-600 to-emerald-900 text-white rounded-3xl p-8 shadow-2xl overflow-hidden">
 {/* Background patterns */}
 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
 <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/20 rounded-full -ml-20 -mb-20 blur-3xl"></div>
 
 {/* Header */}
 <header className="relative z-10 flex flex-col items-center gap-4 text-center">
 <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center shadow-lg">
 <User size={48} className="text-white" />
 </div>
 <div>
 <h2 className="text-2xl font-bold tracking-tight">{userName}</h2>
 <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full cmm-text-caption font-bold uppercase tracking-wider mt-2 border border-white/20">
 <Shield size={12} /> Niveau {level} • {rank ? `#${rank} Global` :"Nouvel Impact"}
 </div>
 </div>
 </header>

 {/* Main Stats */}
 <section className="relative z-10 mt-10 grid grid-cols-2 gap-4">
 <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
 <p className="cmm-text-caption uppercase font-bold text-emerald-200 tracking-widest">Poids collecté</p>
 <p className="text-2xl font-bold mt-1">{totalKg.toFixed(1)}<span className="cmm-text-small ml-1 opacity-60">kg</span></p>
 </div>
 <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
 <p className="cmm-text-caption uppercase font-bold text-emerald-200 tracking-widest">Eau préservée</p>
 <p className="text-2xl font-bold mt-1">{waterSaved.toLocaleString()}<span className="cmm-text-small ml-1 opacity-60">L</span></p>
 </div>
 <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center justify-between">
 <div>
 <p className="cmm-text-caption uppercase font-bold text-emerald-200 tracking-widest">Mégots extraits</p>
 <p className="text-2xl font-bold mt-1">{totalButts.toLocaleString()}</p>
 </div>
 <Droplets className="text-emerald-300 opacity-40" size={32} />
 </div>
 </section>

 {/* Badges Preview */}
 <footer className="relative z-10 mt-8">
 <p className="cmm-text-caption uppercase font-bold text-emerald-200 tracking-widest mb-3 text-center">Badges principaux</p>
 <div className="flex justify-center gap-3">
 {topBadges.slice(0, 3).map((badge, i) => (
 <div key={i} className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner" title={badge} aria-label={badge}>
 <BadgePictogram
 name={getGamificationBadgeIconName(badge)}
 size={20}
 className="text-white"
 />
 </div>
 ))}
 {topBadges.length === 0 && <p className="cmm-text-caption italic opacity-40">En cours d'obtention...</p>}
 </div>
 </footer>

 {/* Logo footer */}
 <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center space-y-1">
 <Image
 src="/brand/pictogramme-cleanmymap.svg"
 alt="Logo CleanMyMap"
 width={54}
 height={54}
 className="h-6 w-auto opacity-55"
 priority
 />
 <p className="text-[8px] font-bold tracking-widest uppercase opacity-40">Méthodologie CMM-v1 Scientifique</p>
 <p className="cmm-text-caption font-bold tracking-[0.2em] uppercase opacity-40">CleanMyMap</p>
 </div>
 </div>
 );
}
