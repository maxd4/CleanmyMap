import dynamic from "next/dynamic";
import { useState } from "react";
import { Map as MapIcon, Share2 } from "lucide-react";
import { AnnuaireNetworkGraph } from "./annuaire-network-graph";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import { AnnuaireCompactResults } from "./annuaire-compact-results";
import { AnnuairePartnerList } from "./annuaire-partner-list";
import type { AnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField } from "@/components/ui/cmm-field";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((module) => module.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[var(--cmm-surface-border)] text-sm cmm-text-secondary">
        Chargement de la carte...
      </div>
    ),
  },
);

export type AnnuaireExplorationMode = "directory" | "map";

type AnnuaireExplorationViewProps = {
  logic: AnnuaireLogic;
  fr?: boolean;
  /** `directory` : recherche + grille ; `map` : recherche + carte/graphe + résultats compacts. */
  mode?: AnnuaireExplorationMode;
  selectedActorId: string | null;
  onSelectedActorIdChange: (id: string | null) => void;
  /** Localiser depuis la liste : bascule vers la vue Carte avec la sélection. */
  onLocateActor?: (id: string) => void;
};

function AnnuaireVisualization({
  fr,
  entries,
  selectedActorId,
  onSelect,
}: {
  fr: boolean;
  entries: AnnuaireLogic["sortedAndFilteredEntries"];
  selectedActorId: string | null;
  onSelect: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"map" | "network">("map");
  return (
    <div className="min-w-0 space-y-3">
      <div
        role="group"
        aria-label={fr ? "Choisir la visualisation" : "Choose the visualization"}
        className="flex flex-wrap gap-2"
      >
        <CmmButton
          type="button"
          onClick={() => setViewMode("map")}
          tone={viewMode === "map" ? "primary" : "tertiary"}
          variant="pill"
          ariaPressed={viewMode === "map"}
        >
          <MapIcon size={16} className="mr-2" aria-hidden="true" />
          {fr ? "Carte" : "Map"}
        </CmmButton>
        <CmmButton
          type="button"
          onClick={() => setViewMode("network")}
          tone={viewMode === "network" ? "primary" : "tertiary"}
          variant="pill"
          ariaPressed={viewMode === "network"}
        >
          <Share2 size={16} className="mr-2" aria-hidden="true" />
          {fr ? "Graphe des acteurs" : "Actors graph"}
        </CmmButton>
      </div>
      <div className="relative h-[60vh] min-h-[360px] w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--cmm-surface-border)]">
        {viewMode === "map" ? (
          <AnnuaireMapCanvas
            items={entries}
            variant="exploration"
            onItemClick={onSelect}
            highlightedItemId={selectedActorId}
          />
        ) : (
          <AnnuaireNetworkGraph
            entries={entries}
            onSelectPartner={(entry) => onSelect(entry.id)}
          />
        )}
      </div>
    </div>
  );
}

export function AnnuaireExplorationView({
  logic,
  fr: externalFr,
  mode = "directory",
  selectedActorId,
  onSelectedActorIdChange,
  onLocateActor,
}: AnnuaireExplorationViewProps) {
  const {
    searchTerm,
    setSearchTerm,
    filterKind,
    setFilterKind,
    filterContribution,
    setFilterContribution,
    engagementDomain,
    setEngagementDomain,
    zoneFilter,
    setZoneFilter,
    actorCardsPage,
    setActorCardsPage,
    resetFilters,
    targetArrondissement,
    sortedAndFilteredEntries,
    totalPages,
    paginatedEntries,
    locale,
  } = logic;

  const fr = externalFr ?? locale === "fr";
  const count = sortedAndFilteredEntries.length;
  const locate = onLocateActor ?? onSelectedActorIdChange;

  return (
    <div className="flex min-w-0 w-full flex-col gap-4">
      <CmmCard variant="default" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <CmmField label={fr ? "Rechercher" : "Search"} className="min-w-0 flex-1 basis-64">
            <input
              type="search"
              className="cmm-input w-full"
              placeholder={
                fr ? "Rechercher une structure, un domaine..." : "Search structures, domains..."
              }
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </CmmField>
          <p role="status" aria-live="polite" className="pb-2 text-sm font-semibold cmm-text-primary">
            {count} {fr ? "résultats trouvés" : "results found"}
          </p>
        </div>
        <AnnuaireFiltersCard
          fr={fr}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterKind={filterKind}
          setFilterKind={setFilterKind}
          filterContribution={filterContribution}
          setFilterContribution={setFilterContribution}
          engagementDomain={engagementDomain}
          setEngagementDomain={setEngagementDomain}
          zoneFilter={zoneFilter}
          setZoneFilter={setZoneFilter}
          setActorCardsPage={setActorCardsPage}
          resetFilters={resetFilters}
          targetArrondissement={targetArrondissement}
          resultsCount={count}
        />
      </CmmCard>

      {mode === "directory" ? (
        <AnnuairePartnerList
          fr={fr}
          entries={paginatedEntries}
          currentPage={actorCardsPage}
          totalPages={totalPages}
          onPageChange={setActorCardsPage}
          onFocusMap={locate}
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <AnnuaireVisualization
            fr={fr}
            entries={sortedAndFilteredEntries}
            selectedActorId={selectedActorId}
            onSelect={onSelectedActorIdChange}
          />
          <AnnuaireCompactResults
            fr={fr}
            entries={paginatedEntries}
            selectedActorId={selectedActorId}
            currentPage={actorCardsPage}
            totalPages={totalPages}
            onPageChange={setActorCardsPage}
            onSelect={onSelectedActorIdChange}
          />
        </div>
      )}
    </div>
  );
}
