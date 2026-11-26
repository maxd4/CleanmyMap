import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { matchesNetworkOnlyFilters } from "./annuaire-network-only-filters";
import { PublicEntityDetails } from "./public-entity-details";
import { getNetworkNeighbourhood } from "./annuaire-graph-interactions";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { ACTOR_CARDS_PAGE_SIZE } from "./annuaire-filters";
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
  getAllGeoRelations,
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

const AnnuaireMap3DCanvas = dynamic(() => import("./annuaire-map-3d-canvas").then(module => module.AnnuaireMap3DCanvas), { ssr: false });

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
  onOpenInstitution?: (id: string) => void;
};

export function AnnuaireExplorationView({
  logic,
  fr: externalFr,
  mode = "directory",
  selectedActorId,
  onSelectedActorIdChange,
  onLocateActor,
  onOpenInstitution,
}: AnnuaireExplorationViewProps) {
  const [showRelationsLayer, setShowRelationsLayer] = useState(true);
  const [relationMode, setRelationMode] = useState<"all" | "selection">("all");
  const [neighbourDepth,setNeighbourDepth]=useState<0|1|2>(0);
  const [selectedRelationId,setSelectedRelationId]=useState<string|null>(null);
  const [mapMode, setMapMode] = useState<"3d" | "2d">("3d");
  const [webglUnavailable, setWebglUnavailable] = useState(false);
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
  const locate = onLocateActor ?? onSelectedActorIdChange;
  const allGeoEntities = useMemo(() => mode === "map" ? buildGeoNetworkEntities(enrichedEntries ?? sortedAndFilteredEntries, enrichedEntries ?? sortedAndFilteredEntries, true) : [], [mode, enrichedEntries, sortedAndFilteredEntries]);
  const geoEntities = useMemo(() => {
    if (mode !== "map") return [];
    const visible = new Set(sortedAndFilteredEntries.map(entry => entry.id));
    return allGeoEntities.filter(entity => entity.entry ? visible.has(entity.id) : matchesNetworkOnlyFilters(entity, { searchTerm, filterKind, filterContribution, engagementDomain, zoneFilter, targetArrondissement }));
  }, [mode, allGeoEntities, sortedAndFilteredEntries, searchTerm, filterKind, filterContribution, engagementDomain, zoneFilter, targetArrondissement]);
  const count = mode === "map" ? geoEntities.length : sortedAndFilteredEntries.length;
  const mapTotalPages = Math.ceil(geoEntities.length / ACTOR_CARDS_PAGE_SIZE);
  const mapPage = Math.min(actorCardsPage, Math.max(1, mapTotalPages));
  const mapPageEntities = geoEntities.slice((mapPage - 1) * ACTOR_CARDS_PAGE_SIZE, mapPage * ACTOR_CARDS_PAGE_SIZE);

  const incidentRelations = useMemo(
    () => (mode === "map" ? getIncidentGeoRelations(selectedActorId, allGeoEntities) : []),
    [mode, selectedActorId, allGeoEntities],
  );

  const displayedRelations = useMemo(() => !showRelationsLayer ? [] : relationMode === "all" ? getAllGeoRelations(geoEntities) : incidentRelations, [showRelationsLayer, relationMode, geoEntities, incidentRelations]);

  const selectedEntity = useMemo(
    () =>
      allGeoEntities.find(
        (entity) => entity.id === selectedActorId || entity.networkActorId === selectedActorId,
      ) ?? null,
    [allGeoEntities, selectedActorId],
  );

  const canonicalDetails=selectedEntity ? projectPublicEntity(
    selectedEntity.networkActorId ? {networkActorId:selectedEntity.networkActorId} : {annuaireEntryId:selectedEntity.annuaireEntryId},
    selectedEntity.entry?.provenance==="published_partner"?selectedEntity.entry:undefined,
  ) : null;
  const institutionalId=canonicalDetails?.identity.institutionId;
  const neighbourIds=selectedEntity&&neighbourDepth?getNetworkNeighbourhood(selectedEntity.id,getAllGeoRelations(allGeoEntities),neighbourDepth):null;
  const mappedEntities=neighbourIds?allGeoEntities.filter(entity=>neighbourIds.has(entity.id)):geoEntities;
  const mappedRelations=neighbourIds&&showRelationsLayer?getAllGeoRelations(mappedEntities).filter(edge=>relationMode==="all"||edge.fromEntity.id===selectedEntity?.id||edge.toEntity.id===selectedEntity?.id):displayedRelations;
  const selectRelation=(id:string)=>{const edge=getAllGeoRelations(allGeoEntities).find(item=>item.relation.id===id);if(!edge)return;onSelectedActorIdChange(edge.fromEntity.id);setSelectedRelationId(id);};
  return (
    <div className="flex min-w-0 w-full flex-col gap-4">
      <CmmCard tone="family" variant="default" className="min-w-0 space-y-4">
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
              <div role="group" aria-label={fr ? "Perspective cartographique" : "Map perspective"} className="flex gap-1">
                <CmmButton type="button" size="sm" tone={mapMode === "3d" && !webglUnavailable ? "primary" : "tertiary"} ariaPressed={mapMode === "3d" && !webglUnavailable} onClick={() => { setWebglUnavailable(false); setMapMode("3d"); }}>3D</CmmButton>
                <CmmButton type="button" size="sm" tone={mapMode === "2d" || webglUnavailable ? "primary" : "tertiary"} ariaPressed={mapMode === "2d" || webglUnavailable} onClick={() => setMapMode("2d")}>2D</CmmButton>
              </div>
              <label className="text-xs cmm-text-primary">{fr?"Voisinage":"Neighbourhood"} <select className="cmm-input" disabled={!selectedEntity} value={neighbourDepth} onChange={event=>setNeighbourDepth(Number(event.target.value) as 0|1|2)}><option value={0}>{fr?"Tous":"All"}</option><option value={1}>1</option><option value={2}>2</option></select></label>
              <label className="text-xs cmm-text-primary">{fr ? "Liaisons" : "Links"} <select className="cmm-input" value={relationMode} onChange={event => setRelationMode(event.target.value as typeof relationMode)}><option value="all">{fr ? "Toutes" : "All"}</option><option value="selection">{fr ? "Sélection" : "Selection"}</option></select></label>
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
                ? "Taille des logos : nombre de voisins documentés, pas un score d’influence. Les pins indiquent des implantations vérifiées."
                : "Logo size: documented neighbours, not an influence score. Pins indicate verified sites."}
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-2">
            {webglUnavailable ? <p role="status" className="text-xs cmm-text-warning">{fr ? "3D indisponible sur cet appareil. Carte 2D conservée." : "3D unavailable on this device. 2D map retained."}</p> : null}
            {mapMode === "3d" && !webglUnavailable ? <AnnuaireMap3DCanvas entities={mappedEntities} relations={mappedRelations} onSelectRelation={selectRelation} mapScope={mapScope} selectedId={selectedEntity?.id ?? selectedActorId} onSelect={onSelectedActorIdChange} onUnavailable={() => setWebglUnavailable(true)} fr={fr} /> : <AnnuaireMapCanvas
              entities={mappedEntities}
              incidentRelations={mappedRelations}
              showRelationsLayer={showRelationsLayer}
              mapScope={mapScope}
              variant="exploration"
              onItemClick={onSelectedActorIdChange}
              highlightedItemId={selectedEntity?.id ?? selectedActorId}
              fr={fr}
            />}
            </div>
            <AnnuaireCompactResults
              fr={fr}
              entries={paginatedEntries}
              entities={mapPageEntities}
              selectedActorId={selectedEntity?.id ?? selectedActorId}
              currentPage={mapPage}
              totalPages={mapTotalPages}
              onPageChange={setActorCardsPage}
              onSelect={onSelectedActorIdChange}
            />
          </div>

          {selectedEntity ? <div className="flex flex-wrap gap-2">
            {institutionalId && onOpenInstitution ? <CmmButton type="button" tone="secondary" onClick={() => onOpenInstitution(institutionalId)}>{fr ? "Voir dans les services publics" : "View in public services"}</CmmButton> : null}
            {selectedEntity.coords && selectedEntity.locationGroup === "outside_paris" && mapScope === "paris" ? <CmmButton type="button" tone="secondary" onClick={() => setMapScope("national")}>{fr ? "Localiser sur la carte nationale" : "Locate on national map"}</CmmButton> : null}
          </div> : null}
          {canonicalDetails ? <aside aria-label={fr?"Fiche détaillée de la structure":"Detailed entity profile"} className="space-y-3 rounded-2xl border border-[var(--cmm-surface-border)] p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold cmm-text-primary">{canonicalDetails.identity.name}</h3><button type="button" className="underline cmm-text-info" onClick={()=>{onSelectedActorIdChange(null);setSelectedRelationId(null);setNeighbourDepth(0);}}>{fr?"Fermer":"Close"}</button></div>
            <PublicEntityDetails projection={canonicalDetails} fr={fr} selectedRelationId={selectedRelationId} onOpen={ref=>{if(ref.institutionId)onOpenInstitution?.(ref.institutionId);else if(ref.networkActorId)locate(ref.networkActorId);else if(ref.annuaireEntryId)locate(ref.annuaireEntryId);}}/>
          </aside> : <AnnuaireIncidentRelationsPanel
            fr={fr}
            selectedEntity={selectedEntity}
            incidentRelations={incidentRelations}
            onSelectEntity={locate}
          />}

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
