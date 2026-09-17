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
} from "@/components/actions/map/actions-map-filters.utils";

export type ActionsMapPresentation = "default" | "immersive" | "homepage-preview";

export type ActionsMapCanvasComponent = ComponentType<{
  items: ActionMapItem[];
  sourceItems?: ActionMapItem[];
  sourceCompleteness?: RepollutionDatasetCompleteness;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
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
}>;

export type ActionsMapFeedProps = {
  types?: ActionRecordType[] | "all";
  days: number;
  dateScope?: ActionsMapDateScope;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  zoneQuery?: string;
  limit?: number;
  presentation?: ActionsMapPresentation;
  tone?: "sky" | "emerald";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  compact?: boolean;
  visibleCategories?: Record<MarkerCategory, boolean>;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
  onResetFilters?: () => void;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
  scoreScope?: PollutionScoreScope;
  onScoreScopeChange?: (scope: PollutionScoreScope) => void;
  displayMode?: CurrentPlaceStateMode;
  onDisplayModeChange?: (mode: CurrentPlaceStateMode) => void;
};
