"use client";

import { ArrowRight, Globe, Building2, Sparkles, Target } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { AnnuaireFeaturedSection } from "./annuaire-featured-section";
import { AnnuaireExplorationView } from "./annuaire-exploration-view";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 1, y: 40 },
  visible: { opacity: 1, y: 0 }
};

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  const annuaireLogic = useAnnuaireLogic();
  const {
    featuredEntries,
    filterKey,
    resetFilters,
  } = annuaireLogic;
  const selectionIntentFilterKeyRef = useRef<string | null>(null);
  const previousFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (previousFilterKeyRef.current === filterKey) {
      return;
    }
    previousFilterKeyRef.current = filterKey;
    if (selectionIntentFilterKeyRef.current === filterKey) {
      selectionIntentFilterKeyRef.current = null;
      return;
    }
    setSelectedActorId(null);
  }, [filterKey]);

  const handleFocusMap = (id: string) => {
    const entryIsVisible = annuaireLogic.sortedAndFilteredEntries.some(
      (entry) => entry.id === id,
    );
    if (!entryIsVisible) {
      selectionIntentFilterKeyRef.current = "|all|all|all";
      resetFilters();
    }
    setSelectedActorId(id);
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SectionShell
      id="annuaire"
      title={fr ? "Annuaire des acteurs" : "Actors directory"}
      subtitle={fr ? "Explorez l'écosystème engagé pour un territoire propre et durable." : "Explore the ecosystem committed to a clean and sustainable territory."}
      icon={Globe}
      gradient="from-violet-600/20 via-violet-500/10 to-transparent"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <CmmSectionGroup>
        {/* Curated actors - a concise entry point before the full search */}
        <motion.section variants={itemVariants} className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8">
              <div className="space-y-8 max-w-3xl">
                <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs font-black uppercase tracking-[0.3em] text-violet-400 shadow-2xl">
                  <Building2 size={14} className="animate-pulse" />
                  {fr ? "Sélection éditoriale" : "Editorial selection"}
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[1.1]">
                  {fr ? "Quelques acteurs à découvrir" : "A few actors to discover"}
                </h2>
              </div>
              <p className="max-w-md text-xl text-slate-400 font-bold leading-relaxed opacity-80">
                {fr ? "Une sélection éditoriale avant la recherche complète de l'annuaire." : "An editorial selection before the directory's full search."}
              </p>
            </div>
            <div className="relative">
               <div className="absolute -left-20 top-1/2 -translate-y-1/2 p-20 opacity-5 pointer-events-none rotate-12">
                  <Sparkles size={200} className="text-violet-500" />
               </div>
               <AnnuaireFeaturedSection entries={featuredEntries} onFocusMap={handleFocusMap} fr={fr} />
            </div>
          </div>
        </motion.section>

        {/* Thematic Exploration - Immersive Glassmorphism */}
        <motion.section 
          variants={itemVariants}
          id="exploration-canvas-anchor"
          className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-slate-900/40 p-8 shadow-[0_0_100px_rgba(99,102,241,0.1)] backdrop-blur-3xl md:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="absolute -top-24 -right-24 p-24 opacity-5 text-violet-400 pointer-events-none">
              <Target size={300} />
          </div>
          
          <CmmSectionGroup>
            <div className="text-center space-y-6 max-w-3xl mx-auto">
               <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                  <Globe size={12} />
                  {fr ? "Recherche et exploration" : "Search and exploration"}
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  {fr ? "Trouvez la structure qui vous intéresse" : "Find the structure you need"}
               </h2>
               <p className="text-slate-400 font-bold leading-relaxed">
                  {fr ? "Recherchez, filtrez et comparez les ressources publiques déclarées." : "Search, filter and compare declared public resources."}
               </p>
            </div>

            <AnnuaireExplorationView
              logic={annuaireLogic}
              fr={fr}
              selectedActorId={selectedActorId}
              onSelectedActorIdChange={setSelectedActorId}
            />
          </CmmSectionGroup>
        </motion.section>

        {/* Final CTA - Institutional Premium */}
        <RubriqueCard
          variants={itemVariants}
          themeColor="violet"
          withTopBar={false}
          withHover={false}
          className="relative flex flex-col items-center justify-between gap-8 overflow-hidden md:flex-row"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
             <Building2 size={160} className="text-violet-400" />
          </div>
          <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {fr ? "Vous agissez sur le terrain ?" : "Are you acting on the field?"}
            </h3>
            <p className="text-slate-300 font-bold opacity-80 leading-relaxed">
              {fr ? "Rejoignez l'annuaire pour gagner en visibilité, partager vos rapports d'impact et coordonner vos prochaines actions." : "Join the directory to gain visibility, share your impact reports and coordinate your next actions."}
            </p>
          </div>
          <div className="relative z-10">
            <CmmButton 
              href="/partners/onboarding"
              tone="primary"
              variant="default"
              ariaLabel={fr ? "Référencer ma structure — ouvrir le parcours partenaire" : "Register my structure — open the partner onboarding"}
              className="flex items-center gap-3 bg-white font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl"
            >
              {fr ? "Référencer ma structure" : "Register my structure"}
              <ArrowRight size={20} />
            </CmmButton>
          </div>
        </RubriqueCard>
        </CmmSectionGroup>
      </motion.div>
    </SectionShell>
  );
}
