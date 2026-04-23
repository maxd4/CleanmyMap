"use client";

import { motion } from "framer-motion";
import {
  getGamificationBadgeIconName,
} from "./badge-icon";
import { BadgeSurface } from "./badge-surface";

const BADGE_CONFIG: Record<string, { tone: "admin" | "role" | "profile" | "mode" | "gamification" | "neutral"; description: string }> = {
  "Contributeur regulier": { tone: "gamification", description: "Atteindre le niveau 3" },
  "Contributeur confirme": { tone: "gamification", description: "Atteindre le niveau 6" },
  "Pilier terrain": { tone: "gamification", description: "Atteindre le niveau 10" },
  "Referent impact": { tone: "gamification", description: "Atteindre le niveau 14" },
  "Expert Mégots (Or)": { tone: "gamification", description: "10 000+ mégots retirés" },
  "Chasseur de Mégots (Argent)": { tone: "gamification", description: "2 000+ mégots retirés" },
  "Ramasseur de Mégots (Bronze)": { tone: "gamification", description: "500+ mégots retirés" },
  "Héros du Nettoyage (Or)": { tone: "gamification", description: "500kg+ récoltés" },
  "Force de la Nature (Argent)": { tone: "gamification", description: "100kg+ récoltés" },
  "Bras Armé (Bronze)": { tone: "gamification", description: "10kg+ récoltés" },
  "Sentinelle Exemplaire": { tone: "gamification", description: "Qualité moyenne > 90%" },
  "Esprit d'Équipe": { tone: "gamification", description: "Participé à 3+ actions collectives" },
};

export function BadgeShowcase({ badges }: { badges: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.length === 0 ? (
        <p className="col-span-full py-4 text-center text-xs italic text-slate-500">
          Réalise tes premières actions pour débloquer des badges !
        </p>
      ) : (
        badges.map((badge, index) => {
          const config = BADGE_CONFIG[badge] || {
            tone: "neutral" as const,
            description: "Badge spécial",
          };
          
          return (
            <motion.div
              key={badge}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group flex cursor-help flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur-sm transition-transform hover:scale-105"
              title={config.description}
              aria-label={badge}
            >
              <BadgeSurface
                icon={getGamificationBadgeIconName(badge)}
                label={badge}
                tone={config.tone}
                variant="orb"
                className="border-slate-200/70 bg-white/90 shadow-sm"
              />
              <span className="mt-2 text-center text-[11px] font-semibold text-slate-600">
                {badge}
              </span>
              <span className="mt-0.5 text-center text-[10px] text-slate-500">
                {config.description}
              </span>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
