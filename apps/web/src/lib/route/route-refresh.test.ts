import { describe, expect, it } from "vitest";
import { buildRoutePlannerSnapshot } from "./route-calibration";
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";
import { createOperationalRouteFromRecommendation } from "./route-operational";
import { buildActionRouteVersionCalculation } from "./route-active-version";
import {
  buildRouteRefreshSubmission,
  compareRouteRefresh,
  type RouteRefreshProposal,
} from "./route-refresh";
import type { ActionEditorRecord } from "@/lib/actions/http";

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
