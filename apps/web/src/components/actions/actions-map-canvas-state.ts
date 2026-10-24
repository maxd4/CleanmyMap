import { useMemo, useState } from "react";
import type { ActionMapItem } from "@/lib/actions/types";
import type { CurrentPlaceStateMode, CurrentPlaceStateViews } from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import type { ActionsMapPresentation } from "./map-feed/map-feed.types";
import { useActionPollutionScoreReferences } from "./map/scores/action-pollution-score-references-context";
import { resolveMapPlaceStateViews } from "./map/filters/actions-map-display-state";
import { getActionsMapCenter } from "./actions-map-canvas.utils";
import { DEFAULT_VISIBLE_MAP_LAYERS, toggleVisibleMapLayer, type VisibleMapLayerKey } from "./actions-map-canvas.layers";
import type { ShapeBasemapMode } from "./map/layers/map-layers.shared";
import { usePlasticOriginsData } from "@/lib/plastic-origins/use-plastic-origins-data";
import { deriveActionsMapCategoryCounts, resolveActionsMapCanvasViewport, resolveActionsMapItemGroups } from "./actions-map-canvas-model";

export type ActionsMapCanvasStateProps = {
  items: ActionMapItem[];
  selectedActionId: string | null;
  compact: boolean;
  presentation: ActionsMapPresentation;
  initialViewport: MapViewportState | null;
  recenterViewport: MapViewportState | null;
  sourceItems: ActionMapItem[];
  sourceCompleteness: RepollutionDatasetCompleteness;
  controlledScoreScope?: PollutionScoreScope;
  onScoreScopeChange?: (scope: PollutionScoreScope) => void;
  controlledDisplayMode?: CurrentPlaceStateMode;
  onDisplayModeChange?: (mode: CurrentPlaceStateMode) => void;
};

export function useActionsMapCanvasState({
  items, selectedActionId, compact, presentation, initialViewport, recenterViewport,
  sourceItems, sourceCompleteness, controlledScoreScope, onScoreScopeChange,
  controlledDisplayMode, onDisplayModeChange,
}: ActionsMapCanvasStateProps) {
  const isHomepagePreview = presentation === "homepage-preview";
  const isMinimalPreview = compact || isHomepagePreview;
  const center = useMemo(() => getActionsMapCenter(items), [items]);
  const { mapCenter, mapZoom, logicalRecenterViewport } = resolveActionsMapCanvasViewport({ center, initialViewport, compact, recenterViewport });
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_MAP_LAYERS);
  const plasticOriginsData = usePlasticOriginsData(!isMinimalPreview && visibleLayers.plasticOrigins);
  const [basemapMode, setBasemapMode] = useState<ShapeBasemapMode>("light");
  const [internalDisplayMode, setInternalDisplayMode] = useState<CurrentPlaceStateMode>("projected_today");
  const [internalScoreScope, setInternalScoreScope] = useState<PollutionScoreScope>("global");
  const [activePanel, setActivePanel] = useState<"filter" | "display" | "legend" | null>(null);
  const scoreScope = controlledScoreScope ?? internalScoreScope;
  const displayMode = controlledDisplayMode ?? internalDisplayMode;
  const handleDisplayModeChange = (mode: CurrentPlaceStateMode) => {
    if (controlledDisplayMode === undefined) setInternalDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };
  const handleScoreScopeChange = (scope: PollutionScoreScope) => {
    if (controlledScoreScope === undefined) setInternalScoreScope(scope);
    onScoreScopeChange?.(scope);
  };
  const { references } = useActionPollutionScoreReferences();
  const categoryCounts = useMemo(() => deriveActionsMapCategoryCounts(sourceItems, references, scoreScope, displayMode), [displayMode, references, scoreScope, sourceItems]);
  const [displayAsOf] = useState(() => new Date());
  const currentPlaceStateViews = useMemo<CurrentPlaceStateViews[]>(
    () => resolveMapPlaceStateViews(sourceItems, { asOf: displayAsOf, sourceCompleteness, pollutionScoreReferences: references }),
    [displayAsOf, references, sourceCompleteness, sourceItems],
  );
  const { mainItems, trashSpotterItems, selectedItem } = useMemo(() => resolveActionsMapItemGroups(items, selectedActionId), [items, selectedActionId]);
  function toggleLayer(key: VisibleMapLayerKey) {
    setVisibleLayers((current) => toggleVisibleMapLayer(current, key));
  }
  return { isHomepagePreview, isMinimalPreview, mapCenter, mapZoom, logicalRecenterViewport, visibleLayers, plasticOriginsData, basemapMode, setBasemapMode, activePanel, setActivePanel, scoreScope, displayMode, handleDisplayModeChange, handleScoreScopeChange, categoryCounts, currentPlaceStateViews, toggleLayer, mainItems, trashSpotterItems, selectedItem };
}
