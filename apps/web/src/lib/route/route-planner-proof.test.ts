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
import { createRoutePlannerSnapshotInput } from "./route-calibration-test-fixtures";

function snapshot(): RoutePlannerSnapshot {
  const input = createRoutePlannerSnapshotInput();
  return buildRoutePlannerSnapshot({
    ...input,
    volunteers: 2,
    groups: input.groups.map((group) => ({ ...group, volunteerCount: 2 })),
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
