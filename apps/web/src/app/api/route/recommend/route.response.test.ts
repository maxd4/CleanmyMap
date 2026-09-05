import { describe, expect, it, vi } from "vitest";
import type { RouteRecommendationResponse } from "@/lib/route/route-response-contract";
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
  ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v1",
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
    ...(family === "predicted" ? { evidence: { family: "predicted" } } : {}),
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
            normalizedPriority: 0.82,
            normalizedTravel: 0.9,
            combinedScore: 0.85,
            feasible: true,
            budgetBeforeMinutes: 60,
            budgetAfterMinutes: 55,
            selectionReason: "Sélectionné dans le budget.",
          }]
        : [],
      orderingCriteria: [
        "combined_score_desc",
        "priority_desc",
        "incremental_travel_asc",
        "id_lexicographic",
      ] as const,
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
      dataStatus: "empty",
      isTruncated: false,
      sourceHealth: completeSourceHealth,
    },
    planning: {
      plannedStops: [],
      routeGeometry: routeGeometry(),
      plannerResult: plannerResult(),
      predictionSummary: predictionSummary(),
      eventCenteredContext: null,
      budgetPrefixApplied: false,
    },
    maxStops: 3,
    travelBudgetMinutes: 60,
    priorityVsTravel: 65,
  };
  return { ...base, ...overrides } as Parameters<typeof buildRouteRecommendationResponse>[0];
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
    });
    expect(payload.dataLayers).toBeDefined();
    expect(payload.status).toBe(payload.dataLayers.recommendation);
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
