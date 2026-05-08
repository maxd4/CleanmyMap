"use client";

import { Info, Sparkles, UserCog } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DiscussionBadgesPanel() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-10 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <UserCog size={120} className="text-white" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
        <div className="flex items-start gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 group-hover:bg-fuchsia-500 group-hover:text-white transition-all duration-500 shadow-2xl shadow-fuchsia-500/20">
            <UserCog size={28} />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400">
                 {fr ? "Orientation Système" : "System Orientation"}
               </p>
            </div>
            
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">
                 {fr
                   ? "Adaptation intelligente du ton"
                   : "Intelligent tone adaptation"}
               </h3>
               <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-lg italic">
                 {fr
                   ? "Le système ajuste dynamiquement le ton et le niveau de détail en fonction de votre profil actif et du mode de coordination choisi."
                   : "The system dynamically adjusts tone and detail level based on your active profile and selected coordination mode."}
               </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
             <Sparkles size={14} className="text-fuchsia-500" />
             <span>{fr ? "Mode Dynamique" : "Dynamic Mode"}</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
             <Info size={14} className="text-fuchsia-500" />
             <span>{fr ? "Coordination Live" : "Live Coordination"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
