import type { ComponentType } from "react";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import type { RefObject } from "react";
import type { RepollutionDatasetCompleteness } from "@/lib/actions/pollution/local-repollution-calibration";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import type {
  ActionsMapDateScope,
  ActionsMapFilters,
} from "@/components/actions/map/filters/actions-map-filters.utils";

export type ActionsMapPresentation = "default" | "immersive" | "homepage-preview";

type ActionsMapCanvasProps = {
  items: ActionMapItem[];
  sourceItems?: ActionMapItem[];
  sourceCompleteness?: RepollutionDatasetCompleteness;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  onClearSelection?: () => void;
  frameSelectedActionId?: string | null;
  fullViewport?: boolean;
  compact?: boolean;
  presentation?: ActionsMapPresentation;
  tone?: "sky" | "emerald";
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  initialViewport?: MapViewportState | null;
  viewportRequest?: MapViewportState | null;
  viewportRequestKey?: number;
  recenterViewport?: MapViewportState | null;
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

export type ActionsMapCanvasComponent = ComponentType<ActionsMapCanvasProps>;

export type ActionsMapLayoutCommonProps = Pick<
  ActionsMapCanvasProps,
  | "recenterViewport"
  | "scoreScope"
  | "onScoreScopeChange"
  | "displayMode"
  | "onDisplayModeChange"
  | "filters"
  | "onZoneQueryChange"
  | "onDateScopeChange"
  | "onCategoryToggle"
> & {
  items: ActionMapItem[];
  allItems: ActionMapItem[];
  hasPartialSource: boolean;
  partialSourcesLabel: string;
  freshnessLabel: string | null;
  isValidating: boolean;
  mapCanvasError: string | null;
  MapCanvas: ActionsMapCanvasComponent | null;
  selectedActionId: string | null;
  onClearSelection?: () => void;
  frameSelectedActionId?: string | null;
  onSelectAction: (actionId: string) => void;
  onResetFilters: () => void;
  onReload: () => void;
  tone?: "sky" | "emerald";
  compact?: boolean;
  zoneQuery?: string;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
  onViewportInteraction?: () => void;
  initialViewport?: MapViewportState | null;
  viewportRequest?: MapViewportState | null;
  viewportRequestKey?: number;
  isInitialViewportResolved?: boolean;
  sourceCompleteness?: RepollutionDatasetCompleteness;
};

export type ActionsMapFeedProps = Partial<Pick<
  ActionsMapLayoutCommonProps,
  | "tone"
  | "zoneQuery"
  | "compact"
  | "selectedActionId"
  | "onResetFilters"
  | "mapExportTargetRef"
  | "onViewportChange"
  | "scoreScope"
  | "onScoreScopeChange"
  | "displayMode"
  | "onDisplayModeChange"
>> & {
  types?: ActionRecordType[] | "all";
  days: number;
  dateScope?: ActionsMapDateScope;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  limit?: number;
  presentation?: ActionsMapPresentation;
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  visibleCategories?: Record<MarkerCategory, boolean>;
  onOpenAction?: (actionId: string) => void;
};
