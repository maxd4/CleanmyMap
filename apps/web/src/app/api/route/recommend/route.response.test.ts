import { describe, expect, it, vi } from "vitest";
import type { RouteRecommendationResponse } from "@/lib/route/route-response-contract";
import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import type { RouteGroupPartitionResult } from "@/lib/route/route-group-partition";
import type { RouteCalibrationContext } from "@/lib/route/route-calibration";
import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import type { resolveRouteDataLayers } from "@/lib/route/route-data-status";
import type { applyOriginRouteGeometryLegs } from "@/lib/route/route-contract";
import { ROUTE_TERRITORIAL_GUIDED_VERSION } from "@/lib/route/route-planning-mode";
import { buildRouteRecommendationResponse } from "./route.response";
import {
  buildEmptyRouteResponsePayload,
  buildResultRouteResponsePayload,
} from "./route.response.payload";
import {
  buildRouteOperationalContext,
  buildRouteProofContext,
} from "./route.response.builders";

const resolveRouteDataLayersMock = vi.hoisted(() => vi.fn<typeof resolveRouteDataLayers>());
const applyOriginRouteGeometryLegsMock = vi.hoisted(() => vi.fn<typeof applyOriginRouteGeometryLegs>());
const buildHotspotsMock = vi.hoisted(() => vi.fn());
const buildProactiveAssistantMock = vi.hoisted(() => vi.fn());
const defaultRouteAssistantPayloadMock = vi.hoisted(() => vi.fn());

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readRouteResponse(response: Response): Promise<RouteRecommendationResponse> {
  const raw: unknown = await response.json();
  if (!isRecord(raw) || !["isLoop", "planningMode", "status", "dataStatus", "dataLayers", "sourceHealth", "origin", "stops", "prediction", "trace", "routeGeometry"].every((key) => key in raw)) {
    throw new Error("La réponse de recommandation de route est invalide.");
  }
  return raw as RouteRecommendationResponse;
}

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

const guidedBudget = {
  totalMinutes: 90,
  organizationMarginMinutes: 15,
  minimumCollectionMinutes: 45,
  travelMaxMinutes: 30,
} as const;

function responseProjection(): PedestrianRiskProjectionSnapshot {
  return {
    schemaVersion: "paris-pedestrian-risk-projection-v1",
    projectionKey: "paris-pantheon-jardin-des-plantes",
    policyVersion: "segment-zonal-neutral-v1",
    projectionVersionId: "projection-response-test",
    networkVersionId: "network-response-test",
    generatedAt: "2026-11-04T10:00:00.000Z",
    sourceVersions: {
      networkKey: "pilot",
      networkImporterVersion: "importer-v1",
      networkSourceSha256: "sha",
      networkSourceRetrievedAt: "2026-11-04T09:00:00.000Z",
      pressureSnapshotId: "pressure-1",
      pressureSchemaVersion: "paris-pressure-v1",
      pressureGeneratedAt: "2026-11-04T08:00:00.000Z",
      pressureRefreshedAt: "2026-11-04T08:30:00.000Z",
      riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
      serviceabilitySnapshotId: null,
      serviceabilitySchemaVersion: null,
      serviceabilityModelVersion: null,
      serviceabilityGeneratedAt: null,
      serviceabilityRefreshedAt: null,
    },
    counts: { sourceEdges: 1, projectedSegments: 1, predictedSegments: 1, unavailableSegments: 0, zonesIntersected: 1 },
    segments: [{
      projectionSegmentId: "segment-response-test",
      edgeKey: "edge-response-test",
      osmWayId: "way-response-test",
      segmentIndex: 0,
      direction: "forward",
      fromNodeId: "a",
      toNodeId: "b",
      lengthM: 100,
      intersectionLengthM: 100,
      coordinates: [[48.85, 2.35], [48.851, 2.351]],
      midpoint: [48.8505, 2.3505],
      zoneId: "iris-response-test",
      intersectedZoneIds: ["iris-response-test"],
      effectiveResolution: "iris",
      riskStatus: "predicted",
      wasteRisk: 70,
      cigaretteButtRisk: 30,
      mixedRisk: 50,
      wasteConfidence: null,
      cigaretteButtConfidence: null,
      wasteFactors: null,
      cigaretteButtFactors: null,
      availableFactors: { waste: [], cigaretteButts: [] },
      missingFactors: { waste: [], cigaretteButts: [] },
      serviceability: null,
      sourceVersions: {} as PedestrianRiskProjectionSnapshot["sourceVersions"],
      provenance: [],
      notes: [],
    }],
  };
}

function guidedGroupRoute(
  groupIndex: number,
  distanceKm: number,
  durationMinutes: number,
  withinBudget: boolean,
) {
  const waypoint = {
    id: `group-${groupIndex}-waypoint`,
    label: `Passage ${groupIndex}`,
    latitude: 48.851 + groupIndex / 1000,
    longitude: 2.351,
    order: 0,
  };
  const geometry = {
    ...routeGeometry("network"),
    coordinates: [
      [48.85, 2.35],
      [waypoint.latitude, waypoint.longitude],
      [48.85, 2.35],
    ] as [number, number][],
    distanceKm,
    durationMinutes,
  };
  return {
    groupIndex,
    label: `Groupe ${groupIndex}`,
    volunteerCount: 5,
    origin,
    candidateIds: [],
    reservedCandidateIds: [],
    estimatedDistanceKm: distanceKm,
    estimatedDurationMinutes: durationMinutes,
    targetCount: 0,
    stops: [],
    routeGeometry: geometry,
    travelDistanceKm: distanceKm,
    travelMinutes: durationMinutes,
    travelBudgetMinutes: guidedBudget.travelMaxMinutes,
    withinBudget,
    plannedWaypoints: [waypoint],
    plannedSector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 },
    guidedBudget,
    guidedRouting: {
      availability: "network" as const,
      loopVerified: true,
      originVerified: true,
      waypointOrderVerified: true,
      waypointIds: [waypoint.id],
      sectorDeviationKm: null,
      sectorWithinBounds: false,
      sectorStatus: "unknown" as const,
      warning: withinBudget ? null : "La boucle guidée ne respecte pas le budget utilisateur déclaré.",
      budget: {
        ...guidedBudget,
        travelMinutes: durationMinutes,
        collectionMinutesAvailable: Math.max(0, guidedBudget.totalMinutes - guidedBudget.organizationMarginMinutes - durationMinutes),
        withinBudget,
      },
    },
  };
}

describe("route recommendation response trace contract", () => {
  it("publishes the same versioned projection metadata used by the planner", async () => {
    installDefaultMocks();
    const response = await readRouteResponse(buildRouteRecommendationResponse(responseInput({
      pedestrianRiskProjection: responseProjection(),
      planning: {
        segmentSelection: { selectedSegments: 1 },
      },
    })));

    expect(response.riskHeatmap).toMatchObject({
      schemaVersion: "route-risk-heatmap-v1",
      projectionVersionId: "projection-response-test",
      segments: [{ projectionSegmentId: "segment-response-test", wasteRisk: 70, cigaretteButtRisk: 30, mixedRisk: 50 }],
    });
    expect(response.plannerRiskContext).toMatchObject({
      schemaVersion: "route-planner-risk-context-v1",
      source: "materialized_pedestrian_risk_projection",
      projectionVersionId: "projection-response-test",
      selectedSegments: 1,
    });
    expect(response.pollutionPotential).toMatchObject({
      schemaVersion: "route-pollution-potential-v1",
      status: "unavailable",
      value: null,
      selectedCategory: "mixed",
      version: {
        projectionVersionId: "projection-response-test",
        riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
      },
    });
    expect(response.pollutionPotential?.limitations).toContain("Catalogue de références pré-calculé absent.");
    expect(response.pollutionRelevance).toMatchObject({
      schemaVersion: "route-pollution-relevance-v1",
      policyVersion: "route-pollution-relevance-v1",
      status: "unavailable",
      warning: "unavailable",
      alternativeSearch: { relevant: false, reason: "unavailable" },
    });
    expect(response.calibrationContext?.plannerSnapshot?.pollutionRelevance).toMatchObject({
      policyVersion: "route-pollution-relevance-v1",
      warning: "unavailable",
    });
  });

  it("publishes an open route even when no scientific stops are selected", async () => {
    installDefaultMocks();
    const openRouteGeometry = {
      ...routeGeometry(),
      isLoop: false as const,
      returnLeg: null,
      coordinates: [[48.85, 2.35], [48.86, 2.36]] as [number, number][],
      legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 8 }],
      distanceKm: 1,
      durationMinutes: 8,
    };
    const response = await readRouteResponse(buildRouteRecommendationResponse(responseInput({
      routeTopology: "open",
      planning: { routeGeometry: openRouteGeometry },
    })));

    expect(response.stops).toEqual([]);
    expect(response.routeTopology).toBe("open");
    expect(response.isLoop).toBe(false);
    expect(response.trace.routeTopology).toBe("open");
    expect(response.trace.isLoop).toBe(false);
    expect(response.loop.isLoop).toBe(false);
    expect(response.routeGeometry.returnLeg).toBeNull();
    expect(response.travelDistanceKm).toBe(1);
    expect(response.travelMinutes).toBe(8);
  });

  it("describes open guided groups as open routes in the trace", async () => {
    installDefaultMocks();
    const openGroupRoutes = [guidedGroupRoute(1, 4, 20, true), guidedGroupRoute(2, 5, 25, true)].map((group) => ({
      ...group,
      routeGeometry: {
        ...group.routeGeometry,
        isLoop: false as const,
        returnLeg: null,
        coordinates: group.routeGeometry.coordinates.slice(0, -1),
      },
      guidedRouting: { ...group.guidedRouting, loopVerified: false },
    }));
    const response = await readRouteResponse(buildRouteRecommendationResponse(responseInput({
      routeTopology: "open",
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: guidedBudget,
        groups: [],
      },
      guidedBudget,
      volunteers: 10,
      groupCount: 2,
      planning: {
        groupRoutes: openGroupRoutes,
        multiRouteMetrics: {
          groupCount: 2,
          volunteers: 10,
          totalDistanceKm: 9,
          totalDurationMinutes: 45,
          coverageGain: 0,
          sharedTargetRatio: 0,
          sharedDistanceKm: null,
          sharedDistanceRatio: null,
          balanceDistance: 1,
          balanceDuration: 5,
          balanceTargetCount: 0,
          balanceVolunteerCount: 0,
          fallbackGroupCount: 0,
          networkDistanceMeasured: true,
        },
      },
    })));

    expect(response.trace.multiRoute?.constraints).toContain(
      "Chaque groupe conserve une origine commune et un trajet ouvert jusqu’à son arrivée.",
    );
    expect(response.trace.multiRoute?.constraints).not.toContain(
      "Chaque groupe conserve une origine commune et une boucle fermée.",
    );
  });
  it("keeps the operational, proof and payload stages independently aligned", async () => {
    installDefaultMocks();
    const input = responseInput();
    const operational = buildRouteOperationalContext(input);
    const proofs = buildRouteProofContext(input, operational);

    expect(operational.multiRoute.groupCount).toBe(input.groupCount);
    expect(proofs.plannerProof.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(buildEmptyRouteResponsePayload(input, operational, proofs).stops).toEqual([]);
    expect(buildResultRouteResponsePayload({
      ...input,
      planning: {
        ...input.planning,
        plannedStops: [plannedStop(candidate("observed"))] as unknown as typeof input.planning.plannedStops,
      },
    }, operational, proofs).scoreBreakdown.priority).toBe(82);
  });

  it("exposes an explicit unknown corridor handoff when no side proof exists", async () => {
    installDefaultMocks();

    const response = buildRouteRecommendationResponse(responseInput());
    const payload = await readRouteResponse(response);

    expect(payload.streetCleaningCorridors).toMatchObject({
      schemaVersion: "street-cleaning-corridor-v1",
      status: "unknown",
      sourceStatus: "unavailable",
      fallback: "unknown",
      corridors: [],
    });
  });

  it("carries the forecast snapshot through response, trace and planner snapshot", async () => {
    installDefaultMocks();
    const weatherContext: PlannerWeatherContext = {
      version: "planner-weather-snapshot-v1",
      provider: "open-meteo",
      source: "forecast",
      fetchedAt: "2026-09-14T08:00:00.000Z",
      coveredWindow: {
        startAt: "2026-09-15T10:00",
        endAt: "2026-09-15T12:00",
      },
      status: "available",
      weatherStatus: "available",
      location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
      hourly: [],
      summary: {
        temperatureC: 20,
        apparentTemperatureC: 20,
        precipitationMm: 0,
        precipitationProbabilityPct: 10,
        windKmh: 12,
        gustKmh: 20,
        weatherCode: 1,
      },
    };
    const response = buildRouteRecommendationResponse(responseInput({ weatherContext }));
    const payload = await readRouteResponse(response);

    expect(payload.weatherContext).toEqual(weatherContext);
    expect(payload.trace.weatherContext).toEqual(weatherContext);
    expect(payload.calibrationContext?.plannerSnapshot?.weatherContext).toEqual(weatherContext);
  });

  it("returns a trace and aligned data layers for an empty response", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput());
    const payload = await readRouteResponse(response);

    expect(payload.trace).toBeDefined();
    expect(payload.trace.selectedStops).toEqual([]);
    expect(payload.calibrationContext).toMatchObject({
      version: "action-route-calibration-v3",
      routeEngineVersion: "route-planner-v2",
      volunteersExpected: 1,
      groupCount: 1,
      candidates: [],
      plannerSnapshotIntegrity: {
        status: "server_verified",
        proofVersion: "route-planner-proof-v1",
      },
    });
    expect(payload.plannerSnapshot).toEqual(payload.calibrationContext?.plannerSnapshot);
    expect(payload.plannerProof?.proofVersion).toBe("route-planner-proof-v1");
    expect(payload.plannerProof?.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.calibrationContext?.plannerSnapshot).toMatchObject({
      version: "route-planner-snapshot-v1",
      generatedAt: payload.generatedAt,
      engineVersion: "route-planner-v2",
      cleanupWorkloadVersion: "route-cleanup-workload-v1",
      selectedCandidateIds: [],
      parameters: {
        travelBudgetMinutes: 60,
        maxStops: 3,
        priorityVsTravel: 65,
        volunteers: 1,
        groupCount: 1,
      },
      distance: {
        totalKm: 2,
        travelMinutes: 12,
        returnDistanceKm: 0.8,
        returnMinutes: 4,
      },
      groups: [{ groupIndex: 1, volunteerCount: 1, targetCount: 0 }],
    });
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
    const payload = await readRouteResponse(response);

    expect(payload.trace.selectedStops[0]).toMatchObject({
      id: observed.id,
      targetFamily: "observed",
      evidence: observed.evidence,
    });
    expect(payload.calibrationContext?.candidates).toHaveLength(1);
    expect(payload.calibrationContext?.candidates[0]).toMatchObject({
      candidateId: observed.id,
      family: "observed",
      cleanupWorkload: {
        modelVersion: "route-cleanup-workload-v1",
        status: "excluded",
      },
    });
    expect(payload.calibrationContext?.plannerSnapshot?.selectedCandidateIds).toEqual([
      observed.id,
    ]);
    expect(payload.calibrationContext?.plannerSnapshot?.observedCandidateIds).toEqual([
      observed.id,
    ]);
    expect(payload.calibrationContext?.plannerSnapshot?.selectedStops[0]).toMatchObject({
      id: observed.id,
      label: observed.label,
      score: observed.score,
    });
    expect(payload.dataLayers).toBeDefined();
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });

  it("publishes real guided loops without turning planned waypoints into scientific stops", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput({
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: guidedBudget,
        groups: [
          { sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 }, waypoints: [{ id: "group-1-waypoint", label: "Passage 1", latitude: 48.852, longitude: 2.351 }] },
          { sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 }, waypoints: [{ id: "group-2-waypoint", label: "Passage 2", latitude: 48.853, longitude: 2.351 }] },
        ],
      },
      guidedBudget,
      volunteers: 10,
      groupCount: 2,
      planning: {
        groupRoutes: [guidedGroupRoute(1, 4, 20, true), guidedGroupRoute(2, 5, 25, true)],
        multiRouteMetrics: {
          groupCount: 2,
          volunteers: 10,
          totalDistanceKm: 9,
          totalDurationMinutes: 45,
          coverageGain: 0,
          sharedTargetRatio: 0,
          sharedDistanceKm: null,
          sharedDistanceRatio: null,
          balanceDistance: 1,
          balanceDuration: 5,
          balanceTargetCount: 0,
          balanceVolunteerCount: 0,
          fallbackGroupCount: 0,
          networkDistanceMeasured: true,
        },
      },
    }));
    const payload = await readRouteResponse(response);

    expect(payload.travelDistanceKm).toBe(9);
    expect(payload.travelMinutes).toBe(45);
    expect(payload.withinBudget).toBe(true);
    expect(payload.stops).toEqual([]);
    expect(payload.scoreBreakdown).toEqual({ priority: 0, distance: 0 });
    expect(payload.groupRoutes.map(({ travelDistanceKm, travelMinutes }) => ({ travelDistanceKm, travelMinutes })))
      .toEqual([{ travelDistanceKm: 4, travelMinutes: 20 }, { travelDistanceKm: 5, travelMinutes: 25 }]);
    expect(payload.groupRoutes.map(({ guidedRouting }) => ({
      sectorStatus: guidedRouting?.sectorStatus,
      sectorDeviationKm: guidedRouting?.sectorDeviationKm,
      sectorWithinBounds: guidedRouting?.sectorWithinBounds,
    }))).toEqual([
      { sectorStatus: "unknown", sectorDeviationKm: null, sectorWithinBounds: false },
      { sectorStatus: "unknown", sectorDeviationKm: null, sectorWithinBounds: false },
    ]);
    expect(payload.plannerSnapshot?.groups.map(({ guidedRouting }) => ({
      sectorStatus: guidedRouting?.sectorStatus,
      sectorDeviationKm: guidedRouting?.sectorDeviationKm,
      sectorWithinBounds: guidedRouting?.sectorWithinBounds,
    }))).toEqual([
      { sectorStatus: "unknown", sectorDeviationKm: null, sectorWithinBounds: false },
      { sectorStatus: "unknown", sectorDeviationKm: null, sectorWithinBounds: false },
    ]);
    expect(payload.trace.multiRoute?.groups.map(({ targetCount, guidedRouting }) => ({
      targetCount,
      warning: guidedRouting?.warning,
    }))).toEqual([{ targetCount: 0, warning: null }, { targetCount: 0, warning: null }]);
  });

  it("uses the guided budget for a single group and rejects a 40-minute loop capped at 30", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput({
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: guidedBudget,
        groups: [{ sector: { center: { latitude: 48.85, longitude: 2.35 }, radiusKm: 1 }, waypoints: [{ id: "group-1-waypoint", label: "Passage 1", latitude: 48.852, longitude: 2.351 }] }],
      },
      guidedBudget,
      planning: {
        groupRoutes: [guidedGroupRoute(1, 6, 40, false)],
        multiRouteMetrics: {
          groupCount: 1,
          volunteers: 5,
          totalDistanceKm: 6,
          totalDurationMinutes: 40,
          coverageGain: 0,
          sharedTargetRatio: 0,
          sharedDistanceKm: null,
          sharedDistanceRatio: null,
          balanceDistance: 0,
          balanceDuration: 0,
          balanceTargetCount: 0,
          balanceVolunteerCount: 0,
          fallbackGroupCount: 0,
          networkDistanceMeasured: true,
        },
      },
    }));
    const payload = await readRouteResponse(response);

    expect(payload.travelDistanceKm).toBe(6);
    expect(payload.travelMinutes).toBe(40);
    expect(payload.groupRoutes[0]?.withinBudget).toBe(false);
    expect(payload.groupRoutes[0]?.guidedRouting?.budget.withinBudget).toBe(false);
    expect(payload.withinBudget).toBe(false);
    expect(payload.groupRoutes[0]?.guidedRouting?.warning).toContain("budget");
    expect(payload.tradeoffs).toContain(payload.groupRoutes[0]?.guidedRouting?.warning);
  });

  it("returns the explicit pickup preference in constraints and trace", async () => {
    installDefaultMocks();
    const response = buildRouteRecommendationResponse(responseInput({
      pickupPreference: "waste",
      planning: {
        effectiveRiskFocus: "waste",
        predictionSummary: predictionSummary(),
      },
    }));
    const payload = await readRouteResponse(response);

    expect(payload.constraintsApplied).toEqual({ pickupPreference: "waste" });
    expect(payload.trace.parameters.pickupPreference).toBe("waste");
    expect(payload.trace.parameters.effectiveRiskFocus).toBe("waste");
    expect(payload.prediction.riskFocus).toBe("waste");
    expect(payload.trace.prediction?.riskFocus).toBe("waste");
    expect(payload.serviceMinutesEstimate).toBeNull();
    expect(payload.totalMinutesEstimate).toBeNull();
    expect(payload.trace.duration.serviceMinutes).toBeNull();
    expect(payload.trace.duration.uncertaintyReserveMinutes).toBeNull();
    expect(payload.trace.duration.totalMinutes).toBeNull();
  });

  it("composes the API and trace budget only when a calibrated estimator is injected", async () => {
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
      operationalBudget: {
        generatedAt: "2026-09-12T00:00:00.000Z",
        estimateDuration: ({ context }: { context: RouteCalibrationContext }) => ({
          contractVersion: "route-cleanup-duration-v1",
          minutes: context.candidates.length === 1 ? 18 : null,
          uncertaintyMinutes: context.candidates.length === 1 ? 4 : null,
          modelVersion: "fixture-calibrated-v1",
          calibrationStatus: "calibrated",
          reason: "fixture",
          provenance: {
            source: "route-calibration",
            contextVersion: context.version,
            artifactVersion: "fixture-artifact-v1",
          },
        }),
      },
    }));
    const payload = await readRouteResponse(response);

    expect(payload.serviceMinutesEstimate).toBe(18);
    expect(payload.actionMinutesEstimate).toBe(18);
    expect(payload.eventBudgetMinutes).toBe(60);
    expect(payload.actionBudgetMinutes).toBe(45);
    expect(payload.organizationMarginMinutes).toBe(15);
    expect(payload.totalMinutesEstimate).toBe(33);
    expect(payload.operationalBudget).toMatchObject({
      contractVersion: "route-operational-budget-v3",
      travelMinutes: 12,
      actionMinutes: 18,
      eventBudgetMinutes: 60,
      actionBudgetMinutes: 45,
      organizationMarginMinutes: 15,
      serviceMinutes: 18,
      uncertaintyReserveMinutes: 4,
      totalMinutes: 33,
      withinBudget: true,
    });
    expect(payload.trace.duration).toMatchObject({
      networkMinutes: 12,
      estimatedMinutes: null,
      serviceMinutes: 18,
      uncertaintyReserveMinutes: 4,
      totalMinutes: 33,
    });
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
    const payload = await readRouteResponse(response);

    expect(payload.trace.selectedStops[0]?.targetFamily).toBe("predicted");
    expect(payload.dataLayers.prediction).toBe("available");
    expect(payload.dataLayers.observed).toBe("complete");
  });

  it("exposes one operational budget per group and calibrated total balance", async () => {
    installDefaultMocks();
    const first = candidate("observed");
    const second = { ...candidate("observed"), id: "observed-2" };
    const response = buildRouteRecommendationResponse(responseInput({
      volunteers: 4,
      groupCount: 2,
      weatherContext: {
        version: "planner-weather-snapshot-v1",
        provider: "open-meteo",
        source: "forecast",
        fetchedAt: "2026-09-14T08:00:00.000Z",
        coveredWindow: null,
        status: "available",
        weatherStatus: "available",
        location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
        hourly: [],
        summary: null,
        operationalRisk: {
          status: "limited",
          riskLevel: "rouge",
          reasons: ["Vent fort (>=45 km/h)"],
          ruleVersion: "weather-operational-rules-v1",
          ruleSource: "apps/web/src/lib/weather/ops-weather",
          operationalLimitMinutes: 45,
        },
      },
      candidateData: {
        candidates: [first, second],
        spatialCandidates: [first, second],
        actionableCandidates: [first, second],
        parisPressureSnapshot: null,
        contracts: [{}, {}],
        dataStatus: "complete",
        isTruncated: false,
        sourceHealth: completeSourceHealth,
      },
      planning: {
        plannedStops: [plannedStop(first), plannedStop(second)],
        routeGeometry: routeGeometry(),
        plannerResult: plannerResult(),
        predictionSummary: predictionSummary(),
        eventCenteredContext: null,
        budgetPrefixApplied: false,
        groupRoutes: [
          {
            groupIndex: 1,
            volunteerCount: 2,
            origin,
            candidateIds: [first.id],
            reservedCandidateIds: [second.id],
            stops: [],
            routeGeometry: routeGeometry(),
            travelDistanceKm: 2,
            travelMinutes: 12,
            travelBudgetMinutes: 60,
            withinBudget: true,
          },
          {
            groupIndex: 2,
            volunteerCount: 2,
            origin,
            candidateIds: [second.id],
            reservedCandidateIds: [first.id],
            stops: [],
            routeGeometry: routeGeometry(),
            travelDistanceKm: 2,
            travelMinutes: 12,
            travelBudgetMinutes: 60,
            withinBudget: true,
          },
        ],
        multiRouteMetrics: {
          groupCount: 2,
          volunteers: 4,
          totalDistanceKm: 4,
          totalDurationMinutes: 24,
          coverageGain: 0.8,
          sharedTargetRatio: 0,
          sharedDistanceKm: null,
          sharedDistanceRatio: null,
          balanceDistance: 0,
          balanceDuration: 0,
          balanceTargetCount: 0,
          balanceVolunteerCount: 0,
          fallbackGroupCount: 0,
          networkDistanceMeasured: true,
        },
      },
      operationalBudget: {
        generatedAt: "2026-09-12T00:00:00.000Z",
        estimateDuration: ({ context }: { context: RouteCalibrationContext }) => ({
          contractVersion: "route-cleanup-duration-v1",
          minutes: 10 * context.candidates.length,
          uncertaintyMinutes: 2,
          modelVersion: "fixture-calibrated-v1",
          calibrationStatus: "calibrated",
          reason: "fixture",
          provenance: {
            source: "route-calibration",
            contextVersion: context.version,
            artifactVersion: "fixture-artifact-v1",
          },
        }),
      },
    }));
    const payload = await readRouteResponse(response);

    expect(payload.groupRoutes.map(({ operationalBudget }) => operationalBudget?.totalMinutes))
      .toEqual([25, 25]);
    expect(payload.groupRoutes.every(({ operationalBudget, withinBudget }) =>
      operationalBudget?.eventBudgetMinutes === 45 &&
      operationalBudget.actionBudgetMinutes === 30 &&
      operationalBudget.withinBudget === true &&
      withinBudget === true,
    )).toBe(true);
    expect(payload.groupRoutes.every(({ operationalBudget }) =>
      operationalBudget?.weather.operationalLimitMinutes === 45 &&
      operationalBudget.weather.weatherLimitedEventMinutes === 45,
    )).toBe(true);
    expect(payload.multiRoute).toMatchObject({
      operationalBudgetAvailable: true,
      totalOperationalMinutes: 25,
      balanceOperationalDuration: 0,
    });
    expect(payload.trace.multiRoute?.groups.every(({ operationalBudget }) =>
      operationalBudget?.totalMinutes === 25,
    )).toBe(true);
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
    const payload = await readRouteResponse(response);

    expect(payload.trace.fallbacks).toContain("fallback_route_geometry");
    expect(payload.status).toBe("degraded");
    expect(payload.status).toBe(payload.dataLayers.recommendation);
  });
});
