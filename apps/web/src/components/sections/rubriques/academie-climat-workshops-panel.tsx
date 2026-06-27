"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatFrDate } from "./community/helpers";
import {
  getTotalUpcomingAcademieClimatWorkshops,
  getVisibleAcademieClimatWorkshops,
} from "./academie-climat-workshops";
import { Calendar, Info, ArrowUpRight, Sparkles, MapPin, Clock, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<"rose" | "amber" | "emerald", { border: string; bg: string; text: string; glow: string }> = {
  rose: {
    border: "border-rose-500/20",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    glow: "shadow-rose-500/20",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
};

export function AcademieClimatWorkshopsPanel() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const visibleCategories = getVisibleAcademieClimatWorkshops();
  const totalWorkshops = getTotalUpcomingAcademieClimatWorkshops();

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <Globe size={120} className="text-white" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-8 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Calendar size={18} />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
               {fr ? "Académie du Climat" : "Climate Academy"}
             </p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">
            {fr ? "Prochains ateliers" : "Upcoming workshops"}
          </h2>
          <p className="max-w-2xl text-sm font-bold text-slate-400 leading-relaxed">
            {fr
              ? "Les catégories sont synchronisées avec les sources officielles de l’Académie du Climat pour garantir une information fiable."
              : "Categories are synced with official Académie du Climat sources to ensure reliable information."}
          </p>
        </div>

        <div className="px-8 py-5 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-xl flex flex-col items-center justify-center min-w-[140px] shadow-2xl">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
            {fr ? "Total Ateliers" : "Total Workshops"}
          </p>
          <div className="flex items-center gap-2">
             <Sparkles size={14} className="text-emerald-400 animate-pulse" />
             <p className="text-3xl font-black text-white tracking-tighter">{totalWorkshops}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 relative z-10">
        {visibleCategories.map((category, idx) => {
          const style = TONE_STYLES[category.tone];
          return (
            <motion.article
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "rounded-[2.5rem] border p-8 space-y-8 transition-all duration-500 hover:bg-white/[0.02]",
                style.border,
                style.bg
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", style.text)}>
                    {category.label[locale]}
                  </h3>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {category.workshops.length} {fr ? "atelier(s) à venir" : "upcoming workshop(s)"}
                  </p>
                </div>
                <div className={cn("px-4 py-1.5 rounded-full border bg-white/5 text-[9px] font-black uppercase tracking-widest", style.border, style.text)}>
                  {fr ? "Catégorie active" : "Active category"}
                </div>
              </div>

              <div className="grid gap-4">
                {category.workshops.map((workshop) => (
                  <div
                    key={workshop.id}
                    className="group/item rounded-2xl border border-white/5 bg-slate-950/40 p-6 transition-all hover:bg-slate-950/60"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-4">
                           <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <Clock size={12} />
                              {formatFrDate(workshop.eventDate)} · {workshop.timeLabel}
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <MapPin size={12} />
                              {workshop.locationLabel}
                           </div>
                        </div>
                        
                        <h4 className="text-xl font-black text-white tracking-tight group-hover/item:text-emerald-400 transition-colors">
                          {workshop.title}
                        </h4>
                        
                        <p className="text-sm font-bold text-slate-400 leading-relaxed">
                          {workshop.summary}
                        </p>
                        
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                           <Info size={10} />
                           {fr ? "Dernière mise à jour :" : "Official update :"} {formatFrDate(workshop.sourceUpdatedAt)}
                        </div>
                      </div>

                      <CmmButton asChild tone="secondary" variant="pill" className="px-5 py-2.5 text-[9px] font-black uppercase tracking-widest gap-2">
                        <a href={workshop.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {fr ? "Détails" : "Details"}
                          <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                        </a>
                      </CmmButton>
                    </div>
                  </div>
                ))}
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
