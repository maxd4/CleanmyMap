import type { CurrentPlaceState, CurrentPlaceStateMode, CurrentPlaceStateViews } from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreReferences, PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCoordinates, mapItemObservedAt, mapItemPostActionPollutionScore } from "@/lib/actions/data-contract";
import { presentActionPollutionProjection } from "@/lib/actions/pollution/revisit-priority";
import { formatProjectionConfidenceLabel } from "@/lib/actions/pollution/projection-confidence";
import { findCorridorHistoryForAction, groupActionsByCorridor } from "@/lib/actions/pollution/corridor-history";
import { isActionMapItem } from "../popup/action-popup-content.helpers";
import { resolveMapPlaceStateForItem } from "../filters/actions-map-display-state";
import { resolveActionPollutionScore } from "../scores/pollution-score-scope";
import {
  resolveActionMapGeometryViewModel,
  resolveGeometryRenderStyle,
  resolvePolylineDirectionMarkers,
  resolvePolylineEndpointMarkers,
  type ActionMapGeometryViewModel,
} from "./actions-map-geometry.utils";
import {
  fitActionGeometryBounds,
  resolvePointColor,
  resolvePointPollutionScore,
  resolveShapeDisplayColor,
  resolveShapePollutionCategory,
  type ShapeBasemapMode,
} from "./map-layers.shared";
import type { GeometryTooltipReading } from "./map-geometry-tooltip-content";

type ScoreModelInput = {
  item: ActionMapItem;
  geometry: ActionMapGeometryViewModel;
  currentPlaceStateViews: readonly CurrentPlaceStateViews[];
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  basemapMode: ShapeBasemapMode;
  references?: PollutionScoreReferences | null;
  referencesLoading: boolean;
  now: Date;
};

type ActionTooltipDisplayContext = {
  item: ActionMapItem;
  displayMode: CurrentPlaceStateMode;
  isGlobal: boolean;
  currentPlaceState: CurrentPlaceState | null;
  departmentActionScore: ReturnType<typeof resolveActionPollutionScore> | null;
  actionProjection: ReturnType<typeof presentActionPollutionProjection> | null;
  globalActionScore: ReturnType<typeof resolveActionPollutionScore>;
};

function resolveActionTooltipDisplay(input: ActionTooltipDisplayContext) {
  return {
    displayedScore: resolveDisplayedActionScore(input),
    displayedScoreKind: resolveDisplayedScoreKind(input),
    displayedStateLabel: resolveDisplayedStateLabel(input),
    displaySource: resolveDisplayedSource(input),
  };
}

function resolveDisplayedActionScore(input: ActionTooltipDisplayContext) {
  if (!input.isGlobal) return input.departmentActionScore?.score;
  if (input.currentPlaceState?.score !== null && input.currentPlaceState?.score !== undefined) return input.currentPlaceState.score;
  if (input.displayMode === "projected_today") return input.actionProjection?.projectedPollutionScore;
  return mapItemPostActionPollutionScore(input.item) ?? input.globalActionScore.historicalScore;
}

function resolveDisplayedScoreKind(input: ActionTooltipDisplayContext) {
  if (!input.isGlobal) return input.departmentActionScore?.score === null ? "unavailable" : "measured";
  return input.currentPlaceState?.scoreKind ?? (input.displayMode === "projected_today" ? "projected" : "measured");
}

function resolveDisplayedStateLabel(input: ActionTooltipDisplayContext) {
  if (!input.isGlobal) return input.departmentActionScore?.score === null ? "Comparaison départementale indisponible" : "Score relatif départemental";
  return input.currentPlaceState?.stateLabel ?? (input.displayMode === "projected_today" ? "Pollution projetée" : "Pollution observée");
}

function resolveDisplayedSource(input: ActionTooltipDisplayContext) {
  if (!input.isGlobal) return undefined;
  return input.currentPlaceState?.source ?? (input.displayMode === "projected_today" ? "projected" : "observed");
}

function resolveActionTooltipReading({
  item,
  displayMode,
  scoreScope,
  currentPlaceState,
  globalActionScore,
  departmentActionScore,
  actionProjection,
}: {
  item: ActionMapItem;
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  currentPlaceState: CurrentPlaceState | null;
  globalActionScore: ReturnType<typeof resolveActionPollutionScore> | null;
  departmentActionScore: ReturnType<typeof resolveActionPollutionScore> | null;
  actionProjection: ReturnType<typeof presentActionPollutionProjection> | null;
}): GeometryTooltipReading | undefined {
  if (!isActionMapItem(item) || !globalActionScore) {
    return undefined;
  }
  const isGlobal = scoreScope === "global";
  const display = resolveActionTooltipDisplay({
    item,
    displayMode,
    isGlobal,
    currentPlaceState,
    departmentActionScore,
    actionProjection,
    globalActionScore,
  });
  const projectionFields = resolveProjectionFields(actionProjection, globalActionScore);
  return {
    scoreScope,
    historicalScore: globalActionScore.historicalScore ?? 0,
    ...projectionFields,
    displayMode: isGlobal ? displayMode : undefined,
    ...display,
    displayedDate: currentPlaceState?.date ?? mapItemObservedAt(item),
    globalScore: globalActionScore.historicalScore,
    globalWasteScore: globalActionScore.wasteScore,
    globalButtsScore: globalActionScore.buttsScore,
    departmentScore: departmentActionScore?.score,
    departmentWasteScore: departmentActionScore?.wasteScore,
    departmentButtsScore: departmentActionScore?.buttsScore,
    departmentName: item.contract?.location.departmentName ?? null,
    departmentUnavailable: departmentActionScore?.score === null,
    departmentAvailability: departmentActionScore?.availability,
  };
}

function resolveProjectionFields(
  actionProjection: ReturnType<typeof presentActionPollutionProjection> | null,
  globalActionScore: ReturnType<typeof resolveActionPollutionScore>,
) {
  return {
    projectedScore: actionProjection?.projectedPollutionScore ?? globalActionScore.score ?? 0,
    elapsedDays: actionProjection?.elapsedDays ?? 0,
    isEstimate: actionProjection?.isEstimate ?? false,
    projectionConfidenceLabel: actionProjection
      ? formatProjectionConfidenceLabel(actionProjection.projectionConfidence.level)
      : "",
  };
}

export function resolveShapeLayerScoreModel(input: ScoreModelInput) {
  const {
    item,
    geometry,
    currentPlaceStateViews,
    displayMode,
    scoreScope,
    basemapMode,
    references,
    referencesLoading,
    now,
  } = input;
  const currentPlaceState = resolveMapPlaceStateForItem(currentPlaceStateViews, item, displayMode);
  const color = resolvePointColor(item, references, now, displayMode, currentPlaceState, scoreScope, referencesLoading && !references);
  const pollutionCategory = resolveShapePollutionCategory(resolvePointPollutionScore(item, references, now, displayMode, currentPlaceState, scoreScope));
  const displayColor = resolveShapeDisplayColor({ pollutionCategory, baseColor: color, basemapMode });
  const globalActionScore = isActionMapItem(item)
    ? resolveActionPollutionScore(item, references, { scope: "global", now, displayMode, currentPlaceState })
    : null;
  const departmentActionScore = isActionMapItem(item)
    ? resolveActionPollutionScore(item, references, { scope: "department" })
    : null;
  const actionProjection = isActionMapItem(item) && scoreScope === "global" && globalActionScore?.historicalScore != null
    ? presentActionPollutionProjection(globalActionScore.historicalScore, mapItemObservedAt(item), now, {
        postActionScore: mapItemPostActionPollutionScore(item),
        geometryConfidence: geometry.confidence,
        sourceCompleteness: "partial",
      })
    : null;
  return {
    currentPlaceState,
    color,
    pollutionCategory,
    displayColor,
    actionTooltipReading: resolveActionTooltipReading({
      item,
      displayMode,
      scoreScope,
      currentPlaceState,
      globalActionScore,
      departmentActionScore,
      actionProjection,
    }),
  };
}

type GeometryModelInput = {
  item: ActionMapItem;
  geometry: ActionMapGeometryViewModel;
  selectedActionId: string | null;
  hoveredActionId: string | null;
  actionItemsById: Map<string, ActionMapItem>;
  corridorHistories: ReturnType<typeof groupActionsByCorridor>;
  map: Parameters<typeof fitActionGeometryBounds>[0];
  currentPlaceStateViews: readonly CurrentPlaceStateViews[];
  displayMode: CurrentPlaceStateMode;
  scoreScope: PollutionScoreScope;
  references?: PollutionScoreReferences | null;
  referencesLoading: boolean;
  now: Date;
};

export function resolveShapeLayerGeometryModel(input: GeometryModelInput) {
  const {
    item,
    geometry,
    selectedActionId,
    hoveredActionId,
    actionItemsById,
    corridorHistories,
    map,
    currentPlaceStateViews,
    displayMode,
    scoreScope,
    references,
    referencesLoading,
    now,
  } = input;
  const isSelected = selectedActionId === item.id;
  const isHovered = hoveredActionId === item.id;
  const corridorHistory = isActionMapItem(item) ? findCorridorHistoryForAction(corridorHistories, item.id) : null;
  const corridorItems = corridorHistory && corridorHistory.actions.length >= 2
    ? corridorHistory.actions.map((action) => actionItemsById.get(action.id)).filter((candidate): candidate is ActionMapItem => Boolean(candidate))
    : undefined;
  const onViewGeometry = isActionMapItem(item) && geometry.positions.length > 1
    ? () => fitActionGeometryBounds(map, geometry.positions)
    : undefined;
  const onViewGeometryForItem = (targetItem: ActionMapItem) => {
    const targetGeometry = resolveActionMapGeometryViewModel(targetItem);
    if (targetGeometry.positions.length > 1) fitActionGeometryBounds(map, targetGeometry.positions);
  };
  const resolveCurrentPlaceStateForItem = (targetItem: ActionMapItem) => resolveMapPlaceStateForItem(currentPlaceStateViews, targetItem, displayMode);
  const resolveColorForItem = (targetItem: ActionMapItem) => resolvePointColor(targetItem, references, now, displayMode, resolveCurrentPlaceStateForItem(targetItem), scoreScope, referencesLoading && !references);
  return {
    coords: mapItemCoordinates(item),
    renderStyle: resolveGeometryRenderStyle(geometry),
    isSelected,
    corridorItems,
    corridorHistory: corridorHistory ?? undefined,
    onViewGeometry,
    onViewGeometryForItem,
    resolveCurrentPlaceStateForItem,
    resolveColorForItem,
    endpointMarkers: geometry.kind === "polyline" && (isSelected || isHovered) ? resolvePolylineEndpointMarkers(geometry) : null,
    directionMarkers: geometry.kind === "polyline" && isSelected ? resolvePolylineDirectionMarkers(geometry.positions) : [],
  };
}
