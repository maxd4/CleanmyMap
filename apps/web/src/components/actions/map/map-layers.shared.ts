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
): string {
  const itemType = mapItemType(item);
  if (itemType === "clean_place") {
    return CLEAN_PLACE_COLOR;
  }

  if (itemType === "spot") {
    const contractScore = (
      item.contract as unknown as ActionDataContract | undefined
    )?.metadata.observedPollutionScore;
    const measuredScore =
      typeof contractScore === "number" && Number.isFinite(contractScore)
        ? contractScore
        : currentPlaceState?.scoreKind === "measured" &&
            typeof currentPlaceState.score === "number" &&
            Number.isFinite(currentPlaceState.score)
          ? currentPlaceState.score
          : null;

    return measuredScore === null
      ? TRASH_SPOTTER_NEUTRAL_COLOR
      : resolveDynamicColor(measuredScore);
  }

  const resolved = resolveActionPollutionScore(item, references, {
    scope: scoreScope,
    now,
    displayMode,
    currentPlaceState,
  });

  return resolved.score === null
    ? POLLUTION_SCORE_UNAVAILABLE_COLOR
    : resolveDynamicColor(resolved.score);
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
};

export type InfrastructureLayerProps = {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
};
