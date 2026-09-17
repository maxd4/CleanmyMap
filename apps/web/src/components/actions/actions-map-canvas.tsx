"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayerGroup,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type {
  CurrentPlaceStateMode,
  CurrentPlaceStateViews,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import { isTrashSpotterSpotRecord } from "@/lib/actions/trash-spotter-actionable-candidates";
import { cn } from "@/lib/utils";
import { MapControls } from "./map/map-controls";
import { ActionSelectionPanel } from "./map/action-selection-panel";
import { MapScoreScopeControl } from "./map/map-score-scope-control";
import { MapGeometryLegend } from "./map/map-geometry-legend";
import { useActionPollutionScoreReferences } from "./map/action-pollution-score-references-context";
import { resolveMapPlaceStateViews } from "./map/actions-map-display-state";
import { ACTIONS_MAP_DISPLAY_MODE_OPTIONS } from "./map/actions-map-display-mode";
import { ActionsMapFilterControls } from "./map/actions-map-filter-controls";
import type { ActionsMapDateScope, ActionsMapFilters } from "./map/actions-map-filters.utils";
import { deriveMarkerCategories, type MarkerCategory } from "./map-marker-categories";
import {
  SignalementMarkers,
  ShapeLayers,
  InfrastructureMarkers,
  TrashSpotterMarkers,
  isTrashSpotterItem,
} from "./map/map-layers";
import {
  createActionsMapViewport,
  getActionsMapCenter,
} from "./actions-map-canvas.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";
import type { ActionsMapPresentation } from "./map-feed/map-feed.types";
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  MAP_LAYER_LABELS,
  toggleVisibleMapLayer,
  type VisibleMapLayerKey,
} from "./actions-map-canvas.layers";
import type { ShapeBasemapMode } from "./map/map-layers.shared";

type ActionsMapCanvasProps = {
  items: ActionMapItem[];
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  onClearSelection?: () => void;
  frameSelectedActionId?: string | null;
  fullViewport?: boolean;
  compact?: boolean;
  presentation?: ActionsMapPresentation;
  className?: string;
  tone?: "sky" | "emerald";
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  initialViewport?: MapViewportState | null;
  viewportRequest?: MapViewportState | null;
  viewportRequestKey?: number;
  recenterViewport?: MapViewportState | null;
  sourceItems?: ActionMapItem[];
  sourceCompleteness?: RepollutionDatasetCompleteness;
  scoreScope?: PollutionScoreScope;
  onScoreScopeChange?: (scope: PollutionScoreScope) => void;
  displayMode?: CurrentPlaceStateMode;
  onDisplayModeChange?: (mode: CurrentPlaceStateMode) => void;
  filters?: ActionsMapFilters;
  onZoneQueryChange?: (zoneQuery: string) => void;
  onDateScopeChange?: (dateScope: ActionsMapDateScope) => void;
  onCategoryToggle?: (category: MarkerCategory) => void;
  onResetFilters?: () => void;
};

function MapViewportReporter({
  onViewportChange,
  onViewportInteraction,
}: {
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
}) {
  const map = useMapEvents({
    dragstart: () => {
      onViewportInteraction?.();
    },
    zoomstart: () => {
      onViewportInteraction?.();
    },
    moveend: () => {
      onViewportChange?.(resolveViewportState(map));
    },
    zoomend: () => {
      onViewportChange?.(resolveViewportState(map));
    },
  });

  useEffect(() => {
    onViewportChange?.(resolveViewportState(map));
  }, [map, onViewportChange]);

  return null;
}

function resolveViewportState(map: LeafletMap): MapViewportState {
  const center = map.getCenter();
  const bounds = map.getBounds();
  return {
    center: [Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6))],
    zoom: map.getZoom(),
    bounds: {
      south: Number(bounds.getSouth().toFixed(6)),
      west: Number(bounds.getWest().toFixed(6)),
      north: Number(bounds.getNorth().toFixed(6)),
      east: Number(bounds.getEast().toFixed(6)),
    },
  };
}

function MapViewportSync({
  viewportRequest,
  viewportRequestKey,
}: {
  viewportRequest: MapViewportState | null;
  viewportRequestKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!viewportRequest) {
      return;
    }

    map.setView(viewportRequest.center, viewportRequest.zoom, { animate: false });
  }, [map, viewportRequest, viewportRequestKey]);

  return null;
}

export function ActionsMapCanvas({
  items,
  selectedActionId = null,
  onSelectAction,
  onClearSelection,
  frameSelectedActionId = null,
  fullViewport = false,
  compact = false,
  presentation = "default",
  className,
  tone = "sky",
  onViewportChange,
  onViewportInteraction,
  initialViewport = null,
  viewportRequest = null,
  viewportRequestKey = 0,
  recenterViewport = null,
  sourceItems = items,
  sourceCompleteness = "partial",
  scoreScope: controlledScoreScope,
  onScoreScopeChange,
  displayMode: controlledDisplayMode,
  onDisplayModeChange,
  filters,
  onZoneQueryChange,
  onDateScopeChange,
  onCategoryToggle,
  onResetFilters,
}: ActionsMapCanvasProps) {
  const isHomepagePreview = presentation === "homepage-preview";
  const isMinimalPreview = compact || isHomepagePreview;
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const mapCenter = initialViewport?.center ?? center;
  const mapZoom = initialViewport?.zoom ?? (compact ? 11 : 12);
  const logicalRecenterViewport =
    recenterViewport ??
    initialViewport ??
    createActionsMapViewport(center, compact ? 11 : 12);
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_MAP_LAYERS);
  const [basemapMode, setBasemapMode] = useState<ShapeBasemapMode>("light");
  const [internalDisplayMode, setInternalDisplayMode] = useState<CurrentPlaceStateMode>(
    "projected_today",
  );
  const [internalScoreScope, setInternalScoreScope] =
    useState<PollutionScoreScope>("global");
  const [activePanel, setActivePanel] = useState<"filter" | "display" | "legend" | null>(null);
  const scoreScope = controlledScoreScope ?? internalScoreScope;
  const displayMode = controlledDisplayMode ?? internalDisplayMode;
  const handleDisplayModeChange = (mode: CurrentPlaceStateMode) => {
    if (controlledDisplayMode === undefined) {
      setInternalDisplayMode(mode);
    }
    onDisplayModeChange?.(mode);
  };
  const handleScoreScopeChange = (scope: PollutionScoreScope) => {
    if (controlledScoreScope === undefined) {
      setInternalScoreScope(scope);
    }
    onScoreScopeChange?.(scope);
  };
  const { references } = useActionPollutionScoreReferences();
  const categoryCounts = useMemo(() => {
    return sourceItems.reduce<Partial<Record<MarkerCategory, number>>>((counts, item) => {
      for (const category of deriveMarkerCategories(item, references, { scoreScope, displayMode })) {
        counts[category] = (counts[category] ?? 0) + 1;
      }
      return counts;
    }, {});
  }, [displayMode, references, scoreScope, sourceItems]);
  const [displayAsOf] = useState(() => new Date());
  const currentPlaceStateViews = useMemo<CurrentPlaceStateViews[]>(
    () =>
      resolveMapPlaceStateViews(sourceItems, {
        asOf: displayAsOf,
        sourceCompleteness,
        pollutionScoreReferences: references,
      }),
    [displayAsOf, references, sourceCompleteness, sourceItems],
  );
  const isEmerald = tone === "emerald";
  const mapShellClasses = isEmerald
    ? "border-emerald-200/30 bg-[rgba(245,251,244,0.98)] shadow-[0_32px_64px_-12px_rgba(34,197,94,0.18)] ring-1 ring-emerald-200/20"
    : "border-sky-300/16 bg-[rgba(10,31,50,0.98)] shadow-[0_32px_64px_-12px_rgba(56,189,248,0.28)] ring-1 ring-sky-300/10";
  const mapCanvasClass = isEmerald
    ? "bg-[rgba(244,249,241,0.98)]"
    : "bg-[rgba(10,31,50,0.98)]";
  const layerButtonClasses = {
    active: isEmerald
      ? "border-emerald-300/35 bg-emerald-400/18 text-emerald-950"
      : "border-sky-300/35 bg-sky-400/18 text-sky-50",
    inactive: isEmerald
      ? "border-emerald-300/16 bg-white/78 text-emerald-900/58 hover:border-emerald-300/28 hover:text-emerald-950"
      : "border-sky-300/12 bg-[rgba(16,40,64,0.9)] text-sky-100/56 hover:border-sky-300/24 hover:text-sky-50",
  };
  const mainItems = useMemo(
    () => items.filter((item) => !isTrashSpotterSpotRecord(item)),
    [items],
  );
  const trashSpotterItems = useMemo(
    () => items.filter((item) => isTrashSpotterItem(item)),
    [items],
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedActionId) ?? null,
    [items, selectedActionId],
  );

  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem]",
        mapShellClasses,
        isMinimalPreview && "h-full rounded-none border-0 bg-transparent shadow-none ring-0",
        className,
      )}
    >
      {isMinimalPreview ? null : (
        <div className="absolute inset-x-3 top-3 z-[1000] flex flex-wrap items-start justify-between gap-2">
          <div className="flex max-w-full flex-wrap gap-2" role="toolbar" aria-label="Contrôles de la carte">
            {filters && onZoneQueryChange && onDateScopeChange && onCategoryToggle && onResetFilters ? (
              <button type="button" onClick={() => setActivePanel((current) => current === "filter" ? null : "filter")} aria-expanded={activePanel === "filter"} aria-controls="actions-map-filter-panel" className="min-h-11 rounded-xl border border-sky-200/90 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur-xl transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
                Filtrer
              </button>
            ) : null}
            <button type="button" onClick={() => setActivePanel((current) => current === "display" ? null : "display")} aria-expanded={activePanel === "display"} aria-controls="actions-map-display-panel" className="min-h-11 rounded-xl border border-sky-200/90 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur-xl transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
              Affichage
            </button>
            <button type="button" onClick={() => setActivePanel((current) => current === "legend" ? null : "legend")} aria-expanded={activePanel === "legend"} aria-controls="actions-map-legend-panel" className="min-h-11 rounded-xl border border-sky-200/90 bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg backdrop-blur-xl transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">
              Légende
            </button>
          </div>
        </div>
      )}
      {!isMinimalPreview && activePanel === "filter" && filters && onZoneQueryChange && onDateScopeChange && onCategoryToggle && onResetFilters ? (
        <div id="actions-map-filter-panel" className="absolute left-3 right-3 top-16 z-[1000] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-sky-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:left-3 sm:max-w-2xl" role="region" aria-label="Filtres de la carte">
          <ActionsMapFilterControls filters={filters} categoryCounts={categoryCounts} onZoneQueryChange={onZoneQueryChange} onDateScopeChange={onDateScopeChange} onCategoryToggle={onCategoryToggle} onReset={onResetFilters} />
        </div>
      ) : null}
      {!isMinimalPreview && activePanel === "display" ? (
        <div id="actions-map-display-panel" className="absolute left-3 right-3 top-16 z-[1000] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-sky-200/90 bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-xl sm:left-auto sm:right-3 sm:max-w-md" role="region" aria-label="Options d’affichage">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Référence du score</p>
              <MapScoreScopeControl value={scoreScope} onChange={handleScoreScopeChange} />
            </div>
            {scoreScope === "global" ? (
              <div className="space-y-2" role="group" aria-label="Mode temporel du score global">
                <p className="text-sm font-semibold text-slate-900">Période du score</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACTIONS_MAP_DISPLAY_MODE_OPTIONS.map((option) => <button key={option.value} type="button" className={["min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", displayMode === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")} aria-pressed={displayMode === option.value} onClick={() => handleDisplayModeChange(option.value)}>{option.label}</button>)}
                </div>
              </div>
            ) : null}
            <div className="space-y-2" role="group" aria-label="Calques visibles">
              <p className="text-sm font-semibold text-slate-900">Calques</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {([{ key: "points" as const, label: MAP_LAYER_LABELS.points }, { key: "shapes" as const, label: MAP_LAYER_LABELS.shapes }, { key: "infrastructure" as const, label: MAP_LAYER_LABELS.infrastructure }, { key: "trashSpotter" as const, label: MAP_LAYER_LABELS.trashSpotter }]).map((layer) => <button key={layer.key} type="button" onClick={() => toggleLayer(layer.key)} aria-pressed={visibleLayers[layer.key]} className={["min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", visibleLayers[layer.key] ? layerButtonClasses.active : layerButtonClasses.inactive].join(" ")}>{layer.label}</button>)}
              </div>
            </div>
            <div className="space-y-2" role="group" aria-label="Fond de carte">
              <p className="text-sm font-semibold text-slate-900">Fond de carte</p>
              <div className="grid grid-cols-2 gap-2">
                {([{ value: "light" as const, label: "Fond clair" }, { value: "dark" as const, label: "Fond contrasté" }]).map((option) => <button key={option.value} type="button" onClick={() => setBasemapMode(option.value)} aria-pressed={basemapMode === option.value} className={["min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", basemapMode === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{option.label}</button>)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!isMinimalPreview && activePanel === "legend" ? (
        <div id="actions-map-legend-panel" className="absolute left-3 right-3 top-16 z-[1000] sm:left-auto sm:right-3" role="region" aria-label="Légende de la carte">
          <MapGeometryLegend scoreScope={scoreScope} displayMode={displayMode} />
        </div>
      ) : null}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        zoomControl={!isHomepagePreview}
        className={
          isMinimalPreview
            ? cn(
                "h-full min-h-[18rem] w-full transition-colors duration-500",
                mapCanvasClass,
                fullViewport ? "min-h-full" : null,
              )
            : fullViewport
            ? `h-[100dvh] min-h-[100dvh] w-full transition-colors duration-500 ${mapCanvasClass}`
            : `h-[68vh] min-h-[34rem] w-full transition-colors duration-500 md:h-[74vh] md:min-h-[42rem] ${mapCanvasClass}`
        }
        >
        <MapViewportSync
          viewportRequest={viewportRequest}
          viewportRequestKey={viewportRequestKey}
        />
        <MapViewportReporter
          onViewportChange={onViewportChange}
          onViewportInteraction={onViewportInteraction}
        />
        {!isMinimalPreview ? (
          <MapControls
            center={logicalRecenterViewport.center}
            zoom={logicalRecenterViewport.zoom}
            variant="immersive"
            tone={tone}
            position="right"
          />
        ) : null}
        <TileLayer
          attribution={CARTO_BASEMAPS[isMinimalPreview ? "light" : basemapMode].attribution}
          url={CARTO_BASEMAPS[isMinimalPreview ? "light" : basemapMode].url}
          crossOrigin="anonymous"
        />

        <LayerGroup>
          <SignalementMarkers
            items={mainItems}
            visible={visibleLayers.points}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
            displayMode={displayMode}
            currentPlaceStateViews={currentPlaceStateViews}
            scoreScope={scoreScope}
            basemapMode={basemapMode}
          />
          <ShapeLayers
            items={mainItems}
            visible={visibleLayers.shapes}
            selectedActionId={selectedActionId}
            onSelectAction={onSelectAction}
            displayMode={displayMode}
            currentPlaceStateViews={currentPlaceStateViews}
            scoreScope={scoreScope}
          />
          {isMinimalPreview ? null : (
            <>
              <InfrastructureMarkers
                items={mainItems}
                visible={visibleLayers.infrastructure}
                selectedActionId={selectedActionId}
                onSelectAction={onSelectAction}
              />
              <TrashSpotterMarkers
                items={trashSpotterItems}
                visible={visibleLayers.trashSpotter}
                selectedActionId={selectedActionId}
                onSelectAction={onSelectAction}
                displayMode={displayMode}
                currentPlaceStateViews={currentPlaceStateViews}
                scoreScope={scoreScope}
              />
            </>
          )}
        </LayerGroup>

        {!isMinimalPreview && selectedItem && onClearSelection ? (
          <ActionSelectionPanel
            item={selectedItem}
            displayMode={displayMode}
            scoreScope={scoreScope}
            currentPlaceStateViews={currentPlaceStateViews}
            frameOnMount={frameSelectedActionId === selectedItem.id}
            onClose={onClearSelection}
          />
        ) : null}

        <style>{`
          .cmm-infrastructure-marker {
            background: transparent;
            border: none;
          }
          .cmm-infrastructure-marker__outer {
            position: relative;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .cmm-infrastructure-marker__outer:hover {
            transform: scale(1.15) translateY(-4px);
          }
          .cmm-infrastructure-marker__glow {
            position: absolute;
            width: 32px;
            height: 32px;
            background: radial-gradient(circle, rgba(125, 211, 252, 0.36) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse-glow 2s infinite;
          }
          .cmm-infrastructure-marker__inner {
            position: relative;
            width: 34px;
            height: 34px;
            background: rgba(16, 40, 64, 0.88);
            border: 1px solid rgba(125, 211, 252, 0.16);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.28);
          }
          .cmm-infrastructure-marker__emoji {
            font-size: 20px;
          }
          .cmm-trash-spotter-cluster {
            background: transparent;
            border: none;
          }
          .cmm-trash-spotter-cluster__body {
            width: 100%;
            height: 100%;
            border-radius: 999px;
            border: 1px solid rgba(100, 116, 139, 0.35);
            background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(226, 232, 240, 0.9));
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            box-shadow: 0 20px 30px -16px rgba(71, 85, 105, 0.3);
          }
          .cmm-trash-spotter-cluster__count {
            font-size: 0.95rem;
            font-weight: 900;
            line-height: 1;
          }
          .cmm-trash-spotter-cluster__label {
            font-size: 0.48rem;
            font-weight: 900;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            opacity: 0.72;
          }
          .cmm-action-geometry-endpoint-icon,
          .cmm-action-geometry-direction-icon {
            background: transparent;
            border: none;
            pointer-events: none;
          }
          .cmm-action-geometry-endpoint {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.95);
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.94);
            color: #ffffff;
            font-size: 0.52rem;
            font-weight: 900;
            line-height: 1;
            letter-spacing: -0.04em;
            box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.72), 0 2px 6px rgba(15, 23, 42, 0.42);
          }
          .cmm-action-geometry-direction {
            display: block;
            color: #ffffff;
            font-size: 0.82rem;
            line-height: 1;
            text-shadow: -1px -1px 0 #0f172a, 1px -1px 0 #0f172a, -1px 1px 0 #0f172a, 1px 1px 0 #0f172a;
          }
          @keyframes pulse-glow {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
          .leaflet-container {
            background: var(--bg-canvas, ${isEmerald ? "#f5fbf3" : "#061423"});
          }
        `}</style>
      </MapContainer>
    </div>
  );
}
