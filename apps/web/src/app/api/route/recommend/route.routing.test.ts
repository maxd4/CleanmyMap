import { beforeEach, describe, expect, it, vi } from "vitest";
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
  resetRouteRecommendMocks,
  routePolylineThroughFossgisFootMock,
  request,
  trackRouteRecommendationUseMock,
} from "./route.test.harness";

describe("POST /api/route/recommend — routage réseau et budget", () => {
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
      const payload = await response.json();

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
      stops: input.candidates.slice(0, input.maxStops).map((item: typeof candidate, index: number) => plannedStop(item, index)),
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(input.candidates.slice(0, input.maxStops).map((item: typeof candidate, index: number) => plannedStop(item, index))),
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.groupRoutes).toHaveLength(2);
    expect(payload.groupRoutes.every((group: { routeGeometry: { isLoop: boolean; coordinates: [number, number][] } }) => {
      const first = group.routeGeometry.coordinates[0];
      const last = group.routeGeometry.coordinates.at(-1);
      return group.routeGeometry.isLoop && first?.[0] === last?.[0] && first?.[1] === last?.[1];
    })).toBe(true);
    expect(payload.groupRoutes.every((group: { withinBudget: boolean }) => group.withinBudget)).toBe(true);
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
    expect(planRouteMock).toHaveBeenCalledWith(expect.objectContaining({
      origin: explicitOrigin,
      candidates: [candidate],
      travelBudgetMinutes: 42,
      maxStops: 1,
      priorityVsTravel: 25,
      effectiveRiskFocus: "all",
      volunteersExpected: 1,
      groupCount: 1,
      operationalBudget: undefined,
      weatherContext: expect.objectContaining({
        status: "unavailable",
        unavailableReason: "missing_window",
        operationalRisk: expect.objectContaining({
          status: "fallback",
          operationalLimitMinutes: null,
        }),
      }),
    }));
    expect((await response.json()).origin).toEqual(explicitOrigin);
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dataStatus).toBe("complete");
    expect(payload.proactiveAssistant.upcomingEvents).toEqual([]);
    expect(trackRouteRecommendationUseMock).toHaveBeenCalledOnce();
  });

  it("sends origin followed by stops to FOSSGIS and applies origin legs", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const networkGeometry = {
      ...fallbackGeometry(),
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 2,
      durationMinutes: 12,
      legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 12 }],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    } as const;
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(networkGeometry);
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
      networkGeometry,
    );
  });

  it("recalcule la géométrie réseau pour le préfixe final retenu", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    const networkGeometry = {
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network",
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 2, estimatedMinutes: 30 },
      ],
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
    } as const;
    const reconciledGeometry = {
      ...networkGeometry,
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 1.5,
      durationMinutes: 40,
      legs: [networkGeometry.legs[0]],
    } as const;
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(networkGeometry)
      .mockResolvedValueOnce(reconciledGeometry);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

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
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    const overBudgetNetwork = {
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network" as const,
      provider: "fossgis-osrm" as const,
      profile: "foot" as const,
      estimated: false,
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
      ],
    };
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(overBudgetNetwork)
      .mockRejectedValueOnce(new Error("provider unavailable"));
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce([plannedStops[0]]);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

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
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce({
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network",
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
      legs: [],
    });

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toEqual([]);
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      stopsBefore: 1,
      stopsAfter: 0,
      providerCalls: 1,
    }));
  });

  it("audite une prédiction retirée uniquement par le budget réseau final", async () => {
    const predicted = {
      ...candidate,
      id: "predicted:zone-1",
      family: "predicted" as const,
      evidence: { family: "predicted" as const },
    };
    const observed = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(observed), plannedStop(predicted, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([observed]);
    buildPredictedRouteCandidatesMock.mockReturnValueOnce({
      candidates: [predicted],
      summary: {
        status: "available",
        selected: 0,
        selectedCandidateIds: [],
        admittedCandidateIds: [predicted.id],
        passedToPlanner: 1,
        excludedByPreselection: 0,
        excludedByPlannerBudget: 0,
        preselectionExcludedCandidateIds: [],
        excludedByFinalRoutingBudget: 0,
        finalRoutingBudgetExcludedCandidateIds: [],
      },
    });
    buildRoutePlannerCandidatePoolMock.mockReturnValueOnce({
      candidates: [predicted, observed],
      audit: {
        admittedCandidateIds: [predicted.id, observed.id],
        passedToPlannerCandidateIds: [predicted.id, observed.id],
        excludedByPreselectionCandidateIds: [],
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
      .mockResolvedValueOnce({
        ...fallbackGeometry(),
        durationMinutes: 70,
        mode: "network",
        provider: "fossgis-osrm",
        profile: "foot",
        estimated: false,
        legs: [
          { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
          { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
        ],
      })
      .mockResolvedValueOnce({
        ...fallbackGeometry(),
        durationMinutes: 40,
        mode: "network",
        provider: "fossgis-osrm",
        profile: "foot",
        estimated: false,
        legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 }],
      });

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(payload.stops.map((stop: { id: string }) => stop.id)).toEqual([observed.id]);
    expect(payload.prediction.selected).toBe(0);
    expect(payload.prediction.excludedByFinalRoutingBudget).toBe(1);
    expect(payload.prediction.finalRoutingBudgetExcludedCandidateIds).toEqual([predicted.id]);
    expect(payload.prediction.excludedByPreselection).toBe(0);
    expect(payload.prediction.excludedByPlannerBudget).toBe(0);
  });

  it("reduces an over-budget fallback route locally", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(fallbackGeometry([], 70));
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce([plannedStops[0]]);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 9),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

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
