"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ShieldCheck, Info, Compass } from "lucide-react";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { motion } from "framer-motion";
import { useInViewOnce } from "@/components/ui/use-in-view-once";

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
  const { ref: mapShellRef, isInView: isMapInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "320px 0px",
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="sticky top-24 space-y-6"
    >
      {/* Carte Interactive - Premium Canvas */}
      <div
        ref={mapShellRef}
        className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl overflow-hidden h-[500px] group relative shadow-2xl"
      >
        {isMapInView ? (
          <AnnuaireMapCanvas
            items={entries}
            highlightedItemId={highlightedActorId}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-950/70">
            <div className="space-y-3 text-center">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Chargement de la carte...
              </p>
            </div>
          </div>
        )}
        
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
                  {entries.length} {fr ? "Entrées" : "Entries"}
                </span>
             </div>
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
            ? "Cette vue rassemble des ressources éditoriales et des fiches partenaires publiées. La provenance est indiquée sur chaque entrée."
            : "This view combines editorial resources and published partner profiles. Provenance is shown on every entry."}
        </p>
      </div>

      {/* Transparence du registre et du tri */}
      <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
           <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <ShieldCheck size={16} />
           </div>
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            {fr ? "Transparence des données" : "Data transparency"}
          </h4>
        </div>

        <div className="space-y-4 relative z-10">
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            {fr
              ? "L’ordre affiché suit les règles visibles de la liste :"
              : "The displayed order follows the list's visible rules:"}
          </p>
          <ol className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
              <span className="text-violet-400">1</span>
              {fr ? "Mise en avant éventuelle" : "Optional featured selection"}
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
              <span className="text-violet-400">2</span>
              {fr ? "Fiches confirmées" : "Confirmed profiles"}
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
              <span className="text-violet-400">3</span>
              {fr ? "Proximité si disponible" : "Proximity when available"}
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3.5">
              <span className="text-violet-400">4</span>
              {fr ? "Ordre alphabétique" : "Alphabetical order"}
            </li>
          </ol>
        </div>
      </div>
    </motion.div>
  );
}
