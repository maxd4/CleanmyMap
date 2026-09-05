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
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
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

function responseInput(overrides: Record<string, unknown> = {}) {
  const base = {
    origin,
    locationPreference: { arrondissement: 4 },
    eventPressureContext: {
      pressureByArrondissement: new Map(),
      eventSignals: [],
    },
    candidateData: {
      candidates: [],
      spatialCandidates: [],
      parisPressureSnapshot: null,
      contracts: [],
      dataStatus: "empty",
      isTruncated: false,
      sourceHealth: completeSourceHealth,
    },
    planning: {
      plannedStops: [],
      routeGeometry: routeGeometry(),
      plannerResult: {
        stops: [],
        diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      },
      predictionSummary: predictionSummary(),
    },
    travelBudgetMinutes: 60,
    priorityVsTravel: 65,
  };

  return {
    ...base,
    ...overrides,
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

describe("route recommendation response contract", () => {
  it("includes dataLayers in the empty 200 response", async () => {
    installDefaultMocks();

    const response = buildRouteRecommendationResponse(responseInput());
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.dataLayers).toEqual({
      observed: "empty",
      prediction: "unavailable",
      recommendation: "empty",
    });
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });

  it("includes dataLayers for a non-empty observed response", async () => {
    installDefaultMocks();
    const observed = candidate("observed");

    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [observed],
        spatialCandidates: [observed],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "complete",
        isTruncated: false,
        sourceHealth: completeSourceHealth,
      },
      planning: {
        plannedStops: [plannedStop(observed)],
        routeGeometry: routeGeometry(),
        plannerResult: {
          stops: [],
          diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
        },
        predictionSummary: predictionSummary(),
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.dataLayers).toEqual({
      observed: "complete",
      prediction: "unavailable",
      recommendation: "ok",
    });
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });

  it("keeps a selected prediction in prediction evidence", async () => {
    installDefaultMocks();
    const predicted = candidate("predicted");
    const summary = predictionSummary("available");

    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [predicted],
        spatialCandidates: [predicted],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "complete",
        isTruncated: false,
        sourceHealth: completeSourceHealth,
      },
      planning: {
        plannedStops: [plannedStop(predicted)],
        routeGeometry: routeGeometry(),
        plannerResult: {
          stops: [],
          diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
        },
        predictionSummary: summary,
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.dataLayers.prediction).toBe("available");
    expect(payload.prediction.selectedCandidateIds).toEqual(["predicted-1"]);
    expect(payload.prediction.selected).toBe(1);
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });

  it("keeps a degraded response aligned with its recommendation layer", async () => {
    installDefaultMocks();
    const observed = candidate("observed");

    const response = buildRouteRecommendationResponse(responseInput({
      candidateData: {
        candidates: [observed],
        spatialCandidates: [observed],
        parisPressureSnapshot: null,
        contracts: [{}],
        dataStatus: "partial",
        isTruncated: true,
        sourceHealth: { ...completeSourceHealth, partial: true },
      },
      planning: {
        plannedStops: [plannedStop(observed)],
        routeGeometry: routeGeometry("fallback"),
        plannerResult: {
          stops: [],
          diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
        },
        predictionSummary: predictionSummary("partial"),
      },
    }));
    const payload: RouteRecommendationResponse = await response.json();

    expect(payload.dataLayers).toBeDefined();
    expect(payload.status).toBe("degraded");
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });
});
