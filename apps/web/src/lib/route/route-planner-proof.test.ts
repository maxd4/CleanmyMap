import { describe, expect, it } from "vitest";
import {
  buildRoutePlannerSnapshot,
  type RoutePlannerSnapshot,
} from "./route-calibration";
import {
  createRoutePlannerProof,
  verifyRoutePlannerProof,
} from "./route-planner-proof";
import { isRoutePlannerSnapshot } from "./route-planner-snapshot-validation";

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

function snapshot(): RoutePlannerSnapshot {
  return buildRoutePlannerSnapshot({
    generatedAt: "2026-09-14T10:00:00.000Z",
    engineVersion: "route-planner-v2",
    selectedCandidates: [],
    selectedStops: [],
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
      candidateIds: [],
      reservedCandidateIds: [],
      targetCount: 0,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes: 60,
      withinBudget: true,
      routeGeometry: geometry,
      operationalBudget: null,
    }],
    dataStatus: "empty",
    dataLayers: { observed: "empty", prediction: "unavailable", recommendation: "empty" },
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    },
    prediction: null,
  });
}

describe("route planner proof v1", () => {
  const issuedAt = new Date("2026-09-14T10:00:00.000Z");

  it("accepts an untampered snapshot and rejects a mutated snapshot", () => {
    const original = snapshot();
    const proof = createRoutePlannerProof({ snapshot: original, now: issuedAt });

    expect(verifyRoutePlannerProof({ proof, snapshot: original, now: issuedAt })).toEqual({
      ok: true,
      snapshotHash: proof.snapshotHash,
    });
    expect(verifyRoutePlannerProof({
      proof,
      snapshot: { ...original, engineVersion: "route-planner-v3" },
      now: issuedAt,
    })).toEqual({ ok: false, reason: "snapshot_mismatch" });
  });

  it("rejects a modified signature, an expired proof and a missing proof", () => {
    const original = snapshot();
    const proof = createRoutePlannerProof({ snapshot: original, now: issuedAt });
    const tampered = {
      ...proof,
      token: `${proof.token.slice(0, -1)}${proof.token.endsWith("0") ? "1" : "0"}`,
    };

    expect(verifyRoutePlannerProof({ proof: tampered, snapshot: original, now: issuedAt })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(verifyRoutePlannerProof({
      proof,
      snapshot: original,
      now: new Date(issuedAt.getTime() + 30 * 60 * 1000),
    })).toEqual({ ok: false, reason: "expired" });
    expect(verifyRoutePlannerProof({ proof: undefined, snapshot: original, now: issuedAt })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("validates the versioned snapshot invariants and keeps v1 dispatch explicit", () => {
    const original = snapshot();
    expect(isRoutePlannerSnapshot(original, "route-planner-snapshot-v1")).toBe(true);
    expect(isRoutePlannerSnapshot({
      ...original,
      selectedCandidateIds: ["duplicate", "duplicate"],
    })).toBe(false);
    expect(isRoutePlannerSnapshot({
      ...original,
      groups: [],
    })).toBe(false);
    expect(isRoutePlannerSnapshot({
      ...original,
      modelVersions: { ...original.modelVersions, planner: "future-active-planner" },
    })).toBe(false);
  });

  it("rejects selected stop coordinates outside the shared geographic bounds", () => {
    const original = snapshot();
    const stop = {
      id: "stop-1",
      label: "Stop",
      latitude: 48.85,
      longitude: 2.35,
      segmentKm: 0,
      estimatedMinutes: 0,
      priorityReason: "fixture",
      score: 50,
    };
    const withStop = {
      ...original,
      selectedCandidateIds: ["stop-1"],
      observedCandidateIds: ["stop-1"],
      selectedStops: [stop],
      groups: [{ ...original.groups[0]!, candidateIds: ["stop-1"], targetCount: 1 }],
    };

    expect(isRoutePlannerSnapshot(withStop)).toBe(true);
    expect(isRoutePlannerSnapshot({
      ...withStop,
      selectedStops: [{ ...stop, latitude: 91 }],
    })).toBe(false);
    expect(isRoutePlannerSnapshot({
      ...withStop,
      selectedStops: [{ ...stop, longitude: -181 }],
    })).toBe(false);
  });
});
