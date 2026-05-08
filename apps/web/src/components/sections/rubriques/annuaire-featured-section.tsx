import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { Star, MapPin, ArrowRight, Quote, Sparkles, Building2 } from "lucide-react";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { motion } from "framer-motion";
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <CmmCard 
              variant="elevated" 
              className="group relative flex h-full flex-col overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl transition-all duration-700 hover:bg-white/[0.03] hover:border-violet-500/30"
            >
              {/* Premium Glass Badge */}
              <div className="absolute top-8 right-8 z-10">
                <div className="relative group/badge">
                  <div className="absolute inset-0 bg-violet-400 blur-xl opacity-20 group-hover/badge:opacity-40 transition-opacity rounded-full" />
                  <span className="relative inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-[9px] font-black tracking-[0.25em] text-violet-100 shadow-2xl">
                    <Star size={10} className="fill-current text-amber-400 animate-pulse" />
                    {fr ? "À LA UNE" : "FEATURED"}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-6 p-10 pt-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-6 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">
                      {entry.tags?.[0] || "IMPACT"}
                    </p>
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight leading-tight group-hover:text-violet-300 transition-colors">
                    {entry.name}
                  </h3>
                </div>

                {entry.featuredReason && (
                  <div className="group/quote relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 shadow-inner">
                    <Quote size={32} className="absolute -top-1 -right-1 text-violet-400 opacity-10 transition-transform group-hover/quote:scale-110" />
                    <p className="text-sm font-bold italic leading-relaxed text-slate-300 opacity-80">
                      « {entry.featuredReason} »
                    </p>
                  </div>
                )}

                <p className="text-sm font-medium leading-relaxed text-slate-400 line-clamp-3">
                  {entry.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {entry.tags?.slice(1, 4).map(tag => (
                  <span key={tag} className="rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-[9px] font-black tracking-widest text-slate-500 transition-all group-hover:border-violet-500/20 group-hover:text-violet-300">
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-slate-500 group-hover:text-white transition-colors">
                      <MapPin size={14} />
                    </div>
                    <span className="text-[11px] font-black tracking-wide text-white uppercase">{entry.location}</span>
                  </div>
                  {entry.distanceKm !== null && (
                    <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-violet-300 shadow-lg">
                      <span className="h-1 w-1 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-[10px] font-black tracking-tighter">
                        {entry.distanceKm.toFixed(1)} KM
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-10 pt-0 mt-auto">
                <CmmButton 
                  variant="primary" 
                  className="group/btn h-14 w-full rounded-2xl border-none bg-violet-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 hover:bg-violet-500 hover:scale-[1.02]"
                  onClick={() => onFocusMap(entry.id)}
                >
                  <span>{fr ? "Voir sur la carte" : "View on map"}</span>
                  <ArrowRight size={16} className="ml-3 group-hover/btn:translate-x-2 transition-transform duration-500" />
                </CmmButton>
              </div>
            </CmmCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
