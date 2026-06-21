"use client";

import dynamic from "next/dynamic";
import { Leaf, Info, MapPin, Users, ArrowRight, Sparkles, BookOpen, Trash2, ShieldCheck, Zap } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  COMPOST_GUIDE_CARDS,
  COMPOST_POINTS,
  COMPOST_RULE_CARDS,
  COMPOST_TERRITORY_LINKS,
  type CompostPoint,
} from "@/lib/learning/compost-guide-data";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  CompostReflexGrid,
  CompostRulesList,
  CompostStepCards,
  OfficialMapsList,
  SelectedPointsGrid,
} from "./compost-components";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { useInViewOnce } from "@/components/ui/use-in-view-once";

const CompostMapCanvas = dynamic(
  () => import("./compost-map-canvas").then((mod) => mod.CompostMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-500">
        Loading map...
      </div>
    ),
  },
);

const steps = [
  {
    title: { fr: "1. Choisir la bonne voie", en: "1. Choose the right route" },
    body: {
      fr: "Jardin, immeuble, site associatif ou collecte locale.",
      en: "Garden, building, association site or local collection.",
    },
  },
  {
    title: { fr: "2. Vérifier les consignes", en: "2. Check guidelines" },
    body: {
      fr: "Chaque site peut ajouter ses propres règles locales.",
      en: "Each site can have its own local rules and guidelines.",
    },
  },
  {
    title: { fr: "3. Déposer proprement", en: "3. Drop it cleanly" },
    body: {
      fr: "Biodéchets sans sac plastique et sans excès de liquide.",
      en: "Bio-waste without plastic bags and without excess liquid.",
    },
  },
  {
    title: { fr: "4. Valoriser la matière", en: "4. Valorize matter" },
    body: {
      fr: "Récupère la matière mûre pour tes plantes si autorisé.",
      en: "Recover mature compost for your plants if allowed.",
    },
  },
];

export function CompostSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const { ref: mapShellRef, isInView: isMapVisible } = useInViewOnce<HTMLDivElement>({
    rootMargin: "280px 0px",
  });

  return (
    <SectionShell 
      id="compost"
      title={fr ? "Guide du Compostage" : "Composting Guide"}
      subtitle={fr 
        ? "Transformez vos biodéchets en ressources fertiles. Trouvez un point de collecte ou apprenez à composter." 
        : "Turn your bio-waste into fertile resources. Find a collection point or learn how to compost."}
      icon={Leaf}
      gradient="from-emerald-500/20 via-teal-500/10 to-transparent"
    >
      <div className="space-y-20 pt-12">
        {/* Navigation / Hero Link Row */}
        <RubriqueCard 
          themeColor="emerald" 
          withTopBar={false}
          className="flex flex-col lg:flex-row items-center justify-between gap-8 p-10"
        >
           <div className="flex items-center gap-8">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform duration-700">
                 <Sparkles size={32} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-white tracking-tight">
                    {fr ? "Économie Circulaire" : "Circular Economy"}
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    {fr ? "Données : Ville de Paris & Partenaires" : "Data: City of Paris & Partners"}
                 </p>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4">
              <CmmButton href="/sections/recycling" tone="secondary" variant="pill" className="flex items-center gap-4 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                {fr ? "Assistant Tri" : "Sorting Assistant"}
                <ArrowRight size={16} />
              </CmmButton>
              <CmmButton type="button" tone="primary" variant="pill" className="flex items-center gap-4 px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all">
                {fr ? "Signaler un bac plein" : "Report full bin"}
                <Zap size={16} />
              </CmmButton>
           </div>
        </RubriqueCard>

        {/* Section 1: Strategies */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                <BookOpen size={20} />
             </div>
             <h3 className="text-2xl font-black text-white tracking-tight">
                {fr ? "Trois réflexes pour débuter" : "Three reflexes to start"}
             </h3>
          </div>
          <CompostReflexGrid cards={COMPOST_GUIDE_CARDS} fr={fr} />
        </div>

        {/* Section 2: Map & Points */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-10 items-start">
           <div className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                    <MapPin size={20} />
                 </div>
                 <h3 className="text-2xl font-black text-white tracking-tight">
                    {fr ? "Points de proximité" : "Proximity points"}
                 </h3>
              </div>
              <div ref={mapShellRef} className="min-h-[480px]">
                {isMapVisible ? (
                  <CompostMapCanvas points={COMPOST_POINTS} />
                ) : (
                  <div className="flex h-[480px] items-center justify-center rounded-[2.5rem] border border-white/10 bg-slate-950/70">
                    <div className="space-y-3 text-center">
                      <div className="mx-auto h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Chargement de la carte...
                      </p>
                    </div>
                  </div>
                )}
              </div>
           </div>

           <div className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                    <Users size={20} />
                 </div>
                 <h3 className="text-2xl font-black text-white tracking-tight">
                    {fr ? "Sélection locale" : "Local selection"}
                 </h3>
              </div>
              <SelectedPointsGrid points={COMPOST_POINTS} fr={fr} />
           </div>
        </div>

        {/* Section 3: Rules & Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10">
           <RubriqueCard 
             initial={{ opacity: 0, x: -20 }}
             whileInView={{ opacity: 1, x: 0 }}
             themeColor="emerald"
             watermarkIcon={ShieldCheck}
             watermarkSize={160}
             className="space-y-10 p-10"
           >
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <ShieldCheck size={20} />
                 </div>
                 <h3 className="text-xl font-black text-white tracking-tight">
                    {fr ? "Protocole Dépôt" : "Deposit Protocol"}
                 </h3>
              </div>
              <div className="space-y-4">
                 {steps.map((step, i) => (
                   <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">{fr ? step.title.fr : step.title.en}</p>
                      <p className="text-sm font-bold text-slate-300 leading-relaxed">{fr ? step.body.fr : step.body.en}</p>
                   </div>
                 ))}
              </div>
           </RubriqueCard>

           <div className="space-y-10">
              <div className="flex items-center gap-4 px-4">
                 <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                    <Trash2 size={20} />
                 </div>
                 <h3 className="text-2xl font-black text-white tracking-tight">
                    {fr ? "Règles d'or du composteur" : "Golden rules of composting"}
                 </h3>
              </div>
              <CompostRulesList rules={COMPOST_RULE_CARDS} fr={fr} />
           </div>
        </div>

        {/* Territory Resources */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 px-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                 <Info size={20} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                 {fr ? "Ressources par territoire" : "Resources by territory"}
              </h3>
           </div>
           <OfficialMapsList links={COMPOST_TERRITORY_LINKS} fr={fr} />
        </div>
      </div>
    </SectionShell>
  );
}

// Helper component for internal links since 'Link' wasn't imported in previous thought
import Link from "next/link";
