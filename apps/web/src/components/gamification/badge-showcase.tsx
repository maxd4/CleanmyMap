"use client";

import { motion } from"framer-motion";
import {
 getGamificationBadgeIconName,
} from"./badge-icon";
import { BadgeSurface } from"./badge-surface";
import { Badge3D } from "./badge-3d";
import { findBadgeDefinitionByLabel } from "@/lib/gamification/badge-catalog";

export function BadgeShowcase({ badges }: { badges: string[] }) {
 return (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
  {badges.length === 0 ? (
    <div className="col-span-full py-8 text-center flex flex-col items-center gap-2">
      <p className="cmm-text-caption font-semibold cmm-text-muted uppercase tracking-widest">Vitrine de succès</p>
      <p className="cmm-text-caption italic cmm-text-secondary max-w-[200px] mx-auto">
        Votre collection est encore vide. Réalisez vos premières actions pour débloquer des badges exclusifs !
      </p>
    </div>
  ) : (
 badges.map((badge, index) => {
 const definition = findBadgeDefinitionByLabel(badge);
 const config = {
 tone: definition ? "gamification" as const : "neutral" as const,
 description: definition?.rule.description ?? "Badge spécial",
 };
 
 return (
 <motion.div
 key={badge}
 initial={{ scale: 0.8, opacity: 1 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: index * 0.1 }}
 className="group flex cursor-help flex-col items-center justify-center p-2"
 title={config.description}
 aria-label={badge}
 >
   <Badge3D className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur-sm transition-transform">
     <BadgeSurface
     icon={getGamificationBadgeIconName(badge)}
     label={badge}
     tone={config.tone}
     variant="orb"
     className="border-slate-200/70 bg-white/90 shadow-sm"
     />
     <span className="mt-2 text-center cmm-text-caption font-semibold cmm-text-secondary">
     {badge}
     </span>
     <span className="mt-0.5 text-center cmm-text-caption cmm-text-muted">
     {config.description}
     </span>
   </Badge3D>
 </motion.div>
 );
 })
 )}
 </div>
 );
}
