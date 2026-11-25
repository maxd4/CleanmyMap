"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useUser } from "@clerk/nextjs";
import { Box, Eye, MapPinOff, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import type { GeodesicCoordinate } from "@/lib/geo/geodesic-distance";
import {
  DEFAULT_TERRITORY_ID,
  getTerritoryNetworkDataset,
  type TerritoryEntry,
} from "@/lib/partners/territory-network-catalog";
import { TERRITORY_NETWORK_CATALOG } from "@/lib/partners/territory-network-catalog.data";
import { rankTerritoriesByContext } from "@/lib/partners/territory-network-ranking";
import { extractLocationPreferencesFromMetadata } from "@/lib/user-location-preference";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { ParisNetworkActorSearch } from "./paris-network-actor-search";
import { ParisNetworkSelectionPanel } from "./paris-network-selection-panel";
import type { ParisNetwork3DCanvasHandle } from "./paris-network-3d-canvas";
import { ParisNetwork3DFallback } from "./paris-network-3d-fallback";
import { ParisNetwork3DFiltersBar } from "./paris-network-3d-filters";
import { ParisNetwork3DLegend } from "./paris-network-3d-legend";
import { TerritoryNetworkCombobox } from "./territory-network-combobox";
import {
  DEFAULT_PARIS_NETWORK_3D_FILTERS,
  computeParisNetwork3DLayout,
  detectWebGLSupport,
  filterParisNetwork,
  projectParisNetwork3DLayout,
  type ParisNetwork3DFilters,
} from "./paris-network-3d.model";

const DynamicParisNetwork3DCanvas = dynamic(
  () =>
    import("./paris-network-3d-canvas").then(
      (module) => module.ParisNetwork3DCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950/80 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
        Chargement de la scène 3D...
      </div>
    ),
  },
);

class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export type ParisNetworkNavigation = { openActor: (id: string) => boolean };

export function ParisNetwork3DSection({
  fr: externalFr,
  onTerritoryChange,
  active = true,
  navigationRef,
  getInstitutionId,
  onOpenInstitution,
}: {
  fr?: boolean;
  onTerritoryChange?: (territoryId: string) => void;
  active?: boolean;
  navigationRef?: Ref<ParisNetworkNavigation>;
  getInstitutionId?: (actorId: string) => string | null;
  onOpenInstitution?: (institutionId: string) => void;
}) {
  const { locale, displayMode } = useSitePreferences();
  const fr = externalFr ?? locale === "fr";
  const [sceneActive, setSceneActive] = useState(active);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setSceneActive(active));
    return () => window.cancelAnimationFrame(frame);
  }, [active]);
  const reducedMotion = useReducedMotion() === true;
  const animateMotion = !reducedMotion && displayMode !== "sobre";
  const { user } = useUser();

  const [selectedTerritoryId, setSelectedTerritoryId] =
    useState<string>(DEFAULT_TERRITORY_ID);
  const manualSelectionRef = useRef(false);
  const [gpsCoords, setGpsCoords] = useState<GeodesicCoordinate | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ParisNetwork3DFilters>(
    DEFAULT_PARIS_NETWORK_3D_FILTERS,
  );
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [hoveredActorId, setHoveredActorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "html">("html");
  const [focusOnly, setFocusOnly] = useState(false);
  const [webglRuntimeError, setWebglRuntimeError] = useState<boolean>(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState<boolean>(false);
  const [isOffscreen, setIsOffscreen] = useState<boolean>(false);

  const [getClientWebglSupport] = useState(() => {
    let supported: boolean | undefined;
    return () => {
      supported ??= detectWebGLSupport();
      return supported;
    };
  });
  const clientWebglSupported = useSyncExternalStore(
    () => () => {},
    active ? getClientWebglSupport : () => false,
    () => true,
  );
  const webglAvailable = clientWebglSupported && !webglRuntimeError;

  const handleWebGLError = useCallback(() => setWebglRuntimeError(true), []);
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasHandleRef = useRef<ParisNetwork3DCanvasHandle | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const handleHoverActor = useCallback(
    (actorId: string | null) => {
      cancelHoverClose();
      if (actorId !== null) {
        setHoveredActorId(actorId);
        return;
      }
      hoverCloseTimerRef.current = setTimeout(() => {
        setHoveredActorId(null);
      }, 180);
    },
    [cancelHoverClose],
  );

  const handleSelectActor = useCallback((actorId: string) => {
    cancelHoverClose();
    setSelectedRelationId(null);
    setHoveredActorId(null);
    setSelectedActorId(actorId);
  }, [cancelHoverClose]);

  const handleSelectRelation = useCallback((id: string) => {
    cancelHoverClose(); setSelectedActorId(null); setHoveredActorId(null); setSelectedRelationId(id); setFocusOnly(false);
  }, [cancelHoverClose]);

  const handleCloseBubble = useCallback(() => {
    cancelHoverClose();
    setSelectedRelationId(null);
    setSelectedActorId(null);
    setHoveredActorId(null);
    setFocusOnly(false);
  }, [cancelHoverClose]);

  useEffect(() => {
    return () => cancelHoverClose();
  }, [cancelHoverClose]);

  useEffect(() => {
    if (!active || (!selectedActorId && !hoveredActorId && !selectedRelationId)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseBubble();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, selectedActorId, hoveredActorId, selectedRelationId, handleCloseBubble]);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setHasEnteredViewport(true);
      setIsOffscreen(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setHasEnteredViewport(true);
          setIsOffscreen(false);
        } else {
          setIsOffscreen(true);
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const gpsAvailable = useSyncExternalStore(
    () => () => {},
    () => canRequestGeolocation(),
    () => false,
  );

  useEffect(() => {
    if (!gpsAvailable || typeof navigator === "undefined" || !navigator.permissions?.query) {
      return;
    }
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (cancelled || status.state !== "granted") {
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!cancelled) {
              setGpsCoords([position.coords.latitude, position.coords.longitude]);
            }
          },
          () => undefined,
          { timeout: 6000, maximumAge: 300_000 },
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gpsAvailable]);

  const handleRequestGps = useCallback(() => {
    if (!gpsAvailable || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const coords: GeodesicCoordinate = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setGpsCoords(coords);
        if (!manualSelectionRef.current) {
          const nextRanked = rankTerritoriesByContext({ gpsCoords: coords });
          setSelectedTerritoryId(nextRanked.suggestions[0].id);
          onTerritoryChange?.(nextRanked.suggestions[0].id);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsError(
          fr
            ? "Position GPS indisponible ou refusée ; classement contextuel conservé."
            : "GPS location unavailable or denied; contextual ranking preserved.",
        );
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, [fr, gpsAvailable, onTerritoryChange]);

  const handleSelectTerritory = useCallback(
    (territory: TerritoryEntry) => {
      manualSelectionRef.current = true;
      setSelectedTerritoryId(territory.id);
      setSelectedRelationId(null);
      setSelectedActorId(null);
      setHoveredActorId(null);
      setFocusOnly(false);
      onTerritoryChange?.(territory.id);
    },
    [onTerritoryChange],
  );

  const locationPreferences = useMemo(
    () => extractLocationPreferencesFromMetadata(user?.unsafeMetadata),
    [user?.unsafeMetadata],
  );

  const ranked = useMemo(
    () =>
      rankTerritoriesByContext({
        gpsCoords,
        locationPreferences,
      }),
    [gpsCoords, locationPreferences],
  );

  const selectedTerritory = useMemo(
    () =>
      TERRITORY_NETWORK_CATALOG.find((item) => item.id === selectedTerritoryId) ??
      TERRITORY_NETWORK_CATALOG.find((item) => item.id === DEFAULT_TERRITORY_ID)!,
    [selectedTerritoryId],
  );

  const territoryDataset = useMemo(
    () => getTerritoryNetworkDataset(selectedTerritory.id),
    [selectedTerritory.id],
  );

  const filtered = useMemo(() => {
    if (!territoryDataset) {
      return { actors: [], relations: [] };
    }
    return filterParisNetwork(
      territoryDataset.actors,
      territoryDataset.relations,
      filters,
    );
  }, [filters, territoryDataset]);

  const handleFiltersChange = (next: ParisNetwork3DFilters) => {
    const nextFiltered = territoryDataset
      ? filterParisNetwork(territoryDataset.actors, territoryDataset.relations, next)
      : { actors: [], relations: [] };
    const visibleActorIds = new Set(nextFiltered.actors.map(actor => actor.id));
    const visibleRelationIds = new Set(nextFiltered.relations.map(relation => relation.id));
    cancelHoverClose();
    setHoveredActorId(null);
    if (selectedActorId && !visibleActorIds.has(selectedActorId)) {
      setSelectedActorId(null);
      setFocusOnly(false);
    }
    if (selectedRelationId && !visibleRelationIds.has(selectedRelationId)) {
      setSelectedRelationId(null);
    }
    setFilters(next);
  };

  const fullLayout = useMemo(
    () => computeParisNetwork3DLayout(territoryDataset?.actors ?? [], territoryDataset?.relations ?? []),
    [territoryDataset],
  );
  const layout = useMemo(
    () => projectParisNetwork3DLayout(fullLayout, filtered.actors, filtered.relations),
    [fullLayout, filtered.actors, filtered.relations],
  );

  const revealActor = (id: string) => {
    if (!territoryDataset?.actors.some(actor => actor.id === id)) return;
    if (!filtered.actors.some(actor => actor.id === id)) setFilters(DEFAULT_PARIS_NETWORK_3D_FILTERS);
    handleSelectActor(id);
  };
  const revealRelation = (id: string) => {
    if (!territoryDataset?.relations.some(relation => relation.id === id)) return;
    if (!filtered.relations.some(relation => relation.id === id)) setFilters(DEFAULT_PARIS_NETWORK_3D_FILTERS);
    handleSelectRelation(id);
  };

  useImperativeHandle(navigationRef, () => ({
    openActor(id) {
      const parisDataset = getTerritoryNetworkDataset(DEFAULT_TERRITORY_ID);
      if (!parisDataset?.actors.some(actor => actor.id === id)) return false;
      if (selectedTerritoryId !== DEFAULT_TERRITORY_ID) {
        handleSelectTerritory(TERRITORY_NETWORK_CATALOG.find(item => item.id === DEFAULT_TERRITORY_ID)!);
        setFilters(DEFAULT_PARIS_NETWORK_3D_FILTERS);
        handleSelectActor(id);
      } else {
        revealActor(id);
      }
      return true;
    },
  }));

  const activeActorId = selectedActorId ?? hoveredActorId;
  const activeActor = useMemo(
    () =>
      filtered.actors.find((actor) => actor.id === activeActorId) ?? null,
    [filtered.actors, activeActorId],
  );

  const selectedRelation = filtered.relations.find(r => r.id === selectedRelationId);
  const selectedActor = filtered.actors.find(actor => actor.id === selectedActorId) ?? null;
  const linkedInstitutionId = selectedActor ? getInstitutionId?.(selectedActor.id) : null;
  const show3DCanvas = sceneActive && webglAvailable && viewMode === "3d";
  const surfaceClassName = "cmm-surface cmm-panel relative min-w-0 p-4 md:p-6";

  return (
    <section
      ref={sectionRef}
      id="paris-cleanwalk-network-3d"
      aria-labelledby="paris-network-3d-heading"
      className={surfaceClassName}
    >
      <CmmSectionGroup>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1 text-sm font-semibold cmm-text-primary">
              <Box size={13} aria-hidden="true" />
              {territoryDataset
                ? fr
                  ? territoryDataset.pilotLabelFr
                  : territoryDataset.pilotLabelEn
                : `${selectedTerritory.code} — ${fr ? selectedTerritory.nameFr : selectedTerritory.nameEn}`}
            </div>
            <h2
              id="paris-network-3d-heading"
              className="cmm-text-h2 cmm-text-primary"
            >
              {territoryDataset
                ? fr
                  ? "Réseau 3D des cleanwalks à Paris"
                  : "3D network of Paris cleanwalks"
                : fr
                  ? `Réseau territorial — ${selectedTerritory.nameFr}`
                  : `Territorial network — ${selectedTerritory.nameEn}`}
            </h2>
            <p className="cmm-text-body cmm-text-primary">
              {territoryDataset
                ? fr
                  ? "Recherchez ou sélectionnez un acteur pour consulter sa fiche et ses relations documentées."
                  : "Find or select an actor to explore its profile and documented relationships."
                : fr
                  ? "Sélectionnez un territoire pour consulter son réseau d'acteurs sourcé lorsqu'il est disponible."
                  : "Select a territory to explore its sourced actor network when available."}
            </p>
          </div>

          {territoryDataset ? (
            <div className="flex flex-wrap items-center gap-2">
              {show3DCanvas && hasEnteredViewport ? (
                <>
                  <CmmButton
                    type="button"
                    tone="tertiary"
                    variant="pill"
                    size="sm"
                    onClick={() => canvasHandleRef.current?.zoomIn()}
                    ariaLabel={fr ? "Zoomer sur la scène 3D" : "Zoom in 3D scene"}
                    className="inline-flex items-center gap-1.5"
                  >
                    <ZoomIn size={14} aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Zoom +</span>
                  </CmmButton>
                  <CmmButton
                    type="button"
                    tone="tertiary"
                    variant="pill"
                    size="sm"
                    onClick={() => canvasHandleRef.current?.zoomOut()}
                    ariaLabel={fr ? "Dézoomer la scène 3D" : "Zoom out 3D scene"}
                    className="inline-flex items-center gap-1.5"
                  >
                    <ZoomOut size={14} aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Zoom -</span>
                  </CmmButton>
                  <CmmButton
                    type="button"
                    tone="tertiary"
                    variant="pill"
                    size="sm"
                    onClick={() => canvasHandleRef.current?.resetCamera()}
                    ariaLabel={fr ? "Cadrer le réseau 3D" : "Fit 3D network"}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Maximize2 size={14} aria-hidden="true" />
                    <span>{fr ? "Cadrer le réseau" : "Fit network"}</span>
                  </CmmButton>
                  {selectedActorId ? <>
                    <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => canvasHandleRef.current?.focusSelection()}>
                      {fr ? "Centrer la sélection" : "Focus selection"}
                    </CmmButton>
                    <button type="button" aria-pressed={focusOnly} onClick={() => setFocusOnly(value => !value)} className="cmm-surface rounded-lg px-3 py-2 text-sm font-semibold cmm-text-primary focus-visible:ring-2 focus-visible:ring-violet-500">
                      {focusOnly ? (fr ? "Réseau complet" : "Full network") : (fr ? "Isoler les voisins" : "Isolate neighbors")}
                    </button>
                  </> : null}
                </>
              ) : null}

              {webglAvailable ? (
                <CmmButton
                  type="button"
                  tone={viewMode === "html" ? "important" : "secondary"}
                  variant="pill"
                  size="sm"
                  onClick={() =>
                    setViewMode((prev) => (prev === "3d" ? "html" : "3d"))
                  }
                  ariaLabel={
                    viewMode === "3d"
                      ? fr
                        ? "Basculer vers la vue HTML accessible"
                        : "Switch to accessible HTML view"
                      : fr
                        ? "Basculer vers la scène 3D WebGL"
                        : "Switch to WebGL 3D scene"
                  }
                  className="inline-flex items-center gap-1.5"
                >
                  <Eye size={14} aria-hidden="true" />
                  <span>
                    {viewMode === "3d"
                      ? fr
                        ? "Vue guidée"
                        : "Guided view"
                      : fr
                        ? "Explorer en 3D"
                        : "Explore in 3D"}
                  </span>
                </CmmButton>
              ) : null}
            </div>
          ) : null}
        </div>

        <TerritoryNetworkCombobox
          fr={fr}
          selectedTerritory={selectedTerritory}
          ranked={ranked}
          gpsAvailable={gpsAvailable}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          onSelectTerritory={handleSelectTerritory}
          onRequestGps={handleRequestGps}
        />

        {territoryDataset ? (
          <>
            <ParisNetworkActorSearch actors={territoryDataset.actors} fr={fr} onSelectActor={revealActor} />
            <ParisNetwork3DFiltersBar
              filters={filters}
              onChange={handleFiltersChange}
              actorCount={filtered.actors.length}
              relationCount={filtered.relations.length}
              fr={fr}
            />

            {show3DCanvas ? <p className="cmm-text-small cmm-text-secondary">
              {fr ? "Glisser pour tourner, clic droit ou deux doigts pour déplacer, molette ou pincement pour zoomer. Survolez un acteur pour lire son nom, sélectionnez-le pour ses relations. La vue guidée permet une navigation complète au clavier." : "Drag to rotate, right-drag or two fingers to pan, scroll or pinch to zoom. Hover an actor to read its name, select it for relationships. The guided view supports full keyboard navigation."}
            </p> : null}
            {show3DCanvas && focusOnly && selectedActorId ? <p role="status" className="cmm-text-small cmm-text-secondary">{fr ? "Scène limitée à la sélection et ses voisins dans les filtres actifs." : "Scene limited to the selection and its neighbors within active filters."}</p> : null}
            <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,32%)]">
            <div className="relative h-[clamp(26rem,65vh,52rem)] w-full min-w-0 overflow-hidden rounded-2xl border border-violet-300/25 bg-slate-950">
          {sceneActive && (show3DCanvas ? (
            hasEnteredViewport ? (
              <WebGLErrorBoundary
                onError={handleWebGLError}
                fallback={
                  <ParisNetwork3DFallback
                    actors={filtered.actors}
                    relations={filtered.relations}
                    selectedActorId={selectedActorId}
                    hoveredActorId={hoveredActorId}
                    onSelectActor={handleSelectActor}
                  onSelectRelation={handleSelectRelation}
                    onHoverActor={handleHoverActor}
                    reason="webgl_unavailable"
                    fr={fr}
                  />
                }
              >
                <DynamicParisNetwork3DCanvas
                  ref={canvasHandleRef}
                  nodes={layout.nodes}
                  edges={layout.edges}
                  relations={filtered.relations}
                  selectedActorId={selectedActorId}
                  focusOnly={focusOnly}
                  hoveredActorId={hoveredActorId}
                  onSelectActor={handleSelectActor}
                  onSelectRelation={handleSelectRelation}
                  onHoverActor={handleHoverActor}
                  fr={fr}
                  animateMotion={animateMotion}
                  isOffscreen={isOffscreen}
                  onWebGLError={handleWebGLError}
                />
              </WebGLErrorBoundary>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-violet-300">
                  {fr
                    ? "Scène 3D prête à être chargée"
                    : "3D scene ready to load"}
                </p>
                <CmmButton
                  type="button"
                  tone="important"
                  variant="pill"
                  size="sm"
                  onClick={() => setHasEnteredViewport(true)}
                >
                  {fr ? "Charger la scène 3D" : "Load 3D scene"}
                </CmmButton>
              </div>
            )
          ) : (
            <ParisNetwork3DFallback
              actors={filtered.actors}
              relations={filtered.relations}
              selectedActorId={selectedActorId}
              hoveredActorId={hoveredActorId}
              onSelectActor={handleSelectActor}
                  onSelectRelation={handleSelectRelation}
              onHoverActor={handleHoverActor}
              reason={webglAvailable ? "user_selected" : "webgl_unavailable"}
              fr={fr}
            />
          ))}

          {activeActor && !selectedActorId && !selectedRelation ? (
            <div data-testid="paris-network-hover-preview" aria-hidden="true" className="pointer-events-none absolute inset-x-3 bottom-3 z-20 rounded-lg border border-violet-300/30 bg-slate-950/95 p-2 text-xs text-slate-200">
              <strong className="block text-white">{activeActor.name}</strong>
              {activeActor.parisZone.label}
            </div>
          ) : null}
        </div>
            <aside className="min-w-0 rounded-2xl border border-violet-300/25 bg-slate-950 p-3 xl:max-h-[clamp(26rem,65vh,52rem)] xl:overflow-y-auto" aria-label={fr ? "Fiche et relations" : "Profile and relationships"}>
              <ParisNetworkSelectionPanel
                actor={selectedActor}
                relation={selectedRelation}
                actors={territoryDataset.actors}
                relations={territoryDataset.relations}
                fr={fr}
                onSelectActor={revealActor}
                onSelectRelation={revealRelation}
                onClose={handleCloseBubble}
                onOpenInstitution={linkedInstitutionId && onOpenInstitution ? () => onOpenInstitution(linkedInstitutionId) : undefined}
              />
            </aside>
            </div>
            <ParisNetwork3DLegend fr={fr} />
          </>
        ) : (
          <div
            role="status"
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-slate-950/75 p-8 text-center"
          >
            <MapPinOff size={28} className="text-violet-300" aria-hidden="true" />
            <p className="text-base font-black text-white">
              {fr
                ? "Réseau de ce territoire pas encore renseigné"
                : "Network for this territory not yet documented"}
            </p>
            <p className="max-w-lg text-xs leading-relaxed text-slate-300">
              {fr
                ? `Territoire sélectionné : ${selectedTerritory.code} — ${selectedTerritory.nameFr}. Aucun acteur, relation ou métrique n'est généré tant qu'une source vérifiée n'est pas intégrée.`
                : `Selected territory: ${selectedTerritory.code} — ${selectedTerritory.nameEn}. No actor, relation or metric is generated until a verified source is integrated.`}
            </p>
          </div>
        )}
      </CmmSectionGroup>
    </section>
  );
}
