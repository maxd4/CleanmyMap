"use client";
import "leaflet/dist/leaflet.css";
import type { ActionMapItem } from "@/lib/actions/types";
import type {CurrentPlaceStateMode} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import type {ActionsMapDateScope,ActionsMapFilters} from "./map/filters/actions-map-filters.utils";
import { type MarkerCategory } from "./map-marker-categories";
import type {MapViewportState} from "@/lib/geo/map-viewport";
import type {ActionsMapPresentation} from "./map-feed/map-feed.types";
import { ActionsMapCanvasView } from "./actions-map-canvas-view";
import { resolveActionsMapCanvasTheme } from "./actions-map-canvas-model";
import { useActionsMapCanvasState } from "./actions-map-canvas-state";
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
  const isEmerald = tone === "emerald";
  const { isHomepagePreview, isMinimalPreview, mapCenter, mapZoom, logicalRecenterViewport, visibleLayers, plasticOriginsData, basemapMode, setBasemapMode, activePanel, setActivePanel, scoreScope, displayMode, handleDisplayModeChange, handleScoreScopeChange, categoryCounts, currentPlaceStateViews, toggleLayer, mainItems, trashSpotterItems, selectedItem } = useActionsMapCanvasState({ items, selectedActionId, compact, presentation, initialViewport, recenterViewport, sourceItems, sourceCompleteness, controlledScoreScope, onScoreScopeChange, controlledDisplayMode, onDisplayModeChange });
  const { mapShellClasses, mapCanvasClass, layerButtonClasses } = resolveActionsMapCanvasTheme(isEmerald);
  return (
    <ActionsMapCanvasView
      isHomepagePreview={isHomepagePreview}
      isMinimalPreview={isMinimalPreview}
      mapCenter={mapCenter}
      mapZoom={mapZoom}
      fullViewport={fullViewport}
      mapShellClasses={mapShellClasses}
      mapCanvasClass={mapCanvasClass}
      className={className}
      activePanel={activePanel}
      setActivePanel={setActivePanel}
      controls={{
        filters,
        onZoneQueryChange,
        onDateScopeChange,
        onCategoryToggle,
        onResetFilters,
        categoryCounts,
        scoreScope,
        onScoreScopeChange: handleScoreScopeChange,
        displayMode,
        onDisplayModeChange: handleDisplayModeChange,
        visibleLayers,
        toggleLayer,
        layerButtonClasses,
        basemapMode,
        setBasemapMode,
        plasticOriginsData,
      }}
      logicalRecenterViewport={logicalRecenterViewport}
      tone={tone}
      viewportRequest={viewportRequest}
      viewportRequestKey={viewportRequestKey}
      onViewportChange={onViewportChange}
      onViewportInteraction={onViewportInteraction}
      basemapMode={basemapMode}
      mainItems={mainItems}
      trashSpotterItems={trashSpotterItems}
      visibleLayers={visibleLayers}
      selectedActionId={selectedActionId}
      onSelectAction={onSelectAction}
      currentPlaceStateViews={currentPlaceStateViews}
      selectedItem={selectedItem}
      onClearSelection={onClearSelection}
      frameSelectedActionId={frameSelectedActionId}
      displayMode={displayMode}
      scoreScope={scoreScope}
      isEmerald={isEmerald}
      plasticOriginsData={plasticOriginsData}
    />
  );
}
