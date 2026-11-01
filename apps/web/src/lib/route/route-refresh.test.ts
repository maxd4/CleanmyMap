import { describe, expect, it } from "vitest";
import { parseRouteRecommendationRequest } from "@/app/api/route/recommend/route.schema";
import { buildRoutePlannerSnapshot } from "./route-calibration";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "./route-operational";
import { buildActionRouteVersionCalculation } from "./route-active-version";
import {
  buildRouteRefreshProposal,
  buildRouteRefreshSubmission,
  compatibleRouteGroupCounts,
  compareRouteRefresh,
  guidedRouteRefreshUnavailableReason,
  type RouteRefreshProposal,
} from "./route-refresh";
import {
  addRouteRefreshGroupReason,
  assessRouteWeatherRefreshSignal,
  buildRouteRefreshSignals,
} from "./route-refresh-signals";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { RouteRecommendationResponse } from "./route-response-contract";
import {
  ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
  ROUTE_TERRITORIAL_GUIDED_VERSION,
} from "./route-planning-mode";

function action(): ActionEditorRecord {
  const snapshot = buildRoutePlannerSnapshot(createRoutePlannerSnapshotInput());
  const operationalRoute = createOperationalRouteFromRecommendation({
    generatedAt: snapshot.generatedAt,
    groupCount: snapshot.parameters.groupCount,
    routeGeometry: snapshot.geometry,
    stops: snapshot.selectedStops,
    groupRoutes: [],
  });
  return {
    id: "action-1",
    createdAt: snapshot.generatedAt,
    status: "approved",
    publishedAt: "2026-09-20T10:00:00.000Z",
    actionPhase: "pre_action",
    preparationData: {
      routeCalibrationContext: {
        version: "action-route-calibration-v2",
        generatedAt: snapshot.generatedAt,
        routeEngineVersion: snapshot.engineVersion,
        cleanupWorkloadVersion: snapshot.cleanupWorkloadVersion,
        volunteersExpected: snapshot.parameters.volunteers,
        groupCount: snapshot.parameters.groupCount,
        candidates: [],
        plannerSnapshot: snapshot,
      },
      operationalRoute,
    },
    createdByClerkId: "owner-1",
    actorName: "Organisateur",
    actionDate: "9999-12-31",
    locationLabel: "Paris",
    latitude: 48.85,
    longitude: 2.35,
    wasteKg: null,
    cigaretteButts: null,
    volunteersCount: 3,
    durationMinutes: 60,
    notes: null,
    submissionMode: "quick",
    associationName: "Structure",
    groupJoinEnabled: true,
    participantAccounts: [],
    placeType: null,
    departureLocationLabel: "Paris",
    arrivalLocationLabel: null,
    routeStyle: "souple",
    routeAdjustmentMessage: null,
  };
}

function guidedAction(
  version: typeof ROUTE_TERRITORIAL_GUIDED_VERSION | typeof ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION = ROUTE_TERRITORIAL_GUIDED_VERSION,
  volunteers = 10,
  groupCount = 2,
): ActionEditorRecord {
  const current = action();
  const snapshot = current.preparationData!.routeCalibrationContext!.plannerSnapshot!;
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    label: `Secteur ${index + 1}`,
    sector: {
      center: { latitude: 48.84 + index / 1000, longitude: 2.35 },
      radiusKm: 1,
    },
    waypoints: [{
      id: `guided-waypoint-${index + 1}`,
      label: `Passage ${index + 1}`,
      latitude: 48.84 + index / 1000,
      longitude: 2.35,
    }],
  }));
  const planningMode = version === ROUTE_TERRITORIAL_GUIDED_VERSION
    ? {
        type: "territorial-guided" as const,
        version,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups,
      }
    : { type: "territorial-guided" as const, version, groups };
  const guidedSnapshot = {
    ...snapshot,
    parameters: {
      ...snapshot.parameters,
      volunteers,
      groupCount,
      planningMode,
    },
  };
  current.preparationData!.routeCalibrationContext!.plannerSnapshot = guidedSnapshot;
  return current;
}

function parseSubmission(submission: NonNullable<ReturnType<typeof buildRouteRefreshSubmission>>) {
  return parseRouteRecommendationRequest({
    ...submission.options,
    planningMode: submission.planningMode,
    ...(submission.origin ? { origin: submission.origin } : {}),
  });
}

describe("route refresh proposal", () => {
  function recommendationResponse(
    snapshot: ReturnType<typeof buildRoutePlannerSnapshot>,
    options: { tradeoffs?: string[]; warnings?: string[] } = {},
  ): RouteRecommendationResponse {
    const plannerProof = {
      proofVersion: "route-planner-proof-v1" as const,
      snapshotHash: "a".repeat(64),
      issuedAt: "2026-09-27T09:00:00.000Z",
      expiresAt: "2026-09-27T10:00:00.000Z",
      token: "proof-token",
    };
    return {
      plannerSnapshot: snapshot,
      plannerProof,
      generatedAt: snapshot.generatedAt,
      groupCount: snapshot.parameters.groupCount,
      routeGeometry: snapshot.geometry,
      stops: snapshot.selectedStops,
      groupRoutes: [],
      travelDistanceKm: snapshot.distance.totalKm,
      travelMinutes: snapshot.distance.travelMinutes,
      actionMinutesEstimate: null,
      totalMinutesEstimate: null,
      tradeoffs: options.tradeoffs ?? [],
      trace: {
        warnings: options.warnings ?? [],
        approximations: [],
      },
    } as unknown as RouteRecommendationResponse;
  }

  it("builds a proposal from a verified planner response and explains its tradeoffs", () => {
    const current = action();
    const proposalSnapshot = structuredClone(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    proposalSnapshot.generatedAt = "2026-09-27T09:00:00.000Z";
    proposalSnapshot.selectedStops = [{
      id: "observed-stop",
      label: "Point observé",
      latitude: 48.85,
      longitude: 2.35,
      segmentKm: 1,
      estimatedMinutes: 5,
      priorityReason: "priorité confirmée",
      score: 2,
      evidence: {
        family: "observed",
        source: "trash_spotter_spots",
        proof: "validated",
        observedAt: "2026-09-26T08:00:00.000Z",
      },
    }];

    const proposal = buildRouteRefreshProposal(
      recommendationResponse(proposalSnapshot, { tradeoffs: ["Donnée plus récente"] }),
    );

    expect(proposal).not.toBeNull();
    expect(proposal?.calculation).toMatchObject({
      explanation: "Donnée plus récente",
      stops: [{ id: "observed-stop", sourceFamily: "observed" }],
    });
    expect(proposal?.operationalRoute.plannerGroupCount).toBe(
      proposalSnapshot.parameters.groupCount,
    );
  });

  it("copies both guided loops into an explicit refresh proposal without changing the current action", () => {
    const current = action();
    const snapshot = structuredClone(current.preparationData!.routeCalibrationContext!.plannerSnapshot!);
    snapshot.generatedAt = "2026-09-27T09:00:00.000Z";
    snapshot.parameters = {
      ...snapshot.parameters,
      volunteers: 10,
      groupCount: 2,
      planningMode: {
        type: "territorial-guided",
        version: "route-territorial-guided-v2",
        budget: { totalMinutes: 90, organizationMarginMinutes: 15, minimumCollectionMinutes: 45, travelMaxMinutes: 30 },
        groups: [1, 2].map((index) => ({
          sector: { center: { latitude: 48.844 + index / 1000, longitude: 2.35 }, radiusKm: 1 },
          waypoints: [{ id: `guided-${index}`, label: `Passage ${index}`, latitude: 48.844 + index / 1000, longitude: 2.35 }],
        })),
      },
    };
    snapshot.groups = [1, 2].map((index) => ({
      ...snapshot.groups[0]!,
      groupIndex: index,
      volunteerCount: 5,
      routeGeometry: snapshot.geometry,
      plannedSector: { center: { latitude: 48.844 + index / 1000, longitude: 2.35 }, radiusKm: 1 },
      plannedWaypoints: [{ id: `guided-${index}`, label: `Passage ${index}`, latitude: 48.844 + index / 1000, longitude: 2.35, order: 0 }],
      guidedBudget: { totalMinutes: 90, organizationMarginMinutes: 15, minimumCollectionMinutes: 45, travelMaxMinutes: 30 },
    }));
    const response = recommendationResponse(snapshot);
    response.groupCount = 2;
    response.volunteers = 10;
    response.planningMode = snapshot.parameters.planningMode;
    response.guidedBudget = {
      totalMinutes: 90,
      organizationMarginMinutes: 15,
      minimumCollectionMinutes: 45,
      travelMaxMinutes: 30,
    };
    response.groupRoutes = snapshot.groups.map((group) => ({
      ...group,
      origin: snapshot.parameters.origin,
      candidateIds: [],
      reservedCandidateIds: [],
      estimatedDistanceKm: group.travelDistanceKm,
      estimatedDurationMinutes: group.travelMinutes,
      stops: [],
      travelDistanceKm: group.travelDistanceKm,
      travelMinutes: group.travelMinutes,
      travelBudgetMinutes: group.travelBudgetMinutes,
      withinBudget: true,
    })) as unknown as RouteRecommendationResponse["groupRoutes"];

    const proposal = buildRouteRefreshProposal(response);
    expect(proposal?.operationalRoute.routes).toHaveLength(2);
    const guidedRoutes = proposal?.operationalRoute.routes.map((route) => ({
      volunteerCount: route.volunteerCount,
      waypoint: route.plannedWaypoints?.[0]?.id,
      sector: route.plannedSector?.center.latitude,
    }));
    expect(guidedRoutes?.map(({ volunteerCount, waypoint }) => ({ volunteerCount, waypoint }))).toEqual([
      { volunteerCount: 5, waypoint: "guided-1" },
      { volunteerCount: 5, waypoint: "guided-2" },
    ]);
    expect(guidedRoutes?.[0]?.sector).toBeCloseTo(48.845, 10);
    expect(guidedRoutes?.[1]?.sector).toBeCloseTo(48.846, 10);
    expect(current.preparationData?.operationalRoute?.routes).toHaveLength(1);
  });

  it("falls back to trace warnings and rejects responses without the trust boundary", () => {
    const current = action();
    const snapshot = current.preparationData!.routeCalibrationContext!.plannerSnapshot!;
    expect(buildRouteRefreshProposal({} as RouteRecommendationResponse)).toBeNull();

    const proposal = buildRouteRefreshProposal(
      recommendationResponse(snapshot, { warnings: ["Approximation appliquée"] }),
    );
    expect(proposal?.calculation.explanation).toBe("Approximation appliquée");
  });

  it("reuses the active calculation parameters without adding planner signals", () => {
    const current = action();
    const submission = buildRouteRefreshSubmission(current);

    expect(submission?.options).toMatchObject({
      travelBudgetMinutes: 60,
      maxStops: 3,
      volunteers: 3,
      groupCount: 1,
      pickupPreference: "balanced",
      riskFocus: "all",
    });
    expect(submission?.options).not.toHaveProperty("weather");
    expect(submission?.options).not.toHaveProperty("affluence");
    expect(submission?.options).not.toHaveProperty("additionality");
  });

  it.each([
    [12, [6, 6]],
    [11, [6, 5]],
  ] as const)("rebalances a guided v2 refresh for %s volunteers while preserving its constraints", (volunteers, expectedCounts) => {
    const current = guidedAction();
    const before = structuredClone(current.preparationData);
    const submission = buildRouteRefreshSubmission(current, { volunteers, groupCount: 2 });

    expect(submission).not.toBeNull();
    expect(parseSubmission(submission!).success).toBe(true);
    expect(submission?.planningMode).toMatchObject({
      type: "territorial-guided",
      version: ROUTE_TERRITORIAL_GUIDED_VERSION,
      budget: { totalMinutes: 90, organizationMarginMinutes: 15, minimumCollectionMinutes: 45, travelMaxMinutes: 30 },
    });
    expect(submission?.planningMode.type === "territorial-guided"
      ? submission.planningMode.groups.map((group) => group.volunteerCount)
      : []).toEqual(expectedCounts);
    const originalMode = current.preparationData!.routeCalibrationContext!.plannerSnapshot!.parameters.planningMode;
    expect(submission?.planningMode.type === "territorial-guided" && originalMode.type === "territorial-guided"
      ? submission.planningMode.groups
      : []).toEqual(originalMode.type === "territorial-guided"
        ? originalMode.groups.map((group) => expect.objectContaining(group))
        : []);
    expect(submission?.planningMode.type === "territorial-guided"
      ? submission.planningMode.groups.map(({ label, sector, waypoints }) => ({ label, sector, waypoints }))
      : []).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: "Secteur 1" }),
        expect.objectContaining({ label: "Secteur 2" }),
      ]));
    expect(current.preparationData).toEqual(before);
  });

  it("refuses a guided refresh with a different group count or too few volunteers before the API", () => {
    const current = guidedAction();

    expect(buildRouteRefreshSubmission(current, { volunteers: 12, groupCount: 3 })).toBeNull();
    expect(buildRouteRefreshSubmission(current, { volunteers: 1, groupCount: 2 })).toBeNull();
    expect(guidedRouteRefreshUnavailableReason(current, { volunteers: 12, groupCount: 3 })).toContain("aucun éditeur");
    expect(guidedRouteRefreshUnavailableReason(current, { volunteers: 1, groupCount: 2 })).toContain("au moins 2 bénévoles");
  });

  it("keeps v1 compatibility without fabricating a v2 budget", () => {
    const current = guidedAction(ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION);
    const submission = buildRouteRefreshSubmission(current, { volunteers: 11, groupCount: 2 });

    expect(submission).not.toBeNull();
    expect(parseSubmission(submission!).success).toBe(true);
    expect(submission?.planningMode).toMatchObject({
      type: "territorial-guided",
      version: ROUTE_TERRITORIAL_GUIDED_LEGACY_VERSION,
    });
    expect(submission?.planningMode).not.toHaveProperty("budget");
    expect(submission?.planningMode.type === "territorial-guided"
      ? submission.planningMode.groups.map((group) => group.volunteerCount)
      : []).toEqual([6, 5]);
  });

  it("preserves scheduled options and falls back to planner origin when action coordinates are absent", () => {
    const current = action();
    current.latitude = null;
    current.longitude = null;
    current.eventStartTime = "10:00";
    current.eventEndTime = "12:00";

    expect(buildRouteRefreshSubmission(current, { volunteers: 4, groupCount: 2 })?.options).toMatchObject({
      volunteers: 4,
      groupCount: 2,
      scheduledStartAt: "9999-12-31T10:00",
      scheduledEndAt: "9999-12-31T12:00",
    });
  });

  it("aggregates operational budget metrics when route groups provide them", () => {
    const current = action();
    const snapshot = structuredClone(current.preparationData!.routeCalibrationContext!.plannerSnapshot!);
    snapshot.groups = snapshot.groups.map((group) => ({
      ...group,
      operationalBudget: {
        actionMinutes: 10,
        totalMinutes: 20,
      } as NonNullable<typeof group.operationalBudget>,
    }));

    expect(buildActionRouteVersionCalculation(snapshot).metrics).toMatchObject({
      collectionMinutes: 10,
      totalMinutes: 20,
    });
  });

  it.each([
    [3, "unchanged", false],
    [5, "increased", true],
    [1, "decreased", true],
  ] as const)("recommends only when confirmed participants are %s", (confirmed, _label, expected) => {
    const current = action();
    const calculation = buildActionRouteVersionCalculation(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    const signals = buildRouteRefreshSignals({
      activeAppliedAt: "2026-09-01T09:00:00.000Z",
      calculation,
      confirmedParticipants: confirmed,
      freshness: { status: "current", latestSourceAt: null },
    });
    expect(signals.recommended).toBe(expected);
    expect(signals.reasons).toEqual(expected ? ["participants_changed"] : []);
  });

  it("does not count pending participation as a confirmed participant", () => {
    const current = action();
    const calculation = buildActionRouteVersionCalculation(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    const signals = buildRouteRefreshSignals({
      activeAppliedAt: "2026-09-01T09:00:00.000Z",
      calculation,
      confirmedParticipants: 3,
      freshness: { status: "current", latestSourceAt: null },
    });
    expect(signals.participants.confirmed).toBe(3);
    expect(signals.recommended).toBe(false);
  });

  it("supports every compatible group direction without changing the active calculation", () => {
    expect(compatibleRouteGroupCounts(1)).toEqual([]);
    expect(compatibleRouteGroupCounts(4)).toEqual([2, 3, 4]);

    const current = action();
    const calculation = buildActionRouteVersionCalculation(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    expect(calculation.parameters.groupCount).toBe(1);
    expect(buildRouteRefreshSubmission(current, { volunteers: 4, groupCount: 3 })?.options).toMatchObject({
      volunteers: 4,
      groupCount: 3,
    });
    expect(calculation.parameters.groupCount).toBe(1);
  });

  it("changes only volunteers and groupCount for an explicit refresh", () => {
    const current = action();
    const parameters = current.preparationData!.routeCalibrationContext!.plannerSnapshot!.parameters;
    const submission = buildRouteRefreshSubmission(current, { volunteers: 4, groupCount: 3 });

    expect(submission?.options).toMatchObject({
      volunteers: 4,
      groupCount: 3,
      priorityVsTravel: parameters.priorityVsTravel,
      travelBudgetMinutes: parameters.travelBudgetMinutes,
      maxStops: parameters.maxStops,
      riskFocus: parameters.effectiveRiskFocus,
      pickupPreference: parameters.pickupPreference,
    });
    expect(submission?.planningMode).toEqual(parameters.planningMode);
    expect(submission?.origin).toEqual({ latitude: 48.85, longitude: 2.35, source: "map" });
  });

  it("centralizes freshness and weather recommendation reasons", () => {
    const current = action();
    const calculation = buildActionRouteVersionCalculation(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    const weather = assessRouteWeatherRefreshSignal({
      activeWeather: {
        version: "planner-weather-snapshot-v1",
        provider: "open-meteo",
        source: "forecast",
        fetchedAt: "2026-09-27T08:00:00.000Z",
        coveredWindow: { startAt: "9999-12-31T10:00", endAt: "9999-12-31T12:00" },
        status: "available",
        weatherStatus: "available",
        location: { latitude: 48.85, longitude: 2.35, timezone: "Europe/Paris" },
        hourly: [],
        summary: null,
        operationalRisk: {
          status: "limited",
          riskLevel: "orange",
          reasons: ["Pluie"],
          ruleVersion: "weather-operational-rules-v1",
          ruleSource: "apps/web/src/lib/weather/ops-weather",
          operationalLimitMinutes: 45,
        },
      },
      operationalMinutes: 60,
    });
    const signals = buildRouteRefreshSignals({
      activeAppliedAt: "2026-09-01T09:00:00.000Z",
      calculation,
      confirmedParticipants: 3,
      freshness: { status: "newer", latestSourceAt: "2026-09-28T09:00:00.000Z" },
      weather,
    });
    expect(signals.reasons).toEqual(["newer_route_data", "weather_budget_mismatch"]);
    expect(signals.weather.status).toBe("degraded");
  });

  it("adds and removes the group-count refresh reason without duplicating it", () => {
    const current = action();
    const calculation = buildActionRouteVersionCalculation(
      current.preparationData!.routeCalibrationContext!.plannerSnapshot!,
    );
    const base = buildRouteRefreshSignals({
      activeAppliedAt: "2026-09-01T09:00:00.000Z",
      calculation,
      confirmedParticipants: 5,
      freshness: { status: "current", latestSourceAt: null },
    });

    const changed = addRouteRefreshGroupReason(base, 2);
    expect(changed).toMatchObject({
      recommended: true,
      reasons: ["participants_changed", "group_count_changed"],
    });
    expect(addRouteRefreshGroupReason(changed, 1).reasons).toEqual(["participants_changed"]);
  });

  it("compares kept, added, removed stops and priority explanations", () => {
    const current = action();
    const snapshot = current.preparationData!.routeCalibrationContext!.plannerSnapshot!;
    const proposalSnapshot = structuredClone(snapshot);
    proposalSnapshot.generatedAt = "2026-09-27T09:00:00.000Z";
    proposalSnapshot.selectedStops = [
      { id: "kept", label: "Conservé", latitude: 48.85, longitude: 2.35, segmentKm: 1, estimatedMinutes: 5, priorityReason: "priorité renforcée", score: 2 },
      { id: "added", label: "Ajouté", latitude: 48.86, longitude: 2.36, segmentKm: 1, estimatedMinutes: 5, priorityReason: "nouvelle donnée", score: 1 },
    ];
    const proposal: RouteRefreshProposal = {
      response: {} as RouteRefreshProposal["response"],
      plannerSnapshot: proposalSnapshot,
      plannerProof: {} as RouteRefreshProposal["plannerProof"],
      operationalRoute: current.preparationData!.operationalRoute!,
      calculation: buildActionRouteVersionCalculation(proposalSnapshot, {
        snapshotHash: "b".repeat(64),
        stops: proposalSnapshot.selectedStops,
      }),
    };
    current.preparationData!.routeVersioning = {
      schemaVersion: "action-route-versioning-v1",
      active: {
        versionId: "route-v1-current",
        appliedAt: snapshot.generatedAt,
        appliedByUserId: "owner-1",
        calculation: buildActionRouteVersionCalculation(snapshot, {
          snapshotHash: "a".repeat(64),
          stops: [{ ...snapshot.selectedStops[0], id: "kept", priorityReason: "priorité initiale" }],
        }),
        operationalRoute: current.preparationData!.operationalRoute!,
      },
      history: [],
    };

    const comparison = compareRouteRefresh(current, proposal);
    expect(comparison).toMatchObject({
      identical: false,
      keptStopIds: ["kept"],
      addedStopIds: ["added"],
      removedStopIds: [],
    });
    expect(comparison?.priorityChanges).toEqual([
      { id: "kept", from: "priorité initiale", to: "priorité renforcée" },
    ]);
  });
});
