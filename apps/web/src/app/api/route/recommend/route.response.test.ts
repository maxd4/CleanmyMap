import { describe, expect, it, vi } from "vitest";
import type { RouteRecommendationResponse } from "@/lib/route/route-response-contract";
import type { RouteGroupPartitionResult } from "@/lib/route/route-group-partition";
import { buildRouteRecommendationResponse } from "./route.response";

const resolveRouteDataLayersMock = vi.hoisted(() => vi.fn());
const applyOriginRouteGeometryLegsMock = vi.hoisted(() => vi.fn());
const buildHotspotsMock = vi.hoisted(() => vi.fn());
const buildProactiveAssistantMock = vi.hoisted(() => vi.fn());
const defaultRouteAssistantPayloadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/route/route-data-status", () => ({
  resolveRouteDataLayers: resolveRouteDataLayersMock,
}));
vi.mock("@/lib/route/route-contract", () => ({
  applyOriginRouteGeometryLegs: applyOriginRouteGeometryLegsMock,
}));
vi.mock("@/lib/route/recommendation-assistant", () => ({
  buildHotspots: buildHotspotsMock,
  buildProactiveAssistant: buildProactiveAssistantMock,
  defaultRouteAssistantPayload: defaultRouteAssistantPayloadMock,
}));
vi.mock("@/lib/route/route-planner", () => ({
      ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v2",
  routeDistanceKm: vi.fn(() => 1),
  travelMinutesForDistance: vi.fn(() => 5),
}));

const origin = { latitude: 48.85, longitude: 2.35, source: "browser" as const };
const completeSourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["spots"],
  warnings: [],
};

function routeGeometry(mode: "network" | "fallback" = "network") {
  return {
    isLoop: true,
    origin: [48.85, 2.35] as [number, number],
    returnLeg: { fromStopIndex: 1, toStopIndex: 2, distanceKm: 0.8, estimatedMinutes: 4 },
    coordinates: [],
    distanceKm: mode === "network" ? 2 : 1,
    durationMinutes: mode === "network" ? 12 : 8,
    legs: [],
    provider: mode === "network" ? "fossgis-osrm" : "none",
    profile: mode === "network" ? "foot" : null,
    mode,
    estimated: mode === "fallback",
  };
}

function predictionSummary(
  status: "available" | "partial" | "unavailable" = "unavailable",
) {
  return {
    status,
    source: "urban-pressure-model" as const,
    modelVersion: status === "unavailable" ? null : "paris-pressure-v1",
    snapshot: null,
    riskFocus: "all" as const,
    zonesConsidered: 0,
    candidatesConsidered: 0,
    admitted: 0,
    admittedCandidateIds: [],
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    excludedByFinalRoutingBudget: 0,
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    finalRoutingBudgetExcludedCandidateIds: [],
    selected: 0,
    selectedCandidateIds: [],
    excludedByCorridor: 0,
    deduplicated: 0,
    warnings: [],
  };
}

function candidate(family: "observed" | "predicted") {
  return {
    id: `${family}-1`,
    label: family === "observed" ? "Spot observé" : "Zone prédite",
    latitude: 48.86,
    longitude: 2.36,
    score: 82,
    reason: family === "observed" ? "Signalement validé" : "Pression estimée",
    family,
    safety: { isEligible: true, specializationReason: null },
    ...(family === "predicted"
      ? { evidence: { family: "predicted" as const } }
      : {
          evidence: {
            family: "observed" as const,
            source: "trash_spotter_spots" as const,
            proof: "validated" as const,
            observedAt: "2026-08-20T10:00:00.000Z",
          },
        }),
  };
}

function plannedStop(candidateValue: ReturnType<typeof candidate>) {
  return {
    candidate: candidateValue,
    incrementalDistanceKm: 1,
    incrementalTravelMinutes: 5,
    cumulativeTravelMinutes: 5,
  };
}

function plannerResult(candidateId?: string) {
  const orderingCriteria = [
    "combined_score_desc",
    "priority_desc",
    "incremental_travel_asc",
    "id_lexicographic",
  ] satisfies [
    "combined_score_desc",
    "priority_desc",
    "incremental_travel_asc",
    "id_lexicographic",
  ];
  return {
    stops: [],
    diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
    audit: {
      evaluations: [],
      selections: candidateId
        ? [{
            candidateId,
            step: 1,
            incrementalDistanceKm: 1,
            incrementalTravelMinutes: 5,
            cumulativeTravelMinutes: 5,
            returnDistanceKm: 1,
            returnTravelMinutes: 5,
            loopDistanceKm: 2,
            loopTravelMinutes: 10,
            budgetAfterReturnMinutes: 50,
            normalizedPriority: 0.82,
            normalizedTravel: 0.9,
            combinedScore: 0.85,
            feasible: true,
            budgetBeforeMinutes: 60,
            budgetAfterMinutes: 55,
            selectionReason: "Sélectionné dans le budget.",
          }]
        : [],
      orderingCriteria,
    },
  };
}

function groupPartition(): RouteGroupPartitionResult {
  return {
    volunteers: 1,
    groupCount: 1,
    groups: [{
      groupIndex: 1,
      volunteerCount: 1,
      origin,
      candidateIds: [],
      estimatedDistanceKm: 0,
      estimatedDurationMinutes: 0,
      targetCount: 0,
    }],
    metrics: {
      sharedTargetRatio: 0,
      coverageGain: 0,
      balanceDistance: 0,
      balanceDuration: 0,
      balanceTargetCount: 0,
    },
    audit: {
      mode: "single-group-compatible",
      planningMode: "free",
      consideredCandidateIds: [],
      excludedUnsafeCandidateIds: [],
      excludedByPartitionBoundCandidateIds: [],
      assignments: [],
      overlapCosts: {
        sameTarget: 0,
        samePredictiveZone: 0,
        nearbyCorridor: 0,
        networkSharedDistanceKm: null,
        networkDistanceMeasured: false,
      },
    },
  };
}

function responseInput(overrides: Record<string, unknown> = {}) {
  const base = {
    origin,
    locationPreference: { arrondissement: 4 },
    eventPressureContext: { pressureByArrondissement: new Map(), eventSignals: [] },
    candidateData: {
      candidates: [],
      spatialCandidates: [],
      actionableCandidates: [],
      parisPressureSnapshot: null,
      contracts: [],
      routeEventSignalContext: {
        candidatePressureById: new Map(),
        completedEventsConsidered: 0,
        geolocatedCompletedEvents: 0,
        eventsWithoutCoordinates: 0,
        futureEventSignals: [],
        sourceAvailable: false,
        warnings: [],
      },
      dataStatus: "empty",
      isTruncated: false,
      sourceHealth: completeSourceHealth,
    },
    planning: {
      plannedStops: [],
      routeGeometry: routeGeometry(),
      plannerResult: plannerResult(),
      predictionSummary: predictionSummary(),
      effectiveRiskFocus: "all",
      eventCenteredContext: null,
      budgetPrefixApplied: false,
      groupPartition: groupPartition(),
    },
    maxStops: 3,
    travelBudgetMinutes: 60,
    priorityVsTravel: 65,
    volunteers: 1,
    groupCount: 1,
    pickupPreference: "balanced",
  };
  return {
    ...base,
    ...overrides,
    planning: {
      ...base.planning,
      ...(overrides.planning as Record<string, unknown> | undefined),
    },
  } as Parameters<typeof buildRouteRecommendationResponse>[0];
}

function installDefaultMocks() {
  resolveRouteDataLayersMock.mockImplementation((input) => ({
    observed: input.observed.candidateCount === 0 ? "empty" : "complete",
    prediction: input.prediction.status,
    recommendation:
      input.selectedCount === 0
        ? "empty"
        : input.observed.sourceHealth.partial || input.routeGeometryMode === "fallback"
          ? "degraded"
          : "ok",
  }));
  applyOriginRouteGeometryLegsMock.mockImplementation((stops) => stops);
  buildHotspotsMock.mockReturnValue([]);
  buildProactiveAssistantMock.mockReturnValue({
    actNow: "",
    criticalNearby: "",
    mostUsefulAction: "",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  });
  defaultRouteAssistantPayloadMock.mockReturnValue({
    actNow: "",
    criticalNearby: "",
    mostUsefulAction: "",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  });
}

describe("route recommendation response trace contract", () => {
  it("returns a trace and aligned data layers for an empty response", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput());
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.trace).toBeDefined();
    expect(payload.trace.selectedStops).toEqual([]);
    expect(payload.dataLayers).toBeDefined();
    expect(payload.status).toBe(payload.dataLayers.recommendation);
    expect(payload).toMatchObject({
      isLoop: true,
      volunteers: 1,
      groupCount: 1,
      constraintsApplied: { pickupPreference: "balanced" },
      groups: [{ groupIndex: 1 }],
      loop: {
        isLoop: true,
        returnDistanceKm: 0.8,
        returnMinutes: 4,
      },
    });
  });

  it("returns final observed selection evidence for a non-empty response", async () => {
    installDefaultMocks();
    const observed = candidate("observed");
    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [observed],
        spatialCandidates: [observed],
        actionableCandidates: [observed],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "complete",
        isTruncated: false,
        sourceHealth: completeSourceHealth,
      },
      planning: {
        plannedStops: [plannedStop(observed)],
        routeGeometry: routeGeometry(),
        plannerResult: plannerResult(observed.id),
        predictionSummary: predictionSummary(),
        eventCenteredContext: null,
        budgetPrefixApplied: false,
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.trace.selectedStops[0]).toMatchObject({
      id: observed.id,
      targetFamily: "observed",
      evidence: observed.evidence,
    });
    expect(payload.dataLayers).toBeDefined();
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });

  it("returns the explicit pickup preference in constraints and trace", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput({
      pickupPreference: "waste",
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.constraintsApplied).toEqual({ pickupPreference: "waste" });
    expect(payload.trace.parameters.pickupPreference).toBe("waste");
    expect(payload.trace.parameters.effectiveRiskFocus).toBe("all");
  });

  it("keeps prediction evidence distinct from observed evidence", async () => {
    installDefaultMocks();
    const predicted = candidate("predicted");
    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [predicted],
        spatialCandidates: [predicted],
        actionableCandidates: [predicted],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "complete",
        isTruncated: false,
        sourceHealth: completeSourceHealth,
      },
      planning: {
        plannedStops: [plannedStop(predicted)],
        routeGeometry: routeGeometry(),
        plannerResult: plannerResult(predicted.id),
        predictionSummary: predictionSummary("available"),
        eventCenteredContext: null,
        budgetPrefixApplied: false,
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.trace.selectedStops[0]?.targetFamily).toBe("predicted");
    expect(payload.dataLayers.prediction).toBe("available");
    expect(payload.dataLayers.observed).toBe("complete");
  });

  it("keeps degraded status aligned with the recommendation layer", async () => {
    installDefaultMocks();
    const observed = candidate("observed");
    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [observed],
        spatialCandidates: [observed],
        actionableCandidates: [observed],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "partial",
        isTruncated: true,
        sourceHealth: { ...completeSourceHealth, partial: true },
      },
      planning: {
        plannedStops: [plannedStop(observed)],
        routeGeometry: routeGeometry("fallback"),
        plannerResult: plannerResult(observed.id),
        predictionSummary: predictionSummary("partial"),
        eventCenteredContext: null,
        budgetPrefixApplied: false,
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.trace.fallbacks).toContain("fallback_route_geometry");
    expect(payload.status).toBe("degraded");
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });
});
