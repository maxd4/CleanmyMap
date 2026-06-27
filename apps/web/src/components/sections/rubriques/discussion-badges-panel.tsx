"use client";

import { Info, Sparkles, UserCog } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

import { RubriqueCard, RubriqueCardIcon } from "@/components/ui/rubrique-card";

export function DiscussionBadgesPanel() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <RubriqueCard 
      themeColor="fuchsia"
      watermarkIcon={UserCog}
      watermarkSize={120}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-start gap-6">
          <RubriqueCardIcon 
            icon={UserCog} 
            themeColor="fuchsia" 
            size={28}
          />
          
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
               <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl bg-fuchsia-500/20 text-fuchsia-300">
                 {fr ? "Orientation Système" : "System Orientation"}
               </span>
            </div>
            
            <div className="space-y-2">
               <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                 {fr
                   ? "Adaptation intelligente du ton"
                   : "Intelligent tone adaptation"}
               </h3>
               <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-lg italic opacity-80">
                 {fr
                   ? "Le système ajuste dynamiquement le ton et le niveau de détail en fonction de votre profil actif et du mode de coordination choisi."
                   : "The system dynamically adjusts tone and detail level based on your active profile and selected coordination mode."}
               </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/10 bg-black/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
             <Sparkles size={14} className="text-fuchsia-500" />
             <span>{fr ? "Mode Dynamique" : "Dynamic Mode"}</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/10 bg-black/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
             <Info size={14} className="text-fuchsia-500" />
             <span>{fr ? "Coordination Live" : "Live Coordination"}</span>
          </div>
        </div>
      </div>
    </RubriqueCard>
  );
}
