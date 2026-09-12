import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";
import {
  MAX_ROUTE_GROUP_COUNT,
  MAX_ROUTE_VOLUNTEERS,
  balancedVolunteerCounts,
  partitionRouteCandidates,
  validateRouteGroupInput,
} from "./route-group-partition";

const origin: RoutePlannerOrigin = {
  latitude: 48.8566,
  longitude: 2.3522,
  source: "browser",
};

function observedCandidate(
  id: string,
  latitude: number,
  longitude: number,
  score: number,
): RoutePlannerCandidate {
  const contract = buildActionDataContract({
    id,
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-08-25T10:00:00.000Z",
    locationLabel: id,
    latitude,
    longitude,
    wasteCategories: ["plastic"],
  });
  const actionable = buildTrashSpotterActionableCandidates([contract])[0];
  if (!actionable) throw new Error(`Expected actionable candidate: ${id}`);
  return {
    ...actionable,
    score,
    reason: `candidate ${id}`,
    family: "observed",
    evidence: {
      family: "observed",
      source: "trash_spotter_spots",
      proof: "validated",
      observedAt: "2026-08-25T10:00:00.000Z",
    },
  };
}

function predictedCandidate(
  id: string,
  latitude: number,
  longitude: number,
  score: number,
  zoneId: string,
): RoutePlannerCandidate {
  return {
    id,
    label: id,
    latitude,
    longitude,
    score,
    reason: `candidate ${id}`,
    family: "predicted",
    evidence: { family: "predicted", zoneId } as never,
  } as RoutePlannerCandidate;
}

function input(
  candidates: RoutePlannerCandidate[],
  overrides: Partial<Parameters<typeof partitionRouteCandidates>[0]> = {},
) {
  return {
    origin,
    candidates,
    volunteers: 8,
    groupCount: 2,
    travelBudgetMinutes: 60,
    maxStops: 2,
    priorityVsTravel: 65,
    ...overrides,
  };
}

describe("route group partition contract", () => {
  it("tracks calibrated total duration for balancing without changing the travel budget contract", () => {
    const result = partitionRouteCandidates(input([
      observedCandidate("left", 48.857, 2.3522, 90),
      observedCandidate("right", 48.8562, 2.353, 88),
    ], {
      groupCount: 2,
      maxStops: 1,
      operationalBudget: {
        generatedAt: "2026-09-12T00:00:00.000Z",
        estimateDuration: ({ context }) => ({
          contractVersion: "route-cleanup-duration-v1",
          minutes: 10 + context.candidates.length,
          uncertaintyMinutes: 5,
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

    expect(result.groups.every(({ estimatedOperationalDurationMinutes }) =>
      typeof estimatedOperationalDurationMinutes === "number",
    )).toBe(true);
    expect(result.metrics.balanceOperationalDuration).not.toBeNull();
    expect(result.metrics.balanceDuration).toBeGreaterThanOrEqual(0);
  });

  it("balances 11 volunteers across 3 groups as 4/4/3", () => {
    expect(balancedVolunteerCounts(11, 3)).toEqual([4, 4, 3]);
  });

  it("bounds volunteers and groups before planning", () => {
    expect(() => validateRouteGroupInput(0, 1)).toThrow();
    expect(() => validateRouteGroupInput(4, 0)).toThrow();
    expect(() => validateRouteGroupInput(2, 3)).toThrow();
    expect(() => validateRouteGroupInput(MAX_ROUTE_VOLUNTEERS + 1, 1)).toThrow();
    expect(() => validateRouteGroupInput(10, MAX_ROUTE_GROUP_COUNT + 1)).toThrow();
  });

  it("keeps the single-group planner behavior and contract shape", () => {
    const candidate = observedCandidate("one", 48.86, 2.35, 80);
    const result = partitionRouteCandidates(input([candidate], {
      volunteers: 1,
      groupCount: 1,
      maxStops: 1,
    }));

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      groupIndex: 1,
      volunteerCount: 1,
      candidateIds: ["one"],
    });
    expect(result.audit.mode).toBe("single-group-compatible");
  });

  it("partitions 8 volunteers into distinct balanced subsets", () => {
    const result = partitionRouteCandidates(input([
      observedCandidate("a", 48.86, 2.35, 90),
      observedCandidate("b", 48.861, 2.35, 85),
      observedCandidate("c", 48.86, 2.36, 80),
      observedCandidate("d", 48.861, 2.36, 75),
    ]));

    expect(result.groups.map((group) => group.volunteerCount)).toEqual([4, 4]);
    expect(result.groups.map((group) => group.candidateIds.length)).toEqual([2, 2]);
    expect(new Set(result.groups.flatMap((group) => group.candidateIds)).size).toBe(4);
    expect(result.metrics.sharedTargetRatio).toBe(0);
    expect(result.metrics.balanceTargetCount).toBe(0);
  });

  it("keeps the 11/3 split balanced even when candidates are limited", () => {
    const result = partitionRouteCandidates(input([
      observedCandidate("a", 48.86, 2.35, 90),
      observedCandidate("b", 48.861, 2.35, 85),
      observedCandidate("c", 48.86, 2.36, 80),
      observedCandidate("d", 48.861, 2.36, 75),
    ], {
      volunteers: 11,
      groupCount: 3,
      maxStops: 2,
    }));

    expect(result.groups.map((group) => group.volunteerCount)).toEqual([4, 4, 3]);
    expect(result.groups.map((group) => group.candidateIds.length).sort()).toEqual([1, 1, 2]);
    expect(result.metrics.balanceTargetCount).toBe(1);
  });

  it("does not duplicate candidates when there are fewer targets than groups", () => {
    const result = partitionRouteCandidates(input([
      observedCandidate("only-a", 48.86, 2.35, 90),
      observedCandidate("only-b", 48.861, 2.35, 80),
    ], { groupCount: 3, volunteers: 3, maxStops: 2 }));

    expect(result.groups.map((group) => group.candidateIds)).toEqual([
      ["only-a"],
      ["only-b"],
      [],
    ]);
    expect(result.metrics.sharedTargetRatio).toBe(0);
  });

  it("lets safety exclude a high-value candidate before diversity costs apply", () => {
    const unsafe = {
      ...observedCandidate("unsafe", 48.86, 2.35, 100),
      volunteerSafety: { status: "excluded" as const },
    } as RoutePlannerCandidate;
    const result = partitionRouteCandidates(input([
      unsafe,
      observedCandidate("safe", 48.861, 2.35, 50),
    ], { volunteers: 2, groupCount: 2, maxStops: 1 }));

    expect(result.groups.flatMap((group) => group.candidateIds)).toEqual(["safe"]);
    expect(result.audit.excludedUnsafeCandidateIds).toEqual(["unsafe"]);
  });

  it("records explicit predictive-zone and corridor overlap costs without network claims", () => {
    const result = partitionRouteCandidates(input([
      predictedCandidate("zone-a", 48.86, 2.35, 90, "iris-1"),
      predictedCandidate("zone-b", 48.8602, 2.3501, 80, "iris-1"),
    ], { volunteers: 2, groupCount: 2, maxStops: 1 }));

    expect(result.audit.overlapCosts.samePredictiveZone).toBeGreaterThan(0);
    expect(result.audit.overlapCosts.networkSharedDistanceKm).toBeNull();
    expect(result.audit.overlapCosts.networkDistanceMeasured).toBe(false);
  });

  it("is deterministic and accepts event-centered planning with one shared origin", () => {
    const candidates = [
      observedCandidate("event-west", 48.856, 2.34, 80),
      observedCandidate("event-east", 48.857, 2.365, 80),
      observedCandidate("event-north", 48.868, 2.352, 75),
    ];
    const options = {
      volunteers: 6,
      groupCount: 2,
      planningMode: { type: "event-centered" as const, eventId: "event-1" },
    };
    const first = partitionRouteCandidates(input(candidates, options));
    const second = partitionRouteCandidates(input([...candidates].reverse(), options));

    expect(first).toEqual(second);
    expect(first.audit.planningMode).toBe("event-centered");
    expect(first.groups.every((group) => group.origin === origin)).toBe(false);
    expect(first.groups.every((group) =>
      group.origin.latitude === origin.latitude &&
      group.origin.longitude === origin.longitude &&
      group.origin.source === origin.source,
    )).toBe(true);
    expect(new Set(first.groups.flatMap((group) => group.candidateIds)).size).toBe(
      first.groups.flatMap((group) => group.candidateIds).length,
    );
  });
});
