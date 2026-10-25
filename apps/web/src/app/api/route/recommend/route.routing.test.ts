import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteRecommendationResponse } from "@/lib/route/route-response-contract";
import type { RouteGeometry } from "@/lib/route/route-contract";
import {
  applyOriginRouteGeometryLegsMock,
  buildPredictedRouteCandidatesMock,
  buildRoutePlannerCandidatePoolMock,
  buildTrashSpotterRouteCandidatesMock,
  candidate,
  createFallbackRouteGeometryMock,
  fallbackRoutePrefixWithinBudgetMock,
  fallbackGeometry,
  getCurrentUserLocationPreferenceMock,
  getTerritoryArrondissementCenterMock,
  loadCachedEventPressureByArrondissementMock,
  loadRouteRecommendationSourceMock,
  planRouteMock,
  plannedStop,
  plannerAudit,
  predictedCandidate,
  resetRouteRecommendMocks,
  routePolylineThroughFossgisFootMock,
  request,
  trackRouteRecommendationUseMock,
} from "./route.test.harness";

async function readRouteResponse(response: Response): Promise<RouteRecommendationResponse> {
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("La réponse de recommandation de route est invalide.");
  return raw as RouteRecommendationResponse;
}

describe("POST /api/route/recommend — routage réseau et budget", () => {
  const networkGeometry = (overrides: Partial<RouteGeometry> = {}): RouteGeometry => ({
    ...fallbackGeometry(),
    mode: "network",
    provider: "fossgis-osrm",
    profile: "foot",
    estimated: false,
    ...overrides,
  });

  const setupTwoStopPlan = () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    return { secondCandidate, plannedStops };
  };

  beforeEach(() => {
    resetRouteRecommendMocks();
  });

  it("fetches one shared weather window for a multi-group calculation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T07:00:00.000Z"));

    try {
      const weatherFetch = vi.fn(async () => new Response(JSON.stringify({
        hourly: {
          time: ["2026-09-15T10:00", "2026-09-15T11:00"],
          temperature_2m: [20, 21],
          apparent_temperature: [20, 21],
          precipitation: [0, 0],
          precipitation_probability: [10, 10],
          wind_speed_10m: [12, 13],
          wind_gusts_10m: [20, 22],
          weather_code: [1, 1],
        },
      }), { status: 200 }));
      vi.stubGlobal("fetch", weatherFetch);

      const { POST } = await import("./route");
      const response = await POST(request({
        origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
        volunteers: 4,
        groupCount: 2,
        scheduledStartAt: "2026-09-15T10:00",
        scheduledEndAt: "2026-09-15T12:00",
      }));
      const payload = await readRouteResponse(response);

      expect(response.status).toBe(200);
      expect(weatherFetch).toHaveBeenCalledTimes(1);
      expect(payload.weatherContext).toMatchObject({
        provider: "open-meteo",
        status: "available",
        coveredWindow: {
          startAt: "2026-09-15T10:00",
          endAt: "2026-09-15T12:00",
        },
      });
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it("calcule un ensemble de boucles distinctes pour les groupes coordonnés", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.84, longitude: 2.34 };
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockImplementation((input) => ({
      stops: input.candidates.slice(0, input.maxStops).map((item, index) => plannedStop(item, index)),
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(input.candidates.slice(0, input.maxStops).map((item, index) => plannedStop(item, index))),
    }));
    routePolylineThroughFossgisFootMock.mockImplementation(
      async (coordinates: [number, number][]) => ({
        ...fallbackGeometry(coordinates, 10),
        mode: "network",
        provider: "fossgis-osrm",
        profile: "foot",
        estimated: false,
        legs: coordinates.slice(1).map((_, index) => ({
          fromStopIndex: index,
          toStopIndex: index + 1,
          distanceKm: 1,
          estimatedMinutes: 5,
        })),
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      volunteers: 2,
      groupCount: 2,
      maxStops: 1,
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(response.status).toBe(200);
    expect(payload.groupRoutes).toHaveLength(2);
    expect(payload.groupRoutes.every((group: { routeGeometry: { isLoop: boolean; coordinates: [number, number][] } }) => {
      const first = group.routeGeometry.coordinates[0];
      const last = group.routeGeometry.coordinates.at(-1);
      return group.routeGeometry.isLoop && first?.[0] === last?.[0] && first?.[1] === last?.[1];
    })).toBe(true);
    expect(payload.groupRoutes.every((group: { withinBudget: boolean }) => group.withinBudget)).toBe(true);
    if (!payload.multiRoute || !payload.trace.multiRoute) throw new Error("La réponse multi-route est incomplète.");
    expect(payload.multiRoute.groupCount).toBe(2);
    expect(payload.trace.multiRoute.groups).toHaveLength(2);
    expect(new Set(payload.groupRoutes.flatMap((group: { candidateIds: string[] }) => group.candidateIds)).size).toBe(2);
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledTimes(2);
  });

  it("passes an explicit origin and all planner options to planRoute", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const explicitOrigin = { latitude: 48.9, longitude: 2.4, source: "map" } as const;

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: explicitOrigin,
      travelBudgetMinutes: 42,
      maxStops: 1,
      priorityVsTravel: 25,
    }));

    expect(response.status).toBe(200);
    const [plannerCall] = planRouteMock.mock.calls.at(-1) ?? [];
    if (!plannerCall) throw new Error("Le planner n'a reçu aucun appel.");
    expect(plannerCall.origin).toEqual(explicitOrigin);
    expect(plannerCall.candidates).toEqual([candidate]);
    expect(plannerCall.travelBudgetMinutes).toBe(42);
    expect(plannerCall.maxStops).toBe(1);
    expect(plannerCall.priorityVsTravel).toBe(25);
    expect(plannerCall.effectiveRiskFocus).toBe("all");
    expect(plannerCall.volunteersExpected).toBe(1);
    expect(plannerCall.groupCount).toBe(1);
    expect(plannerCall.operationalBudget).toBeUndefined();
    if (!plannerCall.weatherContext) throw new Error("Le contexte météo du planner est absent.");
    expect(plannerCall.weatherContext.status).toBe("unavailable");
    expect(plannerCall.weatherContext.unavailableReason).toBe("missing_window");
    if (!plannerCall.weatherContext.operationalRisk) throw new Error("Le risque opérationnel météo est absent.");
    expect(plannerCall.weatherContext.operationalRisk.status).toBe("fallback");
    expect(plannerCall.weatherContext.operationalRisk.operationalLimitMinutes).toBeNull();
    expect((await readRouteResponse(response)).origin).toEqual(explicitOrigin);
  });

  it("falls back to the saved arrondissement center", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(getTerritoryArrondissementCenterMock).toHaveBeenCalledWith(4);
    expect(planRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          latitude: 48.86,
          longitude: 2.36,
          source: "approximate_saved_area",
        },
      }),
    );
  });

  it("returns 422 when neither an explicit nor saved origin exists", async () => {
    getCurrentUserLocationPreferenceMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(loadRouteRecommendationSourceMock).not.toHaveBeenCalled();
    expect(planRouteMock).not.toHaveBeenCalled();
  });

  it("continues the main calculation when event pressure fails", async () => {
    loadCachedEventPressureByArrondissementMock.mockRejectedValueOnce(
      new Error("event source unavailable"),
    );
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({ origin: { latitude: 48.85, longitude: 2.35, source: "browser" } }));
    const payload = await readRouteResponse(response);

    expect(response.status).toBe(200);
    expect(payload.dataStatus).toBe("complete");
    expect(payload.proactiveAssistant.upcomingEvents).toEqual([]);
    expect(trackRouteRecommendationUseMock).toHaveBeenCalledOnce();
  });

  it("sends origin followed by stops to FOSSGIS and applies origin legs", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const network = networkGeometry({
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 2,
      durationMinutes: 12,
      legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 12 }],
    });
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(network);
    const explicitOrigin = { latitude: 48.9, longitude: 2.4, source: "map" } as const;

    const { POST } = await import("./route");
    const response = await POST(request({ origin: explicitOrigin }));

    expect(response.status).toBe(200);
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledWith(
      [[explicitOrigin.latitude, explicitOrigin.longitude], [candidate.latitude, candidate.longitude], [explicitOrigin.latitude, explicitOrigin.longitude]],
      {},
    );
    expect(applyOriginRouteGeometryLegsMock).toHaveBeenCalledWith(
      expect.any(Array),
      network,
    );
  });

  it("recalcule la géométrie réseau pour le préfixe final retenu", async () => {
    setupTwoStopPlan();
    const network = networkGeometry({
      durationMinutes: 70,
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 2, estimatedMinutes: 30 },
      ],
    });
    const reconciledGeometry: RouteGeometry = {
      ...network,
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 1.5,
      durationMinutes: 40,
      legs: network.legs.slice(0, 1),
    };
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(network)
      .mockResolvedValueOnce(reconciledGeometry);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledTimes(2);
    expect(routePolylineThroughFossgisFootMock).toHaveBeenNthCalledWith(
      2,
      [[48.9, 2.4], [candidate.latitude, candidate.longitude], [48.9, 2.4]],
      {},
    );
    expect(payload.routeGeometry).toEqual(reconciledGeometry);
    expect(payload.stops).toHaveLength(1);
    expect(payload.stops.map(({ id }: { id: string }) => id)).toEqual([candidate.id]);
    expect(payload.groups[0]?.candidateIds).toEqual([candidate.id]);
    expect(payload.partition.audit.assignments).toEqual([
      expect.objectContaining({ candidateId: candidate.id }),
    ]);
    expect(payload.partition.audit.assignments).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ candidateId: "spot-2" })]),
    );
    expect(payload.trace.ordering.stopIds).toEqual([candidate.id]);
    expect(payload.travelMinutes).toBeLessThanOrEqual(payload.travelBudgetMinutes);
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      stopsBefore: 2,
      stopsAfter: 1,
      excludedCandidateIds: ["spot-2"],
      providerCalls: 2,
      degraded: false,
    }));
  });

  it("dégrade explicitement si la seconde mesure réseau échoue", async () => {
    const { plannedStops } = setupTwoStopPlan();
    const overBudgetNetwork = networkGeometry({
      durationMinutes: 70,
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
      ],
    });
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(overBudgetNetwork)
      .mockRejectedValueOnce(new Error("provider unavailable"));
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce(plannedStops.slice(0, 1).map(({ candidate: plannedCandidate }) => plannedCandidate));
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledTimes(2);
    expect(payload.routeGeometry.mode).toBe("fallback");
    expect(payload.status).toBe("degraded");
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      providerCalls: 2,
      degraded: true,
      excludedCandidateIds: ["spot-2"],
    }));
    expect(payload.trace.warnings).toContain(
      "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé.",
    );
  });

  it("n'effectue pas de second appel lorsque le préfixe réseau est vide", async () => {
    const plannedStops = [plannedStop(candidate)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(networkGeometry({
      durationMinutes: 70,
      legs: [],
    }));

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toEqual([]);
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      stopsBefore: 1,
      stopsAfter: 0,
      providerCalls: 1,
    }));
  });

  it("audite une prédiction retirée uniquement par le budget réseau final", async () => {
    const predicted = predictedCandidate();
    const observed = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(observed), plannedStop(predicted, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([observed]);
    buildPredictedRouteCandidatesMock.mockReturnValueOnce({
      candidates: [predicted],
      summary: {
        status: "available",
        source: "urban-pressure-model",
        modelVersion: "test-model",
        snapshot: null,
        riskFocus: "all",
        zonesConsidered: 1,
        candidatesConsidered: 1,
        admitted: 1,
        selected: 0,
        selectedCandidateIds: [],
        admittedCandidateIds: [predicted.id],
        passedToPlanner: 1,
        excludedByPreselection: 0,
        excludedByPlannerBudget: 0,
        preselectionExcludedCandidateIds: [],
        preselectionExclusionReasons: {},
        excludedByFinalRoutingBudget: 0,
        finalRoutingBudgetExcludedCandidateIds: [],
        excludedByCorridor: 0,
        deduplicated: 0,
        warnings: [],
      },
    });
    buildRoutePlannerCandidatePoolMock.mockReturnValueOnce({
      candidates: [predicted, observed],
      audit: {
        effectiveRiskFocus: "all",
        admittedCandidateIds: [predicted.id, observed.id],
        passedToPlannerCandidateIds: [predicted.id, observed.id],
        excludedByPreselectionCandidateIds: [],
        excludedByPreselectionReasons: {},
      },
    });
    planRouteMock.mockReturnValueOnce({
      stops: [],
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit([]),
    }).mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(networkGeometry({
        durationMinutes: 70,
        legs: [
          { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
          { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
        ],
      }))
      .mockResolvedValueOnce(networkGeometry({
        durationMinutes: 40,
        legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 }],
      }));

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(payload.stops.map((stop: { id: string }) => stop.id)).toEqual([observed.id]);
    expect(payload.prediction.selected).toBe(0);
    expect(payload.prediction.excludedByFinalRoutingBudget).toBe(1);
    expect(payload.prediction.finalRoutingBudgetExcludedCandidateIds).toEqual([predicted.id]);
    expect(payload.prediction.excludedByPreselection).toBe(0);
    expect(payload.prediction.excludedByPlannerBudget).toBe(0);
  });

  it("reduces an over-budget fallback route locally", async () => {
    const { plannedStops } = setupTwoStopPlan();
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(fallbackGeometry([], 70));
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce(plannedStops.slice(0, 1).map(({ candidate: plannedCandidate }) => plannedCandidate));
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 9),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await readRouteResponse(response);

    expect(fallbackRoutePrefixWithinBudgetMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 48.9, longitude: 2.4 }),
      plannedStops.map(({ candidate: plannedCandidate }) => plannedCandidate),
      60,
      expect.any(Function),
    );
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toHaveLength(1);
    expect(payload.travelMinutes).toBeLessThanOrEqual(60);
  });
});
