import { describe, expect, it } from "vitest";
import { buildRoutePlannerSnapshot } from "./route-calibration";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "./route-operational";
import { buildActionRouteVersionCalculation } from "./route-active-version";
import {
  buildRouteRefreshProposal,
  buildRouteRefreshSubmission,
  compatibleRouteGroupCounts,
  compareRouteRefresh,
  type RouteRefreshProposal,
} from "./route-refresh";
import {
  addRouteRefreshGroupReason,
  assessRouteWeatherRefreshSignal,
  buildRouteRefreshSignals,
} from "./route-refresh-signals";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { RouteRecommendationResponse } from "./route-response-contract";

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
