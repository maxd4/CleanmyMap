"use client";

import type { AnnuaireEntry } from "./annuaire-map-canvas";
import Link from "next/link";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { ShieldCheck, Info, Sparkles, Target, ArrowUpRight, Users, Clock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnnuaireGovernancePanelProps = {
  pendingEntries: AnnuaireEntry[];
  verificationLabels: Record<AnnuaireEntry["verificationStatus"], string>;
};

export function AnnuaireGovernancePanel({
  pendingEntries,
  verificationLabels,
}: AnnuaireGovernancePanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Actions Partenaires - CTA Focus */}
      <motion.section variants={itemVariants} className="rounded-[2rem] border border-violet-500/20 bg-violet-500/5 backdrop-blur-3xl p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <Users size={60} className="text-violet-400" />
        </div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
           <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Sparkles size={16} />
           </div>
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-100/70">
            {fr ? "Actions partenaires" : "Partner actions"}
          </h3>
        </div>
        <div className="space-y-3 relative z-10">
          <CmmButton href="/partners/onboarding" tone="secondary" variant="pill" className="w-full justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest">
            {fr ? "Parcours partenaire (5 min)" : "Partner flow (5 min)"}
            <ArrowUpRight size={14} />
          </CmmButton>
          <CmmButton asChild tone="primary" variant="pill" className="w-full justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest">
            <a href="mailto:partenaires@cleanmymap.fr?subject=Rejoindre le réseau partenaire">
              {fr ? "Rejoindre le réseau" : "Join the network"}
              <Mail size={14} />
            </a>
          </CmmButton>
        </div>
      </motion.section>

      {/* Transparence & Gouvernance */}
      <div className="grid gap-6">
        <motion.section variants={itemVariants} className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <ShieldCheck size={80} className="text-white" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400">
                <Info size={16} />
             </div>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {fr ? "Transparence" : "Transparency"}
            </h3>
          </div>
          <ul className="space-y-4 text-xs font-bold leading-relaxed text-slate-400 relative z-10">
            {[
              fr ? "Champs publics vs internes : les fiches sont publiques par défaut." : "Public vs internal fields: profiles are public by default.",
              fr ? "Critères de vérification : preuve d'activité et périmètre explicite." : "Verification criteria: activity proof and explicit scope.",
              fr ? "Fraîcheur des données : indicateur de récence sur chaque fiche." : "Data freshness: recency indicator on each profile."
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                 <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section variants={itemVariants} className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Target size={80} className="text-white" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
             <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400">
                <Target size={16} />
             </div>
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {fr ? "Gouvernance" : "Governance"}
            </h3>
          </div>
          <ul className="space-y-4 text-xs font-bold leading-relaxed text-slate-400 relative z-10">
            {[
              fr ? "Validation : équipe partenariats + relecture opérationnelle." : "Validation: partner team + operational review.",
              fr ? "Délai de traitement cible : 72h ouvrées." : "Target handling time: 72 business hours.",
              fr ? "Modifications : restreintes à l'administration identifiée." : "Edits: restricted to identified administration."
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-500/30 shrink-0" />
                 <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>

      {/* Contacts à qualifier */}
      <motion.section variants={itemVariants} className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <Clock size={80} className="text-white" />
        </div>
        <div className="flex items-center gap-3 mb-2 relative z-10">
           <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400">
              <Clock size={16} />
           </div>
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {fr ? "Contacts à qualifier" : "Contacts to qualify"}
          </h3>
        </div>
        <p className="mb-6 text-[9px] font-black uppercase tracking-widest text-slate-600 pl-11">
          {fr ? "Hors annuaire actif" : "Outside active directory"}
        </p>
        
        <ul className="space-y-3 relative z-10">
          {pendingEntries.map((entry) => (
            <motion.li 
              key={`pending-${entry.id}`} 
              whileHover={{ x: 4 }}
              className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 transition-all hover:bg-slate-950/60"
            >
              <p className="text-sm font-black text-white">{entry.name}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-slate-500">
                <span className="text-violet-400">{verificationLabels[entry.verificationStatus]}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>MAJ {entry.lastUpdatedAt}</span>
              </div>
            </motion.li>
          ))}
          {pendingEntries.length === 0 && (
            <li className="rounded-2xl border border-white/5 bg-slate-950/20 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                {fr ? "Aucun contact en attente" : "No contacts waiting"}
              </p>
            </li>
          )}
        </ul>
      </motion.section>
    </motion.div>
  );
}
