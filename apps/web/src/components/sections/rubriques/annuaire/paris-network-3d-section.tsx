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
import { Box, Eye, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
} from "@/lib/partners/paris-cleanwalk-network";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSectionGroup } from "@/components/ui/cmm-section";
import { cn } from "@/lib/utils";
import { ParisNetwork3DBubble } from "./paris-network-3d-bubble";
import type { ParisNetwork3DCanvasHandle } from "./paris-network-3d-canvas";
import { ParisNetwork3DFallback } from "./paris-network-3d-fallback";
import { ParisNetwork3DFiltersBar } from "./paris-network-3d-filters";
import { ParisNetwork3DLegend } from "./paris-network-3d-legend";
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

export function ParisNetwork3DSection({ fr: externalFr }: { fr?: boolean }) {
  const { locale, displayMode } = useSitePreferences();
  const fr = externalFr ?? locale === "fr";
  const reducedMotion = useReducedMotion() === true;
  const animateMotion = !reducedMotion && displayMode !== "sobre";

  const [filters, setFilters] = useState<ParisNetwork3DFilters>(
    DEFAULT_PARIS_NETWORK_3D_FILTERS,
  );
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
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
    () => detectWebGLSupport(),
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
    setSelectedActorId((prev) => (prev === actorId ? null : actorId));
  }, [cancelHoverClose]);

  const handleCloseBubble = useCallback(() => {
    cancelHoverClose();
    setSelectedActorId(null);
    setHoveredActorId(null);
  }, [cancelHoverClose]);

  useEffect(() => {
    return () => cancelHoverClose();
  }, [cancelHoverClose]);

  useEffect(() => {
    if (!selectedActorId && !hoveredActorId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseBubble();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedActorId, hoveredActorId, handleCloseBubble]);

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

  const filtered = useMemo(
    () =>
      filterParisNetwork(
        PARIS_CLEANWALK_ACTORS,
        PARIS_CLEANWALK_RELATIONS,
        filters,
      ),
    [filters],
  );

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

  const show3DCanvas = webglAvailable && viewMode === "3d";
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
              {fr
                ? "Écosystème Paris intramuros · 3D sourcée"
                : "Paris intramuros ecosystem · Sourced 3D"}
            </div>
            <h2
              id="paris-network-3d-heading"
              className="text-3xl font-black tracking-tight text-white md:text-4xl"
            >
              {fr
                ? "Réseau 3D des cleanwalks à Paris"
                : "3D network of Paris cleanwalks"}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-300">
              {fr
                ? "Survolez, cliquez ou naviguez au clavier sur un nom d'acteur pour afficher ses canaux publics et ses liens vérifiés."
                : "Hover, click or navigate by keyboard on an actor name to display its public channels and verified links."}
            </p>
          </div>

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
        </div>

        <ParisNetwork3DFiltersBar
          filters={filters}
          onChange={setFilters}
          actorCount={filtered.actors.length}
          relationCount={filtered.relations.length}
          fr={fr}
        />

        <div className="relative h-[500px] w-full min-w-0 overflow-hidden rounded-2xl border border-violet-300/20 bg-slate-950/90 sm:h-[580px]">
          {show3DCanvas ? (
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
                  onHoverActor={handleHoverActor}
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
              onHoverActor={handleHoverActor}
              reason={webglAvailable ? "user_selected" : "webgl_unavailable"}
              fr={fr}
            />
          )}

          {activeActor ? (
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
      </CmmSectionGroup>
    </section>
  );
}
