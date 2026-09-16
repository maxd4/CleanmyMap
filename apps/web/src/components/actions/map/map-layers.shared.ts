import type { Map as LeafletMap } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import { mapItemType } from "@/lib/actions/data-contract";
import { isTrashSpotterActionableItem } from "@/lib/actions/trash-spotter-actionable-candidates";
import type { PollutionScoreReferences } from "@/lib/actions/pollution/pollution-score";
import type {
  CurrentPlaceState,
  CurrentPlaceStateMode,
  CurrentPlaceStateViews,
} from "@/lib/actions/pollution/current-place-state";
import {
  ACTION_POLLUTION_COLOR_THRESHOLDS,
  CLEAN_PLACE_COLOR,
  TRASH_SPOTTER_NEUTRAL_COLOR,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import {
  POLLUTION_SCORE_UNAVAILABLE_COLOR,
  resolveActionPollutionScore,
} from "./pollution-score-scope";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";

export type LeafletClusterLike = {
  getChildCount: () => number;
};

export const ACTION_TRACE_HIT_AREA_WEIGHT = 18;
export const ACTION_TRACE_FIT_PADDING: [number, number] = [32, 32];
/** Visual-only loading state; unavailable remains reserved for a real null score. */
export const POLLUTION_SCORE_LOADING_COLOR = "#38bdf8";

export type ShapeBasemapMode = "light" | "dark";
export type ShapePollutionCategory = "black" | "other";
export type ShapeGeometryKind = "polyline" | "polygon";

export type ShapeCasingStyle = {
  color: "#ffffff";
  weight: number;
  opacity: number;
  fillOpacity?: number;
  dashArray?: string;
  interactive: false;
};

export function resolveShapePollutionCategory(
  score: number | null,
): ShapePollutionCategory {
  return score !== null && score >= ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK
    ? "black"
    : "other";
}

export function resolveShapeDisplayColor({
  pollutionCategory,
  baseColor,
  basemapMode,
}: {
  pollutionCategory: ShapePollutionCategory;
  baseColor: string;
  basemapMode: ShapeBasemapMode;
}): string {
  return basemapMode === "dark" && pollutionCategory === "black"
    ? "#ffffff"
    : baseColor;
}

export function resolveShapeCasingStyle({
  pollutionCategory,
  basemapMode,
  geometryKind,
  visibleWeight,
  dashArray,
}: {
  pollutionCategory: ShapePollutionCategory;
  basemapMode: ShapeBasemapMode;
  geometryKind: ShapeGeometryKind;
  visibleWeight: number;
  dashArray?: string;
}): ShapeCasingStyle | null {
  if (basemapMode !== "dark" || pollutionCategory === "black") {
    return null;
  }

  return {
    color: "#ffffff",
    weight: visibleWeight + 2,
    opacity: 0.95,
    fillOpacity: geometryKind === "polygon" ? 0 : undefined,
    dashArray,
    interactive: false,
  };
}

export function fitActionGeometryBounds(
  map: Pick<LeafletMap, "fitBounds">,
  positions: [number, number][],
): boolean {
  if (positions.length < 2) {
    return false;
  }

  map.fitBounds(positions, {
    padding: ACTION_TRACE_FIT_PADDING,
    maxZoom: 16,
    animate: true,
  });
  return true;
}

export function resolvePointColor(
  item: ActionMapItem,
  references?: PollutionScoreReferences | null,
  now: string | Date | number = new Date(),
  displayMode: CurrentPlaceStateMode = "projected_today",
  currentPlaceState: CurrentPlaceState | null = null,
  scoreScope: PollutionScoreScope = "global",
  referencesLoading = false,
): string {
  const itemType = mapItemType(item);
  if (itemType === "clean_place") {
    return CLEAN_PLACE_COLOR;
  }

  const resolvedScore = resolvePointPollutionScore(
    item,
    references,
    now,
    displayMode,
    currentPlaceState,
    scoreScope,
  );

  if (resolvedScore === null) {
    if (itemType === "action" && referencesLoading && !references) {
      return POLLUTION_SCORE_LOADING_COLOR;
    }

    return itemType === "spot"
      ? TRASH_SPOTTER_NEUTRAL_COLOR
      : POLLUTION_SCORE_UNAVAILABLE_COLOR;
  }

  return resolveDynamicColor(resolvedScore);
}

export function resolvePointPollutionScore(
  item: ActionMapItem,
  references?: PollutionScoreReferences | null,
  now: string | Date | number = new Date(),
  displayMode: CurrentPlaceStateMode = "projected_today",
  currentPlaceState: CurrentPlaceState | null = null,
  scoreScope: PollutionScoreScope = "global",
): number | null {
  const itemType = mapItemType(item);
  if (itemType === "clean_place") {
    return null;
  }

  if (itemType === "spot") {
    const contractScore = (
      item.contract as unknown as ActionDataContract | undefined
    )?.metadata.observedPollutionScore;
    return typeof contractScore === "number" && Number.isFinite(contractScore)
      ? contractScore
      : currentPlaceState?.scoreKind === "measured" &&
          typeof currentPlaceState.score === "number" &&
          Number.isFinite(currentPlaceState.score)
        ? currentPlaceState.score
        : null;
  }

  return resolveActionPollutionScore(item, references, {
    scope: scoreScope,
    now,
    displayMode,
    currentPlaceState,
  }).score;
}

export function isTrashSpotterItem(item: ActionMapItem): boolean {
  return isTrashSpotterActionableItem(item);
}

export type ActionPointLayerProps = {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  displayMode?: CurrentPlaceStateMode;
  currentPlaceStateViews?: readonly CurrentPlaceStateViews[];
  scoreScope?: PollutionScoreScope;
  basemapMode?: ShapeBasemapMode;
};

export type InfrastructureLayerProps = {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
};
