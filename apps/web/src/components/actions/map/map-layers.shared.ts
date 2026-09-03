import type { Map as LeafletMap } from "leaflet";
import type { ActionMapItem } from "@/lib/actions/types";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  mapItemObservedAt,
  mapItemPostActionPollutionScore,
  mapItemType,
} from "@/lib/actions/data-contract";
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
  resolveItemPollutionScores,
} from "@/components/actions/map-marker-categories";
import { presentActionPollutionProjection } from "@/lib/actions/pollution/revisit-priority";
import { isActionMapItem } from "./action-popup-content.helpers";

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

  const observedScore = resolveItemPollutionScores(item, references).severityScore;
  const score = currentPlaceState?.score ?? (isActionMapItem(item)
    ? displayMode === "observed"
      ? mapItemPostActionPollutionScore(item) ?? observedScore
      : presentActionPollutionProjection(
          observedScore,
          mapItemObservedAt(item),
          now,
          { postActionScore: mapItemPostActionPollutionScore(item) },
        ).projectedPollutionScore
    : observedScore);

  return resolveDynamicColor(score);
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
};

export type InfrastructureLayerProps = {
  items: ActionMapItem[];
  visible?: boolean;
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
};
