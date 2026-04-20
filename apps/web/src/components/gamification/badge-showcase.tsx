"use client";

import { motion } from "framer-motion";
import { Award, Shield, Zap, Droplets, Target, Users } from "lucide-react";

const BADGE_CONFIG: Record<string, { icon: any; color: string; description: string }> = {
  "Contributeur regulier": { icon: Zap, color: "text-blue-500 bg-blue-50", description: "Atteindre le niveau 3" },
  "Contributeur confirme": { icon: Shield, color: "text-indigo-500 bg-indigo-50", description: "Atteindre le niveau 6" },
  "Pilier terrain": { icon: Award, color: "text-purple-500 bg-purple-50", description: "Atteindre le niveau 10" },
  "Referent impact": { icon: Target, color: "text-rose-500 bg-rose-50", description: "Atteindre le niveau 14" },
  "Expert Mégots (Or)": { icon: Droplets, color: "text-amber-600 bg-amber-50", description: "10 000+ mégots retirés" },
  "Chasseur de Mégots (Argent)": { icon: Droplets, color: "text-slate-400 bg-slate-50", description: "2 000+ mégots retirés" },
  "Ramasseur de Mégots (Bronze)": { icon: Droplets, color: "text-amber-700 bg-orange-50", description: "500+ mégots retirés" },
  "Héros du Nettoyage (Or)": { icon: Target, color: "text-emerald-600 bg-emerald-50", description: "500kg+ récoltés" },
  "Force de la Nature (Argent)": { icon: Target, color: "text-slate-400 bg-slate-50", description: "100kg+ récoltés" },
  "Bras Armé (Bronze)": { icon: Target, color: "text-amber-700 bg-orange-50", description: "10kg+ récoltés" },
  "Sentinelle Exemplaire": { icon: Shield, color: "text-emerald-500 bg-emerald-50", description: "Qualité moyenne > 90%" },
  "Esprit d'Équipe": { icon: Users, color: "text-sky-500 bg-sky-50", description: "Participé à 3+ actions collectives" },
};

export function BadgeShowcase({ badges }: { badges: string[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.length === 0 ? (
        <p className="col-span-full text-xs italic text-slate-500 text-center py-4">
          Réalise tes premières actions pour débloquer des badges !
        </p>
      ) : (
        badges.map((badge, index) => {
          const config = BADGE_CONFIG[badge] || { icon: Award, color: "text-slate-500 bg-slate-50", description: "Badge spécial" };
          const Icon = config.icon;
          
          return (
            <motion.div
              key={badge}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-white/50 shadow-sm ${config.color} backdrop-blur-sm group hover:scale-105 transition-transform cursor-help`}
              title={config.description}
            >
              <div className="p-2 rounded-full bg-white shadow-inner">
                <Icon size={20} className="group-hover:rotate-12 transition-transform" />
              </div>
              <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-tight">
                {badge}
              </span>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
