import { describe, expect, it } from "vitest";
import {
  buildRouteCalibrationContext,
  buildRoutePlannerSnapshot,
} from "./route-calibration";
import { createRoutePlannerProof } from "./route-planner-proof";
import {
  PlannerSnapshotTrustError,
  promoteVerifiedPlannerContext,
} from "./route-planner-trust";

const workload = {
  modelVersion: "route-cleanup-workload-v1" as const,
  candidateId: "candidate-1",
  family: "observed" as const,
  status: "presence_only" as const,
  ordinaryWaste: { relativePressure: null, observedPresence: true, confidence: null },
  cigaretteButts: { relativePressure: null, observedPresence: false, confidence: null },
  confidence: { ordinaryWaste: null, cigaretteButts: null },
  provenance: {
    source: "trash_spotter_spots" as const,
    evidenceFamily: "observed" as const,
    observedAt: "2026-09-14T09:00:00.000Z",
    zoneId: null,
    sourceModelVersion: null,
    snapshotId: null,
    sourceProvenance: [],
  },
  exclusionReason: null,
};

const geometry = {
  isLoop: true as const,
  origin: [48.85, 2.35] as [number, number],
  returnLeg: null,
  coordinates: [],
  distanceKm: 0,
  durationMinutes: 0,
  legs: [],
  provider: "none" as const,
  profile: null,
  mode: "fallback" as const,
  estimated: true,
};

function payloadWithContext() {
  const candidate = {
    candidateId: "candidate-1",
    family: "observed" as const,
    cleanupWorkload: workload,
  };
  const snapshot = buildRoutePlannerSnapshot({
    generatedAt: "2026-09-14T10:00:00.000Z",
    engineVersion: "route-planner-v2",
    selectedCandidates: [candidate],
    selectedStops: [{
      id: "candidate-1",
      label: "Paris",
      latitude: 48.85,
      longitude: 2.35,
      segmentKm: 0,
      estimatedMinutes: 0,
      priorityReason: "observed",
      score: 50,
    }],
    origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    planningMode: { type: "free" },
    travelBudgetMinutes: 60,
    maxStops: 3,
    priorityVsTravel: 65,
    pickupPreference: "balanced",
    effectiveRiskFocus: "all",
    volunteers: 2,
    groupCount: 1,
    routeGeometry: geometry,
    travelDistanceKm: 0,
    travelMinutes: 0,
    returnDistanceKm: 0,
    returnMinutes: 0,
    groups: [{
      groupIndex: 1,
      volunteerCount: 2,
      candidateIds: ["candidate-1"],
      reservedCandidateIds: [],
      targetCount: 1,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes: 60,
      withinBudget: true,
      routeGeometry: geometry,
      operationalBudget: null,
    }],
    dataStatus: "complete",
    dataLayers: { observed: "complete", prediction: "unavailable", recommendation: "ok" },
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    },
    prediction: null,
  });
  const context = buildRouteCalibrationContext({
    generatedAt: snapshot.generatedAt,
    routeEngineVersion: snapshot.engineVersion,
    volunteersExpected: 2,
    groupCount: 1,
    candidates: [candidate],
    plannerSnapshot: snapshot,
  });
  const now = new Date("2026-09-14T10:01:00.000Z");
  return {
    now,
    snapshot,
    context,
    proof: createRoutePlannerProof({ snapshot, now: new Date("2026-09-14T10:00:00.000Z") }),
    payload: {
      associationName: "Action spontanée",
      organizerType: "association" as const,
      actionDate: "2026-09-14",
      locationLabel: "Paris",
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 2,
      durationMinutes: 60,
      preparationData: { routeCalibrationContext: context },
    },
  };
}

describe("planner trust boundary", () => {
  it("promotes only a verified snapshot to immutable server metadata", () => {
    const value = payloadWithContext();
    const trusted = promoteVerifiedPlannerContext({
      ...value.payload,
      plannerSnapshotProof: value.proof,
    }, value.now);

    expect(trusted.preparationData?.routeCalibrationContext?.version).toBe("action-route-calibration-v3");
    expect(trusted.preparationData?.routeCalibrationContext?.plannerSnapshotIntegrity).toMatchObject({
      status: "server_verified",
      proofVersion: "route-planner-proof-v1",
      snapshotHash: value.proof.snapshotHash,
      verifiedAt: value.now.toISOString(),
    });
    expect(trusted.plannerSnapshotProof).toBeNull();
  });

  it("rejects missing or mismatched proof and leaves actions without context unchanged", () => {
    const value = payloadWithContext();
    expect(() => promoteVerifiedPlannerContext(value.payload, value.now)).toThrowError(
      new PlannerSnapshotTrustError("missing"),
    );
    expect(() => promoteVerifiedPlannerContext({
      ...value.payload,
      plannerSnapshotProof: createRoutePlannerProof({
        snapshot: { ...value.snapshot, engineVersion: "route-planner-v3" },
        now: new Date("2026-09-14T10:00:00.000Z"),
      }),
    }, value.now)).toThrowError(new PlannerSnapshotTrustError("snapshot_mismatch"));

    const unchanged = { ...value.payload, preparationData: null, plannerSnapshotProof: null };
    expect(promoteVerifiedPlannerContext(unchanged, value.now)).toEqual(unchanged);
  });
});
