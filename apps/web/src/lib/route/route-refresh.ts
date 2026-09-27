import type { ActionEditorRecord } from "@/lib/actions/http";
import { createOperationalRouteFromRecommendation } from "./route-operational";
import type { RoutePlannerProof } from "./route-planner-proof-contract";
import type { RoutePlannerSnapshot } from "./route-calibration-types";
import type { RouteRecommendationResponse } from "./route-response-contract";
import { MAX_ROUTE_GROUP_COUNT } from "./route-group-partition";
import {
  buildActionRouteVersionCalculation,
  type ActionRouteVersionCalculation,
} from "./route-active-version";
import {
  createRouteRecommendationSubmission,
  type RouteRecommendationSubmission,
} from "@/components/sections/rubriques/route/route-request";

export type RouteRefreshProposal = {
  response: RouteRecommendationResponse;
  plannerSnapshot: RoutePlannerSnapshot;
  plannerProof: RoutePlannerProof;
  operationalRoute: ReturnType<typeof createOperationalRouteFromRecommendation>;
  calculation: ActionRouteVersionCalculation;
};

export type RouteRefreshComparison = {
  identical: boolean;
  current: ActionRouteVersionCalculation;
  proposal: ActionRouteVersionCalculation;
  keptStopIds: string[];
  addedStopIds: string[];
  removedStopIds: string[];
  priorityChanges: Array<{
    id: string;
    from: string;
    to: string;
  }>;
};

export type RouteRefreshSubmissionOverrides = {
  volunteers?: number;
  groupCount?: number;
};

export function compatibleRouteGroupCounts(volunteers: number): number[] {
  const maximum = Math.min(MAX_ROUTE_GROUP_COUNT, Math.max(0, Math.trunc(volunteers)));
  return Array.from({ length: Math.max(0, maximum - 1) }, (_, index) => index + 2);
}

function scheduledDateTime(date: string, time: string | null | undefined): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time ?? "")
    ? `${date}T${time}`
    : undefined;
}

function refreshOrigin(
  action: ActionEditorRecord,
  parameters: RoutePlannerSnapshot["parameters"],
): { latitude: number; longitude: number; source: "map" } | null {
  const latitude = typeof action.latitude === "number" && Number.isFinite(action.latitude)
    ? action.latitude
    : parameters.origin.latitude;
  const longitude = typeof action.longitude === "number" && Number.isFinite(action.longitude)
    ? action.longitude
    : parameters.origin.longitude;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude, source: "map" }
    : null;
}

function refreshOptions(
  action: ActionEditorRecord,
  parameters: RoutePlannerSnapshot["parameters"],
  overrides: RouteRefreshSubmissionOverrides,
) {
  return {
    priorityVsTravel: parameters.priorityVsTravel,
    travelBudgetMinutes: parameters.travelBudgetMinutes,
    maxStops: parameters.maxStops,
    riskFocus: parameters.effectiveRiskFocus,
    volunteers: overrides.volunteers ?? parameters.volunteers,
    groupCount: overrides.groupCount ?? parameters.groupCount,
    pickupPreference: parameters.pickupPreference,
    scheduledStartAt: scheduledDateTime(action.actionDate, action.eventStartTime),
    scheduledEndAt: scheduledDateTime(action.actionDate, action.eventEndTime),
  };
}

export function buildRouteRefreshSubmission(
  action: ActionEditorRecord,
  overrides: RouteRefreshSubmissionOverrides = {},
): RouteRecommendationSubmission | null {
  const preparation = action.preparationData;
  const snapshot = preparation?.routeCalibrationContext?.plannerSnapshot;
  const parameters = preparation?.routeVersioning?.active.calculation.parameters ?? snapshot?.parameters;
  if (!parameters) return null;
  const origin = refreshOrigin(action, parameters);
  if (!origin) return null;

  return createRouteRecommendationSubmission(
    1,
    refreshOptions(action, parameters, overrides),
    origin,
    parameters.planningMode,
  );
}

function versionedStopFromSnapshot(stop: RoutePlannerSnapshot["selectedStops"][number]) {
  return {
    id: stop.id,
    label: stop.label,
    score: stop.score,
    priorityReason: stop.priorityReason,
    ...(stop.evidence?.family
      ? {
          sourceFamily: stop.evidence.family,
          ...(stop.evidence.family === "observed"
            ? { sourceObservedAt: stop.evidence.observedAt }
            : {}),
        }
      : {}),
  };
}

function proposalExplanation(response: RouteRecommendationResponse): string | null {
  return response.tradeoffs[0] ?? response.trace.warnings[0] ?? response.trace.approximations[0] ?? null;
}

export function buildRouteRefreshProposal(
  response: RouteRecommendationResponse,
): RouteRefreshProposal | null {
  if (!response.plannerSnapshot || !response.plannerProof) return null;
  const operationalRoute = createOperationalRouteFromRecommendation(response);
  const calculation = buildActionRouteVersionCalculation(response.plannerSnapshot, {
    snapshotHash: response.plannerProof.snapshotHash,
    metrics: {
      distanceKm: response.travelDistanceKm,
      walkingMinutes: response.travelMinutes,
      collectionMinutes:
        response.actionMinutesEstimate ?? response.operationalBudget?.actionMinutes ?? null,
      totalMinutes:
        response.totalMinutesEstimate ?? response.operationalBudget?.totalMinutes ?? null,
    },
    stops: response.stops.map(versionedStopFromSnapshot),
    explanation: proposalExplanation(response),
  });
  return {
    response,
    plannerSnapshot: response.plannerSnapshot,
    plannerProof: response.plannerProof,
    operationalRoute,
    calculation,
  };
}

function currentCalculation(action: ActionEditorRecord): ActionRouteVersionCalculation | null {
  const active = action.preparationData?.routeVersioning?.active;
  if (active) return active.calculation;
  const snapshot = action.preparationData?.routeCalibrationContext?.plannerSnapshot;
  return snapshot ? buildActionRouteVersionCalculation(snapshot) : null;
}

export function compareRouteRefresh(
  action: ActionEditorRecord,
  proposal: RouteRefreshProposal,
): RouteRefreshComparison | null {
  const current = currentCalculation(action);
  if (!current) return null;
  const currentStops = new Map(current.stops.map((stop) => [stop.id, stop]));
  const proposalStops = new Map(proposal.calculation.stops.map((stop) => [stop.id, stop]));
  const keptStopIds = [...currentStops.keys()].filter((id) => proposalStops.has(id));
  const addedStopIds = [...proposalStops.keys()].filter((id) => !currentStops.has(id));
  const removedStopIds = [...currentStops.keys()].filter((id) => !proposalStops.has(id));
  const priorityChanges = keptStopIds.flatMap((id) => {
    const from = currentStops.get(id)?.priorityReason;
    const to = proposalStops.get(id)?.priorityReason;
    return from && to && from !== to ? [{ id, from, to }] : [];
  });
  const identical =
    current.snapshotHash !== null &&
    current.snapshotHash === proposal.calculation.snapshotHash;
  return {
    identical,
    current,
    proposal: proposal.calculation,
    keptStopIds,
    addedStopIds,
    removedStopIds,
    priorityChanges,
  };
}
