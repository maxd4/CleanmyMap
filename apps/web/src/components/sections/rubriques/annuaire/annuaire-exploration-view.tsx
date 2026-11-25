import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { AnnuaireFiltersCard } from "./annuaire-filters-card";
import { AnnuaireCompactResults } from "./annuaire-compact-results";
import { AnnuairePartnerList } from "./annuaire-partner-list";
import {
  AnnuaireIncidentRelationsPanel,
  AnnuaireOutsideAndUnknownPanels,
} from "./annuaire-geo-network-panels";
import {
  buildGeoNetworkEntities,
  getIncidentGeoRelations,
  type MapScope,
} from "./annuaire-geo-network.model";
import type { AnnuaireLogic } from "./use-annuaire-logic";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField } from "@/components/ui/cmm-field";

const AnnuaireMapCanvas = dynamic(
  () => import("./annuaire-map-canvas").then((module) => module.AnnuaireMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[62vh] min-h-[420px] w-full items-center justify-center rounded-2xl border border-[var(--cmm-surface-border)] text-sm cmm-text-secondary">
        Chargement de la carte...
      </div>
    ),
  },
);

export type AnnuaireExplorationMode = "directory" | "map";

type AnnuaireExplorationViewProps = {
  logic: AnnuaireLogic;
  fr?: boolean;
  /** `directory` : recherche + grille ; `map` : carte relationnelle unifiée + résultats compacts + hors Paris. */
  mode?: AnnuaireExplorationMode;
  selectedActorId: string | null;
  onSelectedActorIdChange: (id: string | null) => void;
  /** Localiser depuis la liste : bascule vers la vue Carte & réseau avec la sélection. */
  onLocateActor?: (id: string) => void;
};

export function AnnuaireExplorationView({
  logic,
  fr: externalFr,
  mode = "directory",
  selectedActorId,
  onSelectedActorIdChange,
  onLocateActor,
}: AnnuaireExplorationViewProps) {
  const [showRelationsLayer, setShowRelationsLayer] = useState(true);
  const [mapScope, setMapScope] = useState<MapScope>("paris");

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
    enrichedEntries,
    sortedAndFilteredEntries,
    totalPages,
    paginatedEntries,
    locale,
  } = logic;

  const fr = externalFr ?? locale === "fr";
  const count = sortedAndFilteredEntries.length;
  const locate = onLocateActor ?? onSelectedActorIdChange;
  const hasActiveFilter =
    searchTerm !== "" ||
    filterKind !== "all" ||
    filterContribution !== "all" ||
    engagementDomain !== "all" ||
    zoneFilter !== "all";

  const geoEntities = useMemo(
    () =>
      mode === "map"
        ? buildGeoNetworkEntities(
            sortedAndFilteredEntries,
            enrichedEntries ?? sortedAndFilteredEntries,
            !hasActiveFilter,
          )
        : [],
    [mode, sortedAndFilteredEntries, enrichedEntries, hasActiveFilter],
  );

  const incidentRelations = useMemo(
    () => (mode === "map" ? getIncidentGeoRelations(selectedActorId, geoEntities) : []),
    [mode, selectedActorId, geoEntities],
  );

  const selectedEntity = useMemo(
    () =>
      geoEntities.find(
        (entity) => entity.id === selectedActorId || entity.networkActorId === selectedActorId,
      ) ?? null,
    [geoEntities, selectedActorId],
  );

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
          onOpenProfile={onSelectedActorIdChange}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label={fr ? "Périmètre de la carte" : "Map scope"}
                className="flex items-center gap-1 rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-1"
              >
                <CmmButton
                  type="button"
                  size="sm"
                  onClick={() => setMapScope("paris")}
                  tone={mapScope === "paris" ? "primary" : "tertiary"}
                  variant="pill"
                  ariaPressed={mapScope === "paris"}
                >
                  {fr ? "Paris intramuros" : "Paris intramuros"}
                </CmmButton>
                <CmmButton
                  type="button"
                  size="sm"
                  onClick={() => setMapScope("national")}
                  tone={mapScope === "national" ? "primary" : "tertiary"}
                  variant="pill"
                  ariaPressed={mapScope === "national"}
                >
                  {fr ? "National (France métropolitaine)" : "National (Mainland France)"}
                </CmmButton>
              </div>
              <CmmButton
                type="button"
                onClick={() => setShowRelationsLayer((value) => !value)}
                tone={showRelationsLayer ? "primary" : "tertiary"}
                variant="pill"
                ariaPressed={showRelationsLayer}
              >
                <Share2 size={16} className="mr-2" aria-hidden="true" />
                {fr ? "Relations documentées" : "Documented relationships"}
              </CmmButton>
            </div>
            <p className="text-xs cmm-text-secondary">
              {fr
                ? "Sélectionnez une structure pour afficher ses relations documentées (jamais une similarité par tags)."
                : "Select a structure to display its documented relationships."}
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <AnnuaireMapCanvas
              entities={geoEntities}
              incidentRelations={incidentRelations}
              showRelationsLayer={showRelationsLayer}
              mapScope={mapScope}
              variant="exploration"
              onItemClick={onSelectedActorIdChange}
              highlightedItemId={selectedEntity?.id ?? selectedActorId}
              fr={fr}
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

          <AnnuaireIncidentRelationsPanel
            fr={fr}
            selectedEntity={selectedEntity}
            incidentRelations={incidentRelations}
            onSelectEntity={onSelectedActorIdChange}
          />

          <AnnuaireOutsideAndUnknownPanels
            fr={fr}
            entities={geoEntities}
            selectedId={selectedEntity?.id ?? selectedActorId}
            onSelectEntity={onSelectedActorIdChange}
          />
        </div>
      )}
    </div>
  );
}
