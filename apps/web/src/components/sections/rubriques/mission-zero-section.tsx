"use client";

import { 
  Building2, Users, Trash2, Leaf, Target, 
  Shield, ArrowRight, CheckCircle2, Sparkles
} from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { CmmButton } from "@/components/ui/cmm-button";
import { RubriqueCard, RubriqueTheme } from "@/components/ui/rubrique-card";
import { cn } from "@/lib/utils";

const FIVE_PILLARS = [
  {
    id: 1,
    icon: Building2,
    color: "emerald",
    title: "Diagnostic territorial",
    short: "Cartographier les zones",
    description: "Identifier et cartographier les points noirs de votre commune : zones industrielles, parcs, plages, berges.",
    actions: [
      "Utiliser la carte CleanMyMap",
      "Analyser les flux de passage",
      "Identifier les défaillances",
      "Quantifier l'état initial",
    ],
  },
  {
    id: 2,
    icon: Users,
    color: "blue",
    title: "Mobilisation citoyenne",
    short: "Impliquer les habitants",
    description: "Fédérer les habitants, associations et entreprises locales autour d'objectifs communs.",
    actions: [
      "Organiser des cleanups",
      "Créer des ambassadeurs",
      "Défis collectifs locaux",
      "Valoriser les bénévoles",
    ],
  },
  {
    id: 3,
    icon: Trash2,
    color: "rose",
    title: "Équipements adaptés",
    short: "Installer des solutions",
    description: "Déployer poubelles, cendriers et signalétique adaptés aux usages réels.",
    actions: [
      "Installer des cendriers",
      "Points de collecte",
      "Signalétique claire",
      "Optimiser le maillage",
    ],
  },
  {
    id: 4,
    icon: Leaf,
    color: "amber",
    title: "Sensibilisation",
    short: "Changer les comportements",
    description: "Communiquer de manière créative pour créer un changement de paradigme durable.",
    actions: [
      "Campagnes réseaux",
      "Affichage urbain",
      "Éducation scolaire",
      "Messages de terrain",
    ],
  },
  {
    id: 5,
    icon: Target,
    color: "violet",
    title: "Suivi & évaluation",
    short: "Mesurer les progrès",
    description: "Mettre en place des indicateurs pour mesurer l'impact et ajuster la stratégie globale.",
    actions: [
      "Suivre les données CMM",
      "Comparer N vs N-1",
      "Rapport annuel public",
      "Ajuster les actions",
    ],
  },
];

export function MissionZeroSection() {
  return (
    <SectionShell
      id="mission-zero"
      title="Mission Zéro Déchet"
      subtitle="Le guide stratégique pour une transition territoriale réussie vers l'excellence environnementale."
      icon={Shield}
      gradient="from-violet-500/20 via-emerald-500/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        {/* Intro Card */}
        <RubriqueCard 
          themeColor="violet"
          withTopBar={false}
          className="p-10 flex flex-col md:flex-row items-center justify-between gap-10 group"
        >
           <div className="flex items-center gap-8 relative z-10">
              <div className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform duration-700">
                 <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-white tracking-tight">Standard d&apos;Excellence</h3>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Protocole d&apos;engagement territorial</p>
              </div>
           </div>
           <p className="relative z-10 text-sm font-bold text-slate-400 leading-relaxed max-w-md md:text-right">
              CleanMyMap accompagne les territoires dans une démarche de labellisation informelle basée sur 5 piliers fondamentaux de l&apos;action publique environnementale.
           </p>
        </RubriqueCard>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
           {FIVE_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <RubriqueCard
                  key={pillar.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  themeColor={pillar.color as RubriqueTheme}
                  withTopBar={false}
                  className="p-8 group hover:bg-white/5 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className={cn(
                      "p-4 rounded-2xl w-fit border shadow-2xl transition-transform group-hover:scale-110 duration-500",
                      pillar.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      pillar.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      pillar.color === 'rose' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      pillar.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-violet-500/10 border-violet-500/20 text-violet-400'
                    )}>
                      <Icon size={24} />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xl font-black text-white tracking-tight leading-tight">{pillar.title}</h4>
                      <p className="text-xs font-bold text-slate-400 leading-relaxed">{pillar.description}</p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-white/5">
                      {pillar.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <CheckCircle2 size={12} className="text-slate-600 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <CmmButton type="button" tone="secondary" variant="pill" className="mt-8 flex items-center justify-between w-full p-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all">
                     En savoir plus
                     <ArrowRight size={14} />
                  </CmmButton>
                </RubriqueCard>
              );
           })}
        </div>

        {/* Call to Action */}
        <RubriqueCard 
          themeColor="violet"
          watermarkIcon={Target}
          watermarkSize={300}
          withTopBar={false}
          className="p-10 flex flex-col lg:flex-row items-center justify-between gap-12"
        >
           <div className="relative z-10 space-y-4 text-center lg:text-left">
              <h3 className="text-4xl font-black text-white tracking-tighter leading-tight">Prêt pour la labellisation ?</h3>
              <p className="text-lg font-bold text-white/80 max-w-xl">
                 Demandez un audit de territoire gratuit pour évaluer votre maturité sur les 5 piliers de la Mission Zéro Déchet.
              </p>
           </div>

           <CmmButton type="button" tone="primary" variant="pill" className="relative z-10 flex items-center gap-4 px-10 py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl transition-all">
              Démarrer l&apos;audit
              <ArrowRight size={18} />
           </CmmButton>
        </RubriqueCard>
      </div>
    </SectionShell>
  );
}
