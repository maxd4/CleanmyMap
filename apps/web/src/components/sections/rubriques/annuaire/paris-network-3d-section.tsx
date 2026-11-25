"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ReactNode,
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
import { cn } from "@/lib/utils";
import { ParisNetwork3DBubble } from "./paris-network-3d-bubble";
import { getScheduledOperation } from "@/lib/partners/paris-cleanwalk-network.scheduled";
import { ScheduledOperationPanel } from "./paris-network-scheduled-operation";
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

export function ParisNetwork3DSection({
  fr: externalFr,
  onTerritoryChange,
  active = true,
}: {
  fr?: boolean;
  onTerritoryChange?: (territoryId: string) => void;
  active?: boolean;
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
  const [bubbleAnchor, setBubbleAnchor] = useState<{
    leftPercent: number;
    topPercent: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "html">("3d");
  const [webglRuntimeError, setWebglRuntimeError] = useState<boolean>(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState<boolean>(false);
  const [isOffscreen, setIsOffscreen] = useState<boolean>(false);

  const clientWebglSupported = useSyncExternalStore(
    () => () => {},
    detectWebGLSupport,
    () => true,
  );
  const webglAvailable = clientWebglSupported && !webglRuntimeError;

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
    setSelectedActorId(actorId);
  }, [cancelHoverClose]);

  const handleSelectRelation = useCallback((id: string) => {
    cancelHoverClose(); setSelectedActorId(null); setHoveredActorId(null); setSelectedRelationId(id);
  }, [cancelHoverClose]);

  const handleCloseBubble = useCallback(() => {
    cancelHoverClose();
    setSelectedRelationId(null);
    setSelectedActorId(null);
    setHoveredActorId(null);
  }, [cancelHoverClose]);

  useEffect(() => {
    return () => cancelHoverClose();
  }, [cancelHoverClose]);

  useEffect(() => {
    if (!selectedActorId && !hoveredActorId && !selectedRelationId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseBubble();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedActorId, hoveredActorId, selectedRelationId, handleCloseBubble]);

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

  const gpsAvailable = canRequestGeolocation();

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

  const layout = useMemo(
    () => computeParisNetwork3DLayout(filtered.actors, filtered.relations),
    [filtered.actors, filtered.relations],
  );

  const activeActorId = selectedActorId ?? hoveredActorId;
  const activeActor = useMemo(
    () =>
      filtered.actors.find((actor) => actor.id === activeActorId) ?? null,
    [filtered.actors, activeActorId],
  );

  const selectedRelation = filtered.relations.find(r => r.id === selectedRelationId);
  const selectedOperation = selectedRelation?.relationType === "collaboration_programmee" ? getScheduledOperation(selectedRelation.operationId) : undefined;
  const show3DCanvas = sceneActive && webglAvailable && viewMode === "3d";
  const surfaceClassName = cn(
    "relative overflow-hidden rounded-[var(--radius-lg)] border border-violet-300/18 p-6 md:p-8",
    displayMode === "sobre"
      ? "bg-slate-950"
      : displayMode === "minimaliste"
        ? "bg-slate-900/90 shadow-lg"
        : "bg-slate-900/50 shadow-[0_0_90px_rgba(99,102,241,0.12)] backdrop-blur-3xl",
  );

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
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-1 text-xs font-black uppercase tracking-[0.25em] text-violet-300">
              <Box size={13} aria-hidden="true" />
              {territoryDataset
                ? fr
                  ? territoryDataset.pilotLabelFr
                  : territoryDataset.pilotLabelEn
                : `${selectedTerritory.code} — ${fr ? selectedTerritory.nameFr : selectedTerritory.nameEn}`}
            </div>
            <h2
              id="paris-network-3d-heading"
              className="text-3xl font-black tracking-tight text-white md:text-4xl"
            >
              {territoryDataset
                ? fr
                  ? "Réseau 3D des cleanwalks à Paris"
                  : "3D network of Paris cleanwalks"
                : fr
                  ? `Réseau territorial — ${selectedTerritory.nameFr}`
                  : `Territorial network — ${selectedTerritory.nameEn}`}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-300">
              {territoryDataset
                ? fr
                  ? "Survolez, cliquez ou naviguez au clavier sur un nom d'acteur pour afficher ses canaux publics et ses liens vérifiés."
                  : "Hover, click or navigate by keyboard on an actor name to display its public channels and verified links."
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
                    ariaLabel={fr ? "Recentrer la caméra 3D" : "Recenter 3D camera"}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Maximize2 size={14} aria-hidden="true" />
                    <span>{fr ? "Recentrer" : "Recenter"}</span>
                  </CmmButton>
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
                        ? "Vue HTML"
                        : "HTML view"
                      : fr
                        ? "Vue 3D"
                        : "3D view"}
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
            <ParisNetwork3DFiltersBar
              filters={filters}
              onChange={next => { setSelectedRelationId(null); setFilters(next); }}
              actorCount={filtered.actors.length}
              relationCount={filtered.relations.length}
              fr={fr}
            />

            <div className="relative h-[500px] w-full min-w-0 overflow-hidden rounded-2xl border border-violet-300/20 bg-slate-950/90 sm:h-[580px]">
          {sceneActive && (show3DCanvas ? (
            hasEnteredViewport ? (
              <WebGLErrorBoundary
                onError={() => setWebglRuntimeError(true)}
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
                  hoveredActorId={hoveredActorId}
                  onSelectActor={handleSelectActor}
                  onSelectRelation={handleSelectRelation}
                  onHoverActor={handleHoverActor}
                  fr={fr}
                  onAnchorChange={setBubbleAnchor}
                  animateMotion={animateMotion}
                  isOffscreen={isOffscreen}
                  onWebGLError={() => setWebglRuntimeError(true)}
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

          {selectedOperation ? <ScheduledOperationPanel operation={selectedOperation} onClose={handleCloseBubble} fr={fr}/> : null}
          {activeActor && !selectedOperation ? (
            <ParisNetwork3DBubble
              actor={activeActor}
              isLocked={selectedActorId === activeActor.id}
              anchorPosition={
                show3DCanvas && bubbleAnchor
                  ? bubbleAnchor
                  : { leftPercent: 52, topPercent: 10 }
              }
              onClose={handleCloseBubble}
              onMouseEnter={cancelHoverClose}
              onMouseLeave={() => {
                if (!selectedActorId) {
                  handleHoverActor(null);
                }
              }}
              fr={fr}
            />
          ) : null}
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
