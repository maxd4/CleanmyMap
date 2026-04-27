import React from "react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { Star, MapPin, ArrowRight } from "lucide-react";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { cn } from "@/lib/utils";

interface AnnuaireFeaturedSectionProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  onFocusMap: (id: string) => void;
}

export function AnnuaireFeaturedSection({ entries, onFocusMap, fr }: AnnuaireFeaturedSectionProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100/50 backdrop-blur-sm text-violet-600 border border-violet-200/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
            </span>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase">
              {fr ? "Sélection Premium" : "Premium Selection"}
            </span>
          </div>
          <h2 className="cmm-text-h2 cmm-text-primary tracking-tight leading-[0.95]">
            {fr ? "Associations à la une" : "Featured Associations"}
          </h2>
          <p className="cmm-text-body cmm-text-secondary max-w-2xl leading-relaxed">
            {fr 
              ? "Les acteurs qui transforment durablement le paysage urbain parisien par leur impact et leur engagement." 
              : "The actors who are sustainably transforming the Parisian urban landscape through their impact and commitment."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {entries.map((entry) => (
          <CmmCard 
            key={entry.id}
            variant="elevated" 
            className="group relative flex flex-col h-full rounded-[2.5rem] bg-white border-none shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)] hover:shadow-[0_32px_64px_-12px_rgba(139,92,246,0.15)] transition-all duration-700 overflow-hidden"
          >
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-400" />

            {/* Premium Glass Badge */}
            <div className="absolute top-8 right-8 z-10">
              <div className="relative group/badge">
                <div className="absolute inset-0 bg-violet-400 blur-xl opacity-20 group-hover/badge:opacity-40 transition-opacity rounded-full" />
                <span className="relative inline-flex items-center gap-2 rounded-full bg-violet-900 px-4 py-2 text-[10px] font-black tracking-[0.25em] text-white shadow-2xl border border-white/20">
                  <Star size={10} className="fill-current text-amber-400" />
                  {fr ? "À LA UNE" : "FEATURED"}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-6 p-10 pt-12">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-8 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                  <p className="text-[11px] font-black text-violet-600 uppercase tracking-[0.3em]">
                    {entry.tags?.[0] || "IMPACT"}
                  </p>
                </div>
                <h3 className="cmm-text-h3 cmm-text-primary group-hover:text-violet-700 transition-colors leading-tight tracking-tight">
                  {entry.name}
                </h3>
              </div>

              {entry.featuredReason && (
                <div className="relative overflow-hidden rounded-3xl bg-slate-50 p-6 border border-slate-100 shadow-inner group/quote">
                  <Quote size={40} className="absolute -top-1 -right-1 text-slate-200 opacity-20 group-hover/quote:scale-110 transition-transform" />
                  <p className="cmm-text-small italic text-slate-600 leading-relaxed font-medium">
                    « {entry.featuredReason} »
                  </p>
                </div>
              )}

              <p className="cmm-text-body cmm-text-secondary leading-relaxed line-clamp-3">
                {entry.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {entry.tags?.slice(1).map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-xl bg-white border border-slate-200 cmm-text-caption font-black tracking-wider text-slate-500 group-hover:border-violet-200 group-hover:text-violet-600 transition-all">
                    #{tag.toUpperCase()}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-50">
                    <MapPin size={14} className="text-violet-600" />
                  </div>
                  <span className="text-xs font-black tracking-wide text-slate-900">{entry.location}</span>
                </div>
                {entry.distanceKm !== null && (
                  <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-lg">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-black">
                      {entry.distanceKm.toFixed(1)} KM
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 pt-0 mt-auto">
              <CmmButton 
                tone="violet" 
                className="w-full h-16 rounded-2xl font-black text-base tracking-tight shadow-[0_8px_32px_-6px_rgba(139,92,246,0.3)] hover:shadow-[0_18px_40px_-8px_rgba(139,92,246,0.4)] transition-all duration-500 group/btn"
                onClick={() => onFocusMap(entry.id)}
              >
                <span>{fr ? "Voir sur la carte" : "View on map"}</span>
                <ArrowRight size={20} className="ml-3 group-hover/btn:translate-x-2 transition-transform duration-500" />
              </CmmButton>
            </div>
          </CmmCard>
        ))}
      </div>
    </div>
  );
}
