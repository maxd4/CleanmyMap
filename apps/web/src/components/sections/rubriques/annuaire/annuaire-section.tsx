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
import { PublicCleanlinessOrganization, type PublicCleanlinessNavigation } from "./public-cleanliness-organization";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET, type PublicCleanlinessOrganizationNode } from "@/lib/partners/public-cleanliness-organization";
import { resolveInstitutionNetworkActorId } from "@/lib/partners/public-cleanliness-network-links";
import { ParisNetworkContributionCard } from "./paris-network-contribution-card";
import { useAnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Nombre maximal de cartes affichées initialement dans la sélection éditoriale de l'Annuaire. */
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
    <FamilyRubriqueCard withTopBar={false} withHover={false} className="relative flex flex-col items-center justify-between gap-8 overflow-hidden md:flex-row">
      <div className="pointer-events-none absolute top-0 right-0 p-12 opacity-10"><Building2 size={160} className="text-violet-400" /></div>
      <div className="relative z-10 max-w-xl space-y-4 text-center md:text-left">
        <h3 className="text-2xl font-bold tracking-tight text-[var(--cmm-rubrique-text)]">{fr ? "Vous agissez sur le terrain ?" : "Are you acting on the field?"}</h3>
        <p className="font-medium leading-relaxed text-[var(--cmm-rubrique-text)]">{fr ? "Rejoignez l'annuaire pour présenter votre structure, partager vos besoins et rendre vos canaux publics visibles." : "Join the directory to present your structure, share your needs and make your public channels visible."}</p>
      </div>
      <CmmButton href="/partners/onboarding" tone="primary" variant="default" ariaLabel={fr ? "Référencer ma structure — ouvrir le parcours partenaire" : "Register my structure — open the partner onboarding"} className="relative z-10 flex items-center gap-3">{fr ? "Référencer ma structure" : "Register my structure"}<ArrowRight size={20} /></CmmButton>
    </FamilyRubriqueCard>
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
  const [view, setView] = useState<AnnuaireView>("organization");
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const organizationNavigation = useRef<PublicCleanlinessNavigation>(null);
  const getNetworkActorId = (node: PublicCleanlinessOrganizationNode) => resolveInstitutionNetworkActorId(PARIS_PUBLIC_CLEANLINESS_DATASET, node, PARIS_CLEANWALK_ACTORS);
  const openNetworkActor = (actorId: string) => {
    const actor = PARIS_CLEANWALK_ACTORS.find((item) => item.id === actorId);
    handleFocusMap(actor?.annuaireEntryId ?? actorId);
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

  /** Localiser : sélectionne l'acteur (en rétablissant les filtres si la cible est exclue) puis ouvre Carte & réseau. */
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

  const openInstitution = (institutionId: string) => {
    if (organizationNavigation.current?.openNode(institutionId)) {
      setView("organization");
      document.getElementById(annuaireTabId("organization"))?.focus();
    }
  };

  const selectedActor = selectedActorId
    ? (annuaireLogic.enrichedEntries ?? []).find((entry) => entry.id === selectedActorId) ?? null
    : null;
  const discoverEntries = showAllFeatured
    ? featuredEntries
    : featuredEntries.slice(0, DISCOVER_INITIAL_CARDS);

  return (
    <SectionShell
      id="annuaire"
      title={fr ? "Annuaire des acteurs" : "Actors directory"}
      subtitle={fr ? "Explorez l'écosystème engagé pour un territoire propre et durable." : "Explore the ecosystem committed to a clean and sustainable territory."}
      icon={Globe}
      gradient="from-transparent via-transparent to-transparent"
    >
      <CmmSectionGroup>
        <AnnuaireViewTabs fr={fr} view={view} onChange={setView} />
        <AnnuaireDirectoryFeedback fr={fr} logic={annuaireLogic} />

        <AnnuaireTabPanel view="organization" active={view === "organization"}>
          <PublicCleanlinessOrganization fr={fr} navigationRef={organizationNavigation} getNetworkActorId={getNetworkActorId} onOpenNetworkActor={openNetworkActor} />
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="directory" active={view === "directory"}>
          {view === "directory" ? (
            <div className="space-y-6">
              {discoverEntries.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm cmm-text-primary">
                    {fr ? "Une sélection éditoriale d'acteurs à découvrir avant la recherche complète de l'annuaire." : "An editorial selection of actors to discover before the directory's full search."}
                  </p>
                  <AnnuaireFeaturedSection entries={discoverEntries} onFocusMap={handleFocusMap} fr={fr} />
                  {featuredEntries.length > DISCOVER_INITIAL_CARDS ? (
                    <div className="flex flex-wrap gap-2">
                      <CmmButton type="button" tone="secondary" variant="pill" ariaPressed={showAllFeatured} onClick={() => setShowAllFeatured((value) => !value)}>
                        {showAllFeatured ? (fr ? "Afficher moins" : "Show fewer") : (fr ? `Afficher toutes (${featuredEntries.length})` : `Show all (${featuredEntries.length})`)}
                      </CmmButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <AnnuaireExplorationView logic={annuaireLogic} fr={fr} mode="directory" selectedActorId={selectedActorId} onSelectedActorIdChange={setSelectedActorId} onLocateActor={handleFocusMap} />
            </div>
          ) : null}
        </AnnuaireTabPanel>

        <AnnuaireTabPanel view="map" active={view === "map"}>
          {view === "map" ? (
            <div id="annuaire-panel-network" className="space-y-6">
              <AnnuaireExplorationView logic={annuaireLogic} fr={fr} mode="map" selectedActorId={selectedActorId} onSelectedActorIdChange={setSelectedActorId} onLocateActor={handleFocusMap} onOpenInstitution={openInstitution} />
              <ParisNetworkContributionCard fr={fr} territoryId="FR:REG:11" />
            </div>
          ) : null}
        </AnnuaireTabPanel>

        <AnnuaireJoinCta fr={fr} />
      </CmmSectionGroup>

      <AnimatePresence>
        {view === "directory" && selectedActor ? (
          <AnnuairePartnerDrawer entry={selectedActor} isOpen onClose={() => setSelectedActorId(null)} fr={fr} />
        ) : null}
      </AnimatePresence>
    </SectionShell>
  );
}
