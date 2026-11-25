"use client";

import { ArrowRight, Globe, Building2, Sparkles, Target, RefreshCw } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { AnnuaireFeaturedSection } from "./annuaire-featured-section";
import { AnnuaireExplorationView } from "./annuaire-exploration-view";
import { ParisNetwork3DSection, type ParisNetworkNavigation } from "./paris-network-3d-section";
import { PublicCleanlinessOrganization, type PublicCleanlinessNavigation } from "./public-cleanliness-organization";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET, type PublicCleanlinessOrganizationNode } from "@/lib/partners/public-cleanliness-organization";
import { resolveInstitutionId, resolveInstitutionNetworkActorId } from "@/lib/partners/public-cleanliness-network-links";
import { ParisNetworkContributionCard } from "./paris-network-contribution-card";
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

function AnnuaireDirectoryFeedback({ fr, logic }: { fr: boolean; logic: ReturnType<typeof useAnnuaireLogic> }) {
  if (logic.isLoading) {
    return <CmmFeedback tone="info" title={fr ? "Chargement des fiches partenaires" : "Loading partner profiles"}>{fr ? "Les ressources éditoriales restent visibles pendant le chargement des fiches partenaires publiées." : "Editorial resources remain visible while published partner profiles load."}</CmmFeedback>;
  }
  if (!logic.isPublishedDirectoryUnavailable) return null;
  const stale = logic.isPublishedDirectoryStale;
  return (
    <CmmFeedback
      tone={stale ? "warning" : "error"}
      title={stale ? fr ? "Fiches partenaires potentiellement périmées" : "Partner profiles may be stale" : fr ? "Fiches partenaires temporairement indisponibles" : "Published partner profiles temporarily unavailable"}
      action={<CmmButton type="button" tone="secondary" variant="ghost" size="sm" loading={logic.isValidating} onClick={logic.retryPublishedDirectory} ariaLabel={fr ? "Réessayer de charger les fiches partenaires" : "Retry loading partner profiles"} className="inline-flex items-center gap-2"><RefreshCw size={14} aria-hidden="true" />{logic.isValidating ? fr ? "Actualisation..." : "Refreshing..." : fr ? "Réessayer" : "Retry"}</CmmButton>}
    >
      {stale ? fr ? "La source des fiches partenaires n'a pas pu être actualisée. Les données affichées peuvent être périmées ; le compteur et les résultats visibles peuvent être partiels." : "The partner profile source could not be refreshed. Displayed data may be stale; the count and visible results may be partial." : fr ? "La source des fiches partenaires n'est pas disponible pour le moment. Les ressources éditoriales restent accessibles, mais le compteur et les résultats visibles peuvent être partiels." : "The partner profile source is temporarily unavailable. Editorial resources remain available, but the count and visible results may be partial."}
    </CmmFeedback>
  );
}

function AnnuaireJoinCta({ fr }: { fr: boolean }) {
  return (
    <RubriqueCard variants={itemVariants} themeColor="violet" withTopBar={false} withHover={false} className="relative flex flex-col items-center justify-between gap-8 overflow-hidden md:flex-row">
      <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Building2 size={160} className="text-violet-400" /></div>
      <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
        <h3 className="text-3xl font-black text-white tracking-tight">{fr ? "Vous agissez sur le terrain ?" : "Are you acting on the field?"}</h3>
        <p className="text-slate-300 font-bold opacity-80 leading-relaxed">{fr ? "Rejoignez l'annuaire pour présenter votre structure, partager vos besoins et rendre vos canaux publics visibles." : "Join the directory to present your structure, share your needs and make your public channels visible."}</p>
      </div>
      <CmmButton href="/partners/onboarding" tone="primary" variant="default" ariaLabel={fr ? "Référencer ma structure — ouvrir le parcours partenaire" : "Register my structure — open the partner onboarding"} className="relative z-10 flex items-center gap-3 bg-white font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl">{fr ? "Référencer ma structure" : "Register my structure"}<ArrowRight size={20} /></CmmButton>
    </RubriqueCard>
  );
}

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("FR:REG:11");
  const [networkTab, setNetworkTab] = useState<"network" | "organization">("network");
  const networkNavigation = useRef<ParisNetworkNavigation>(null);
  const organizationNavigation = useRef<PublicCleanlinessNavigation>(null);
  const getInstitutionId = (actorId: string) => resolveInstitutionId(PARIS_PUBLIC_CLEANLINESS_DATASET, actorId, PARIS_CLEANWALK_ACTORS);
  const getNetworkActorId = (node: PublicCleanlinessOrganizationNode) => resolveInstitutionNetworkActorId(PARIS_PUBLIC_CLEANLINESS_DATASET, node, PARIS_CLEANWALK_ACTORS);
  const openInstitution = (id: string) => {
    if (!organizationNavigation.current?.openNode(id)) return;
    setNetworkTab("organization");
    document.getElementById("annuaire-tab-organization")?.focus();
  };
  const openNetworkActor = (id: string) => {
    if (!networkNavigation.current?.openActor(id)) return;
    setNetworkTab("network");
    document.getElementById("annuaire-tab-network")?.focus();
  };

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
      selectionIntentFilterKeyRef.current = "|all|all|all|all";
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
        <AnnuaireDirectoryFeedback fr={fr} logic={annuaireLogic} />
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

        <section aria-label={fr ? "Intelligence territoriale" : "Territorial intelligence"}>
          <h2 className="mb-2 text-2xl font-black text-white">{fr ? "Intelligence territoriale" : "Territorial intelligence"}</h2>
          <p className="mb-4 text-sm text-slate-300">{fr ? "Comprendre les collaborations et trouver les bons interlocuteurs." : "Understand relationships and find the right contacts."}</p>
          <div role="tablist" aria-orientation="horizontal" aria-label={fr ? "Choisir une visualisation" : "Choose a visualization"} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const currentTab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
            if (!currentTab) return;
            event.preventDefault();
            const current = currentTab.id === "annuaire-tab-network" ? "network" : "organization";
            const next = event.key === "Home" ? "network" : event.key === "End" ? "organization" : current === "network" ? "organization" : "network";
            setNetworkTab(next);
            document.getElementById(`annuaire-tab-${next}`)?.focus();
          }} className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
            <button id="annuaire-tab-network" type="button" role="tab" aria-selected={networkTab === "network"} aria-controls="annuaire-panel-network" tabIndex={networkTab === "network" ? 0 : -1} onClick={() => setNetworkTab("network")} className={`rounded-xl border px-4 py-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${networkTab === "network" ? "border-violet-300/60 bg-violet-400/15 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
              {fr ? "Réseau 3D des cleanwalks" : "3D cleanwalk network"}
            </button>
            <button id="annuaire-tab-organization" type="button" role="tab" aria-selected={networkTab === "organization"} aria-controls="annuaire-panel-organization" tabIndex={networkTab === "organization" ? 0 : -1} onClick={() => setNetworkTab("organization")} className={`rounded-xl border px-4 py-3 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${networkTab === "organization" ? "border-sky-300/60 bg-sky-400/15 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}>
              {fr ? "Organisation des services publics" : "Public service organization"}
            </button>
          </div>
          <div id="annuaire-panel-network" role="tabpanel" aria-labelledby="annuaire-tab-network" tabIndex={0} hidden={networkTab !== "network"}>
            <ParisNetwork3DSection fr={fr} onTerritoryChange={setSelectedTerritoryId} active={networkTab === "network"} navigationRef={networkNavigation} getInstitutionId={getInstitutionId} onOpenInstitution={openInstitution} />
            <ParisNetworkContributionCard fr={fr} territoryId={selectedTerritoryId} />
          </div>
          <div id="annuaire-panel-organization" role="tabpanel" aria-labelledby="annuaire-tab-organization" tabIndex={0} hidden={networkTab !== "organization"}>
            <PublicCleanlinessOrganization fr={fr} navigationRef={organizationNavigation} getNetworkActorId={getNetworkActorId} onOpenNetworkActor={openNetworkActor} />
          </div>
        </section>

        {/* Final CTA - Institutional Premium */}
        <AnnuaireJoinCta fr={fr} />
        </CmmSectionGroup>
      </motion.div>
    </SectionShell>
  );
}
