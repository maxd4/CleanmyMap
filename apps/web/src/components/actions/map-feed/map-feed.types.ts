import type { ComponentType } from "react";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { ActionsMapDateScope } from "@/components/actions/map/actions-map-filters.utils";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import type { RefObject } from "react";

export type ActionsMapCanvasComponent = ComponentType<{
  items: ActionMapItem[];
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  fullViewport?: boolean;
  tone?: "sky" | "emerald";
  onViewportChange?: (viewport: MapViewportState) => void;
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
  presentation?: "default" | "immersive";
  tone?: "sky" | "emerald";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  visibleCategories?: Record<MarkerCategory, boolean>;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
  onResetFilters?: () => void;
  mapExportTargetRef?: RefObject<HTMLDivElement | null>;
  onViewportChange?: (viewport: MapViewportState) => void;
};
