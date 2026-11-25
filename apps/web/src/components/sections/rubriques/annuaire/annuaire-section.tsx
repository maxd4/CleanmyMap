"use client";

import { ArrowRight, Globe, Building2, RefreshCw } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { AnnuaireFeaturedSection } from "./annuaire-featured-section";
import { AnnuaireExplorationView } from "./annuaire-exploration-view";
import { AnnuairePartnerDrawer } from "./annuaire-partner-drawer";
import {
  AnnuaireViewTabs,
  annuairePanelId,
  annuaireTabId,
  type AnnuaireView,
} from "./annuaire-view-tabs";
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
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Nombre maximal de cartes affichées initialement dans Découvrir. */
const DISCOVER_INITIAL_CARDS = 6;
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
    <RubriqueCard themeColor="violet" withTopBar={false} withHover={false} className="relative flex flex-col items-center justify-between gap-8 overflow-hidden md:flex-row">
      <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Building2 size={160} className="text-violet-400" /></div>
      <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
        <h3 className="text-3xl font-black text-white tracking-tight">{fr ? "Vous agissez sur le terrain ?" : "Are you acting on the field?"}</h3>
        <p className="text-slate-300 font-bold opacity-80 leading-relaxed">{fr ? "Rejoignez l'annuaire pour présenter votre structure, partager vos besoins et rendre vos canaux publics visibles." : "Join the directory to present your structure, share your needs and make your public channels visible."}</p>
      </div>
      <CmmButton href="/partners/onboarding" tone="primary" variant="default" ariaLabel={fr ? "Référencer ma structure — ouvrir le parcours partenaire" : "Register my structure — open the partner onboarding"} className="relative z-10 flex items-center gap-3 bg-white font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl">{fr ? "Référencer ma structure" : "Register my structure"}<ArrowRight size={20} /></CmmButton>
    </RubriqueCard>
  );
}

function AnnuaireTabPanel({ view, active, children }: { view: AnnuaireView; active: boolean; children: ReactNode }) {
  return (
    <div id={annuairePanelId(view)} role="tabpanel" aria-labelledby={annuaireTabId(view)} tabIndex={0} hidden={!active}>
      {children}
    </div>
  );
}

export function AnnuaireSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [view, setView] = useState<AnnuaireView>("directory");
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("FR:REG:11");
  const networkNavigation = useRef<ParisNetworkNavigation>(null);
  const organizationNavigation = useRef<PublicCleanlinessNavigation>(null);
  const getInstitutionId = (actorId: string) => resolveInstitutionId(PARIS_PUBLIC_CLEANLINESS_DATASET, actorId, PARIS_CLEANWALK_ACTORS);
  const getNetworkActorId = (node: PublicCleanlinessOrganizationNode) => resolveInstitutionNetworkActorId(PARIS_PUBLIC_CLEANLINESS_DATASET, node, PARIS_CLEANWALK_ACTORS);
  const openInstitution = (id: string) => {
    if (!organizationNavigation.current?.openNode(id)) return;
    setView("organization");
    document.getElementById(annuaireTabId("organization"))?.focus();
  };
  const openNetworkActor = (id: string) => {
    if (!networkNavigation.current?.openActor(id)) return;
    setView("network");
    document.getElementById(annuaireTabId("network"))?.focus();
  };

  const annuaireLogic = useAnnuaireLogic();
  const { featuredEntries, filterKey, resetFilters } = annuaireLogic;
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

  /** Localiser : sélectionne l'acteur (en rétablissant les filtres si la cible est exclue) puis ouvre la Carte. */
  const handleFocusMap = (id: string) => {
    const entryIsVisible = annuaireLogic.sortedAndFilteredEntries.some(
      (entry) => entry.id === id,
    );
    if (!entryIsVisible) {
      selectionIntentFilterKeyRef.current = "|all|all|all|all";
      resetFilters();
    }
    setSelectedActorId(id);
    setView("map");
    document.getElementById(annuaireTabId("map"))?.focus();
  };

  const selectedActor = selectedActorId
    ? (annuaireLogic.enrichedEntries ?? []).find((entry) => entry.id === selectedActorId) ?? null
    : null;
  const discoverEntries = showAllFeatured
    ? featuredEntries
    : featuredEntries.slice(0, DISCOVER_INITIAL_CARDS);
  const showsDirectoryData = view === "discover" || view === "directory" || view === "map";

  return (
    <SectionShell
      id="annuaire"
      title={fr ? "Annuaire des acteurs" : "Actors directory"}
      subtitle={fr ? "Explorez l'écosystème engagé pour un territoire propre et durable." : "Explore the ecosystem committed to a clean and sustainable territory."}
      icon={Globe}
      gradient="from-violet-600/20 via-violet-500/10 to-transparent"
    >
      <CmmSectionGroup>
        <AnnuaireViewTabs fr={fr} view={view} onChange={setView} />
        {showsDirectoryData ? <AnnuaireDirectoryFeedback fr={fr} logic={annuaireLogic} /> : null}

        <AnnuaireTabPanel view="discover" active={view === "discover"}>
          {view === "discover" ? (
            <div className="space-y-4">
              <p className="text-sm cmm-text-primary">
                {fr ? "Une sélection éditoriale d'acteurs à découvrir. Le catalogue complet reste dans l'annuaire." : "An editorial selection of actors to discover. The full catalog stays in the directory."}
              </p>
              <AnnuaireFeaturedSection entries={discoverEntries} onFocusMap={handleFocusMap} fr={fr} />
              <div className="flex flex-wrap gap-2">
                {featuredEntries.length > DISCOVER_INITIAL_CARDS ? (
                  <CmmButton type="button" tone="secondary" variant="pill" ariaPressed={showAllFeatured} onClick={() => setShowAllFeatured((value) => !value)}>
                    {showAllFeatured ? (fr ? "Afficher moins" : "Show fewer") : (fr ? `Afficher toutes (${featuredEntries.length})` : `Show all (${featuredEntries.length})`)}
                  </CmmButton>
                ) : null}
                <CmmButton type="button" tone="tertiary" variant="pill" onClick={() => { setView("directory"); document.getElementById(annuaireTabId("directory"))?.focus(); }}>
                  {fr ? "Voir tout l'annuaire" : "See the full directory"}
                </CmmButton>
              </div>
            </div>
          ) : null}
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="directory" active={view === "directory"}>
          {view === "directory" ? (
            <AnnuaireExplorationView logic={annuaireLogic} fr={fr} mode="directory" selectedActorId={selectedActorId} onSelectedActorIdChange={setSelectedActorId} onLocateActor={handleFocusMap} />
          ) : null}
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="map" active={view === "map"}>
          {view === "map" ? (
            <AnnuaireExplorationView logic={annuaireLogic} fr={fr} mode="map" selectedActorId={selectedActorId} onSelectedActorIdChange={setSelectedActorId} />
          ) : null}
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="network" active={view === "network"}>
          <ParisNetwork3DSection fr={fr} onTerritoryChange={setSelectedTerritoryId} active={view === "network"} navigationRef={networkNavigation} getInstitutionId={getInstitutionId} onOpenInstitution={openInstitution} />
          <ParisNetworkContributionCard fr={fr} territoryId={selectedTerritoryId} />
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="organization" active={view === "organization"}>
          <PublicCleanlinessOrganization fr={fr} navigationRef={organizationNavigation} getNetworkActorId={getNetworkActorId} onOpenNetworkActor={openNetworkActor} />
        </AnnuaireTabPanel>

        <AnnuaireJoinCta fr={fr} />
      </CmmSectionGroup>

      <AnimatePresence>
        {showsDirectoryData && selectedActor ? (
          <AnnuairePartnerDrawer entry={selectedActor} isOpen onClose={() => setSelectedActorId(null)} fr={fr} />
        ) : null}
      </AnimatePresence>
    </SectionShell>
  );
}