"use client";

import { MapPin, ArrowRight, Globe, Users as UsersIcon, Building2, Sparkles, Target } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { AnnuaireFeaturedSection } from "./annuaire-featured-section";
import { AnnuaireThematicExploration } from "./annuaire-thematic-exploration";
import { AnnuaireExplorationView } from "./annuaire-exploration-view";
import { AcademieClimatWorkshopsPanel } from "./academie-climat-workshops-panel";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const {
    searchTerm,
    setSearchTerm,
    setActorCardsPage,
    featuredEntries,
  } = useAnnuaireLogic();

  const handleFocusMap = () => {
    const canvasAnchor = document.getElementById("exploration-canvas-anchor");
    canvasAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SectionShell
      id="annuaire"
      title={fr ? "Annuaire des Acteurs" : "Actors Directory"}
      subtitle={fr ? "Explorez l'écosystème engagé pour un territoire propre et durable." : "Explore the ecosystem committed to a clean and sustainable territory."}
      icon={Globe}
      gradient="from-violet-600/20 via-indigo-500/10 to-transparent"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="space-y-40 pt-12"
      >
        {/* Workshops Panel - Premium Spotlight */}
        <motion.div variants={itemVariants} className="relative z-10">
          <AcademieClimatWorkshopsPanel />
        </motion.div>

        {/* Featured Actors - Elegant Presentation */}
        <motion.section variants={itemVariants} className="relative">
          <div className="absolute -inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
          <div className="pt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-20 px-4">
              <div className="space-y-8 max-w-3xl">
                <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 shadow-2xl">
                  <Building2 size={14} className="animate-pulse" />
                  {fr ? "Partenaires Stratégiques" : "Strategic Partners"}
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[1.1]">
                  {fr ? "Les acteurs qui font bouger les lignes" : "Actors driving systemic change"}
                </h2>
              </div>
              <p className="max-w-md text-xl text-slate-400 font-bold leading-relaxed opacity-80">
                {fr ? "Découvrez les structures les plus actives sur le territoire et leurs initiatives d'impact." : "Discover the most active structures in the territory and their high-impact initiatives."}
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
          className="relative py-24 px-8 md:px-16 rounded-[4rem] bg-slate-900/40 border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(139,92,246,0.1)] backdrop-blur-3xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_70%)]" />
          <div className="absolute -top-24 -right-24 p-24 opacity-5 text-indigo-400 pointer-events-none">
            <Target size={300} />
          </div>
          
          <div className="relative space-y-24">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
               <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                  <Globe size={12} />
                  {fr ? "Exploration Thématique" : "Thematic Exploration"}
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  {fr ? "Naviguez dans l'écosystème" : "Navigate the ecosystem"}
               </h2>
               <p className="text-slate-400 font-bold leading-relaxed">
                  {fr ? "Filtrez par thématique pour identifier les synergies et opportunités de collaboration locale." : "Filter by theme to identify synergies and local collaboration opportunities."}
               </p>
            </div>

            <AnnuaireThematicExploration
              activeTag={searchTerm}
              onSelectTag={(tag) => {
                setActorCardsPage(1);
                setSearchTerm(tag);
              }}
              fr={fr}
            />

            <AnnuaireExplorationView
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              fr={fr}
            />
          </div>
        </motion.section>

        {/* Final CTA - Institutional Premium */}
        <motion.div 
          variants={itemVariants}
          className="p-16 rounded-[4rem] border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-indigo-600/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 group"
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
              tone="primary"
              variant="default"
              className="px-10 py-5 rounded-[1.5rem] bg-white text-slate-950 font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
            >
              {fr ? "Référencer ma structure" : "Register my structure"}
              <ArrowRight size={20} />
            </CmmButton>
          </div>
        </motion.div>
      </motion.div>
    </SectionShell>
  );
}
