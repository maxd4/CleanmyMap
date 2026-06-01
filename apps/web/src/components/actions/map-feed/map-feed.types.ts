import type { ComponentType } from "react";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";
import type { ActionsMapDateScope } from "@/components/actions/map/actions-map-filters.utils";

export type ActionsMapCanvasComponent = ComponentType<{
  items: ActionMapItem[];
  selectedActionId?: string | null;
  fullViewport?: boolean;
}>;

export type ActionsMapFeedProps = {
  types?: ActionRecordType[] | "all";
  days: number;
  dateScope?: ActionsMapDateScope;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  limit?: number;
  presentation?: "default" | "immersive";
  showIntro?: boolean;
  fullViewport?: boolean;
  showStoriesCarousel?: boolean;
  visibleCategories?: Record<MarkerCategory, boolean>;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
};
