"use client";
import { useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { ActionMapItem } from "@/lib/actions/types";
import type {CurrentPlaceStateMode,CurrentPlaceStateViews} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import { useActionPollutionScoreReferences } from "./map/scores/action-pollution-score-references-context";
import { resolveMapPlaceStateViews } from "./map/filters/actions-map-display-state";
import type {ActionsMapDateScope,ActionsMapFilters} from "./map/filters/actions-map-filters.utils";
import { type MarkerCategory } from "./map-marker-categories";
import { getActionsMapCenter } from "./actions-map-canvas.utils";
import type {MapViewportState} from "@/lib/geo/map-viewport";
import type {ActionsMapPresentation} from "./map-feed/map-feed.types";
import {DEFAULT_VISIBLE_MAP_LAYERS,toggleVisibleMapLayer,type VisibleMapLayerKey} from "./actions-map-canvas.layers";
import type {ShapeBasemapMode} from "./map/layers/map-layers.shared";
import { ActionsMapCanvasView } from "./actions-map-canvas-view";
import {
  deriveActionsMapCategoryCounts,
  resolveActionsMapCanvasTheme,
  resolveActionsMapCanvasViewport,
  resolveActionsMapItemGroups,
} from "./actions-map-canvas-model";
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
  const isHomepagePreview = presentation === "homepage-preview";
  const isMinimalPreview = compact || isHomepagePreview;
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const { mapCenter, mapZoom, logicalRecenterViewport } = resolveActionsMapCanvasViewport({
    center,
    initialViewport,
    compact,
    recenterViewport,
  });
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
    return deriveActionsMapCategoryCounts(sourceItems, references, scoreScope, displayMode);
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
  const { mapShellClasses, mapCanvasClass, layerButtonClasses } = resolveActionsMapCanvasTheme(isEmerald);
  const { mainItems, trashSpotterItems, selectedItem } = useMemo(
    () => resolveActionsMapItemGroups(items, selectedActionId),
    [items, selectedActionId],
  );
  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }
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
    />
  );
}
