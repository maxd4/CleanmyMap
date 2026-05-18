import type { ComponentType } from "react";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
import type { MarkerCategory } from "@/components/actions/map-marker-categories";

export type ActionsMapCanvasComponent = ComponentType<{
  items: ActionMapItem[];
  selectedActionId?: string | null;
  fullViewport?: boolean;
}>;

export type ActionsMapFeedProps = {
  types?: ActionRecordType[] | "all";
  days: number;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  presentation?: "default" | "immersive";
  showIntro?: boolean;
  fullViewport?: boolean;
  visibleCategories?: Record<MarkerCategory, boolean>;
  selectedActionId?: string | null;
  onOpenAction?: (actionId: string) => void;
};
