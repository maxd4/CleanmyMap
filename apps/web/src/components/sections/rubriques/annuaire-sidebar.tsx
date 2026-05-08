"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ShieldCheck, Info, Map as MapIcon, Sparkles, Target, Compass } from "lucide-react";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((mod) => mod.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full animate-pulse rounded-[2.5rem] bg-slate-900/50 border border-white/5 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Initializing Core Map...</p>
      </div>
    ),
  },
);

interface AnnuaireSidebarProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  highlightedActorId: string | null;
}

export function AnnuaireSidebar({
  fr,
  entries,
  highlightedActorId,
}: AnnuaireSidebarProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="sticky top-24 space-y-6"
    >
      {/* Carte Interactive - Premium Canvas */}
      <div className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl overflow-hidden h-[500px] group relative shadow-2xl">
        <AnnuaireMapCanvas
          items={entries}
          highlightedItemId={highlightedActorId}
        />
        
        {/* Map Overlay HUD */}
        <div className="absolute inset-x-0 bottom-0 p-8 pointer-events-none bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                <Compass size={14} className="text-violet-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white">
                  {fr ? "Exploration Interactive" : "Interactive Exploration"}
                </span>
             </div>
             
             <div className="bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                  {entries.length} {fr ? "Acteurs" : "Actors"}
                </span>
             </div>
          </div>
        </div>

        {/* Top Info Tag */}
        <div className="absolute top-6 left-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="bg-violet-500/90 backdrop-blur-xl px-4 py-1.5 rounded-lg border border-violet-400/50 shadow-2xl">
             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
               {fr ? "Données Synchronisées" : "Synced Data"}
             </p>
          </div>
        </div>
      </div>

      {/* Info Complémentaire - Contextual Note */}
      <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
           <Info size={40} className="text-white" />
        </div>
        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic relative z-10">
          {fr 
            ? "Les données affichées sont mises à jour régulièrement par nos services et nos partenaires stratégiques." 
            : "The data displayed is regularly updated by our services and strategic partners."}
        </p>
      </div>

      {/* Méthodologie Card - Transparency Hub */}
      <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Target size={80} className="text-white" />
        </div>

        <div className="flex items-center gap-3 relative z-10">
           <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <ShieldCheck size={16} />
           </div>
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {fr ? "Algorithme & Transparence" : "Algorithm & Transparency"}
          </h4>
        </div>

        <div className="space-y-4 relative z-10">
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            {fr 
              ? "Le classement et l'indice de confiance sont calculés en temps réel :" 
              : "Ranking and trust index are calculated in real-time:"}
          </p>
          
          <div className="grid gap-3">
            {[
              { 
                label: fr ? "Proximité" : "Proximity", 
                value: fr ? "+18pts (même zone)" : "+18pts (same area)", 
                icon: <Compass size={12} className="text-violet-400" /> 
              },
              { 
                label: fr ? "Pertinence" : "Relevance", 
                value: fr ? "+12-18pts (adéquation)" : "+12-18pts (match)", 
                icon: <Sparkles size={12} className="text-violet-400" /> 
              },
              { 
                label: fr ? "Fiabilité" : "Reliability", 
                value: fr ? "MAJ < 90j" : "Update < 90d", 
                icon: <ShieldCheck size={12} className="text-violet-400" /> 
              }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 group/row transition-all hover:bg-white/10">
                 <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                 </div>
                 <span className="text-[10px] font-black text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
