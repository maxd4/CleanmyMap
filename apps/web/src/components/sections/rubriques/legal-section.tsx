"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, Cookie, FileText, Scale, Shield, Users, ArrowRight, Sparkles, ExternalLink } from "lucide-react";
import type { ElementType } from "react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { RubriqueCard, RubriqueTheme } from "@/components/ui/rubrique-card";
import { cn } from "@/lib/utils";

type LegalCard = {
  id: string;
  icon: ElementType;
  title: string;
  summary: string;
  href?: string;
  cta?: string;
  color: "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";
};

const LEGAL_CARDS: LegalCard[] = [
  {
    id: "mentions",
    icon: FileText,
    title: "Mentions légales",
    summary: "Éditeur, hébergement, propriété intellectuelle et point de contact officiel.",
    href: "/mentions-legales",
    cta: "Ouvrir",
    color: "blue",
  },
  {
    id: "cgu",
    icon: Scale,
    title: "Conditions d'utilisation",
    summary: "Accès au service, création de compte, règles d'usage, modération et responsabilité.",
    href: "/conditions-generales-utilisation",
    cta: "Lire les CGU",
    color: "violet",
  },
  {
    id: "confidentialite",
    icon: Shield,
    title: "Confidentialité (RGPD)",
    summary: "Détail des données collectées, bases légales, conservation, transferts et droits.",
    href: "/politique-confidentialite",
    cta: "Voir la politique",
    color: "emerald",
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Politique cookies",
    summary: "Consentement, cookie de session, préférences locales et analytics conditionnés.",
    href: "/politique-cookies",
    cta: "Gérer les cookies",
    color: "amber",
  },
  {
    id: "benevoles",
    icon: Users,
    title: "Charte du bénévole",
    summary: "Engagements terrain, sécurité, bonne conduite et cadre de participation aux actions.",
    color: "rose",
  },
  {
    id: "responsabilite",
    icon: AlertTriangle,
    title: "Clause de responsabilité",
    summary: "Les informations sont fournies en l'état et les statistiques restent des estimations.",
    color: "slate",
  },
];

export function LegalSection() {
  return (
    <SectionShell
      id="legal"
      title="Cadre Juridique"
      subtitle="Documentation officielle, conformité RGPD et conditions générales de la plateforme."
      icon={Building2}
      gradient="from-slate-500/20 via-blue-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Compliance Status */}
        <RubriqueCard 
          themeColor="emerald"
          withTopBar={false}
          className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 group"
        >
           <div className="flex items-center gap-6 relative z-10">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                 <Shield size={24} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">Conformité RGPD</h4>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dernière mise à jour : 01 Mai 2024</p>
              </div>
           </div>
           <p className="relative z-10 text-[11px] font-bold text-slate-400 leading-relaxed max-w-md md:text-right">
              CleanMyMap s'engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
           </p>
        </RubriqueCard>

        {/* Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_CARDS.map((card, index) => {
            const Icon = card.icon;
            
            const cardContent = (
              <RubriqueCard
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                themeColor={card.color as RubriqueTheme}
                watermarkIcon={Icon}
                withTopBar={false}
                className={cn(
                  "p-8 group transition-all flex flex-col justify-between h-full min-h-[320px]",
                  card.href ? "hover:bg-white/5" : "cursor-default"
                )}
              >
                <div className="space-y-6 relative z-10">
                   <div className={cn(
                     "p-4 rounded-2xl w-fit border shadow-2xl group-hover:scale-110 transition-transform duration-500",
                     card.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                     card.color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                     card.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                     card.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                     card.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                     'bg-slate-500/10 border-slate-500/20 text-slate-400'
                   )}>
                      <Icon size={24} />
                   </div>

                   <div className="space-y-3">
                      <h4 className="text-xl font-black text-white tracking-tight leading-tight uppercase">{card.title}</h4>
                      <p className="text-[13px] font-bold text-slate-400 leading-relaxed">{card.summary}</p>
                   </div>
                </div>

                <div className="relative z-10">
                  {card.href ? (
                    <div className="mt-8 flex items-center justify-between w-full p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:bg-white/10 group-hover:text-white transition-all">
                       {card.cta || "Consulter"}
                       <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  ) : (
                    <div className="mt-8 p-4 rounded-xl border border-dashed border-white/10 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">
                       En cours de rédaction
                    </div>
                  )}
                </div>
              </RubriqueCard>
            );

            return card.href ? (
              <Link key={card.id} href={card.href} className="block h-full">
                {cardContent}
              </Link>
            ) : (
              <div key={card.id} className="block h-full">
                {cardContent}
              </div>
            );
          })}
        </div>

        {/* Action Form Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
           <Link href="/sections/rgpd-request" className="block group">
             <RubriqueCard 
               themeColor="sky" 
               withTopBar={false} 
               className="p-8 flex items-center justify-between group-hover:bg-white/5 transition-all"
             >
               <div className="flex items-center gap-6 relative z-10">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 group-hover:text-white transition-colors">
                     <Sparkles size={20} />
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-sm font-black text-white uppercase tracking-widest">Demande RGPD</h4>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exercer vos droits (accès, suppression...)</p>
                  </div>
               </div>
               <ExternalLink size={18} className="text-slate-600 group-hover:text-white group-hover:scale-110 transition-all relative z-10" />
             </RubriqueCard>
           </Link>

           <div className="block group">
             <RubriqueCard 
               themeColor="amber" 
               withTopBar={false} 
               className="p-8 flex items-center justify-between"
             >
               <div className="flex items-center gap-6 relative z-10">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                     <AlertTriangle size={20} />
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-sm font-black text-white uppercase tracking-widest">Signaler un abus</h4>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contenu inapproprié ou illégal</p>
                  </div>
               </div>
               <button className="relative z-10 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
                  Formulaire
               </button>
             </RubriqueCard>
           </div>
        </div>
      </div>
    </SectionShell>
  );
}
