"use client";

import type { Dispatch, SetStateAction } from "react";
import { LayerGroup, MapContainer, TileLayer } from "react-leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type { CurrentPlaceStateMode, CurrentPlaceStateViews } from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import type { ActionsMapDateScope, ActionsMapFilters } from "./map/filters/actions-map-filters.utils";
import type { MarkerCategory } from "./map-marker-categories";
import type { VisibleMapLayers, VisibleMapLayerKey } from "./actions-map-canvas.layers";
import { cn } from "@/lib/utils";
import { MapControls } from "./map/controls/map-controls";
import { ActionSelectionPanel } from "./map/selection/action-selection-panel";
import { MapScoreScopeControl } from "./map/controls/map-score-scope-control";
import { MapGeometryLegend } from "./map/layers/map-geometry-legend";
import { ACTIONS_MAP_DISPLAY_MODE_OPTIONS } from "./map/filters/actions-map-display-mode";
import { ActionsMapFilterControls } from "./map/filters/actions-map-filter-controls";
import { SignalementMarkers, ShapeLayers, InfrastructureMarkers, TrashSpotterMarkers } from "./map/layers/map-layers";
import { CARTO_BASEMAPS } from "@/lib/maps/basemaps";
import type { ShapeBasemapMode } from "./map/layers/map-layers.shared";
import { ActionsMapCanvasStyles } from "./actions-map-canvas-styles";
import { ActionsMapCanvasViewport } from "./actions-map-canvas-viewport";

type ActionsMapCanvasControlsProps = {
  isMinimalPreview: boolean;
  activePanel: "filter" | "display" | "legend" | null;
  setActivePanel: Dispatch<SetStateAction<"filter" | "display" | "legend" | null>>;
  filters?: ActionsMapFilters;
  onZoneQueryChange?: (zoneQuery: string) => void;
  onDateScopeChange?: (dateScope: ActionsMapDateScope) => void;
  onCategoryToggle?: (category: MarkerCategory) => void;
  onResetFilters?: () => void;
  categoryCounts: Partial<Record<MarkerCategory, number>>;
  scoreScope: PollutionScoreScope;
  onScoreScopeChange: (scope: PollutionScoreScope) => void;
  displayMode: CurrentPlaceStateMode;
  onDisplayModeChange: (mode: CurrentPlaceStateMode) => void;
  visibleLayers: VisibleMapLayers;
  toggleLayer: (key: VisibleMapLayerKey) => void;
  layerButtonClasses: { active: string; inactive: string };
  basemapMode: ShapeBasemapMode;
  setBasemapMode: Dispatch<SetStateAction<ShapeBasemapMode>>;
};

function ActionsMapCanvasDisplayPanel({
  scoreScope,
  onScoreScopeChange,
  displayMode,
  onDisplayModeChange,
  visibleLayers,
  toggleLayer,
  layerButtonClasses,
  basemapMode,
  setBasemapMode,
}: Omit<ActionsMapCanvasControlsProps, "isMinimalPreview" | "activePanel" | "setActivePanel" | "filters" | "onZoneQueryChange" | "onDateScopeChange" | "onCategoryToggle" | "onResetFilters" | "categoryCounts">) {
  const layers = [
    { key: "points" as const, label: "Points" },
    { key: "shapes" as const, label: "Parcours & zones" },
    { key: "infrastructure" as const, label: "Infras" },
    { key: "trashSpotter" as const, label: "Trash Spotter" },
  ];
  return (
    <div id="actions-map-display-panel" className="absolute left-3 right-3 top-28 z-[1000] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-sky-200/90 bg-white/95 p-4 text-slate-900 shadow-xl backdrop-blur-xl sm:left-auto sm:right-3 sm:top-16 sm:max-w-md" role="region" aria-label="Options d’affichage">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Référence du score</p>
          <MapScoreScopeControl value={scoreScope} onChange={onScoreScopeChange} />
        </div>
        {scoreScope === "global" ? (
          <div className="space-y-2" role="group" aria-label="Mode temporel du score global">
            <p className="text-sm font-semibold text-slate-900">Période du score</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACTIONS_MAP_DISPLAY_MODE_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={["min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", displayMode === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")} aria-pressed={displayMode === option.value} onClick={() => onDisplayModeChange(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2" role="group" aria-label="Calques visibles">
          <p className="text-sm font-semibold text-slate-900">Calques</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {layers.map((layer) => (
              <button key={layer.key} type="button" onClick={() => toggleLayer(layer.key)} aria-pressed={visibleLayers[layer.key]} className={["min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", visibleLayers[layer.key] ? layerButtonClasses.active : layerButtonClasses.inactive].join(" ")}>
                {layer.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2" role="group" aria-label="Fond de carte">
          <p className="text-sm font-semibold text-slate-900">Fond de carte</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "light" as const, label: "Fond clair" }, { value: "dark" as const, label: "Fond contrasté" }].map((option) => (
              <button key={option.value} type="button" onClick={() => setBasemapMode(option.value)} aria-pressed={basemapMode === option.value} className={["min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50", basemapMode === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsMapCanvasControls(props: ActionsMapCanvasControlsProps) {
  const { isMinimalPreview, activePanel, setActivePanel, filters, onZoneQueryChange, onDateScopeChange, onCategoryToggle, onResetFilters, categoryCounts, ...displayPanelProps } = props;
  const hasFilters = Boolean(filters && onZoneQueryChange && onDateScopeChange && onCategoryToggle && onResetFilters);
  return (
    <>
      {!isMinimalPreview ? (
        <div className="absolute left-14 right-3 top-16 z-[1000] flex flex-wrap items-start justify-between gap-2 sm:top-3">
          <div className="flex max-w-full flex-wrap gap-2" role="toolbar" aria-label="Contrôles de la carte">
            {hasFilters ? (
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
      ) : null}
      {!isMinimalPreview && activePanel === "filter" && hasFilters ? (
        <div id="actions-map-filter-panel" className="absolute left-3 right-3 top-28 z-[1000] max-h-[calc(100%-5rem)] overflow-y-auto rounded-2xl border border-sky-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:left-3 sm:top-16 sm:max-w-2xl" role="region" aria-label="Filtres de la carte">
          <ActionsMapFilterControls filters={filters!} categoryCounts={categoryCounts} onZoneQueryChange={onZoneQueryChange!} onDateScopeChange={onDateScopeChange!} onCategoryToggle={onCategoryToggle!} onReset={onResetFilters!} />
        </div>
      ) : null}
      {!isMinimalPreview && activePanel === "display" ? <ActionsMapCanvasDisplayPanel {...displayPanelProps} /> : null}
      {!isMinimalPreview && activePanel === "legend" ? (
        <div id="actions-map-legend-panel" className="absolute left-3 right-3 top-28 z-[1000] sm:left-auto sm:right-3 sm:top-16" role="region" aria-label="Légende de la carte">
          <MapGeometryLegend scoreScope={displayPanelProps.scoreScope} displayMode={displayPanelProps.displayMode} />
        </div>
      ) : null}
    </>
  );
}

export type ActionsMapCanvasViewProps = {
  isHomepagePreview: boolean;
  isMinimalPreview: boolean;
  mapCenter: MapViewportState["center"];
  mapZoom: number;
  fullViewport: boolean;
  mapShellClasses: string;
  mapCanvasClass: string;
  className?: string;
  activePanel: "filter" | "display" | "legend" | null;
  setActivePanel: Dispatch<SetStateAction<"filter" | "display" | "legend" | null>>;
  controls: Omit<ActionsMapCanvasControlsProps, "activePanel" | "setActivePanel" | "isMinimalPreview">;
  logicalRecenterViewport: MapViewportState;
  tone: "sky" | "emerald";
  viewportRequest: MapViewportState | null;
  viewportRequestKey: number;
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  basemapMode: ShapeBasemapMode;
  mainItems: ActionMapItem[];
  trashSpotterItems: ActionMapItem[];
  visibleLayers: VisibleMapLayers;
  selectedActionId: string | null;
  onSelectAction?: (actionId: string) => void;
  currentPlaceStateViews: CurrentPlaceStateViews[];
  selectedItem: ActionMapItem | null;
  onClearSelection?: () => void;
  frameSelectedActionId: string | null;
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  isEmerald: boolean;
};

export function ActionsMapCanvasView({
  isHomepagePreview,
  isMinimalPreview,
  mapCenter,
  mapZoom,
  fullViewport,
  mapShellClasses,
  mapCanvasClass,
  className,
  activePanel,
  setActivePanel,
  controls,
  logicalRecenterViewport,
  tone,
  viewportRequest,
  viewportRequestKey,
  onViewportChange,
  onViewportInteraction,
  basemapMode,
  mainItems,
  trashSpotterItems,
  visibleLayers,
  selectedActionId,
  onSelectAction,
  currentPlaceStateViews,
  selectedItem,
  onClearSelection,
  frameSelectedActionId,
  displayMode,
  scoreScope,
  isEmerald,
}: ActionsMapCanvasViewProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem]", mapShellClasses, isMinimalPreview && "h-full rounded-none border-0 bg-transparent shadow-none ring-0", className)}>
      <ActionsMapCanvasControls {...controls} isMinimalPreview={isMinimalPreview} activePanel={activePanel} setActivePanel={setActivePanel} />
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom zoomControl={!isHomepagePreview} className={isMinimalPreview ? cn("h-full min-h-[18rem] w-full transition-colors duration-500", mapCanvasClass, fullViewport ? "min-h-full" : null) : fullViewport ? `h-[100dvh] min-h-[100dvh] w-full transition-colors duration-500 ${mapCanvasClass}` : `h-[68vh] min-h-[34rem] w-full transition-colors duration-500 md:h-[74vh] md:min-h-[42rem] ${mapCanvasClass}`}>
        <ActionsMapCanvasViewport viewportRequest={viewportRequest} viewportRequestKey={viewportRequestKey} onViewportChange={onViewportChange} onViewportInteraction={onViewportInteraction} />
        {!isMinimalPreview ? <MapControls center={logicalRecenterViewport.center} zoom={logicalRecenterViewport.zoom} variant="immersive" tone={tone} position="right" /> : null}
        <TileLayer attribution={CARTO_BASEMAPS[isMinimalPreview ? "light" : basemapMode].attribution} url={CARTO_BASEMAPS[isMinimalPreview ? "light" : basemapMode].url} crossOrigin="anonymous" />
        <LayerGroup>
          <SignalementMarkers items={mainItems} visible={visibleLayers.points} selectedActionId={selectedActionId} onSelectAction={onSelectAction} displayMode={displayMode} currentPlaceStateViews={currentPlaceStateViews} scoreScope={scoreScope} basemapMode={basemapMode} />
          <ShapeLayers items={mainItems} visible={visibleLayers.shapes} selectedActionId={selectedActionId} onSelectAction={onSelectAction} displayMode={displayMode} currentPlaceStateViews={currentPlaceStateViews} scoreScope={scoreScope} />
          {!isMinimalPreview ? <><InfrastructureMarkers items={mainItems} visible={visibleLayers.infrastructure} selectedActionId={selectedActionId} onSelectAction={onSelectAction} /><TrashSpotterMarkers items={trashSpotterItems} visible={visibleLayers.trashSpotter} selectedActionId={selectedActionId} onSelectAction={onSelectAction} displayMode={displayMode} currentPlaceStateViews={currentPlaceStateViews} scoreScope={scoreScope} /></> : null}
        </LayerGroup>
        {!isMinimalPreview && selectedItem && onClearSelection ? <ActionSelectionPanel item={selectedItem} displayMode={displayMode} scoreScope={scoreScope} currentPlaceStateViews={currentPlaceStateViews} frameOnMount={frameSelectedActionId === selectedItem.id} onClose={onClearSelection} /> : null}
        <ActionsMapCanvasStyles isEmerald={isEmerald} />
      </MapContainer>
    </div>
  );
}
