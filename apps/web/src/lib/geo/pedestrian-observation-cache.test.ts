import { describe, expect, it } from "vitest";
import type { PedestrianRiskProjectionSegment } from "./pedestrian-risk-projection";
import {
  affectedProjectionSegmentIds,
  applyIncrementalObservationCacheUpdate,
  coalesceObservationInvalidationEvents,
  isInvalidationLeaseExpired,
  retryAvailableAt,
  type PedestrianObservationInvalidationEvent,
} from "./pedestrian-observation-cache";

function segment(id: string, coordinates: [[number, number], [number, number]]): PedestrianRiskProjectionSegment {
  return { projectionSegmentId: id, coordinates, midpoint: coordinates[0], edgeKey: id, osmWayId: id, segmentIndex: 0, direction: "forward", fromNodeId: "a", toNodeId: "b", lengthM: 100, intersectionLengthM: 100, zoneId: "zone", intersectedZoneIds: ["zone"], effectiveResolution: "iris", riskStatus: "predicted", wasteRisk: 50, cigaretteButtRisk: 50, mixedRisk: 50, wasteConfidence: null, cigaretteButtConfidence: null, wasteFactors: null, cigaretteButtFactors: null, availableFactors: { waste: [], cigaretteButts: [] }, missingFactors: { waste: [], cigaretteButts: [] }, serviceability: null, sourceVersions: {} as never, provenance: [], notes: [] };
}

function event(overrides: Partial<PedestrianObservationInvalidationEvent> = {}): PedestrianObservationInvalidationEvent {
  return {
    eventKey: "trash_spotter_spots:spot-1:update:1",
    sourceTable: "trash_spotter_spots",
    sourceId: "spot-1",
    operation: "update",
    reason: "observation",
    oldGeometry: [[48, 2], [48.001, 2]],
    newGeometry: [[48, 2.001], [48.001, 2.001]],
    sourceUpdatedAt: "2026-11-04T00:00:00.000Z",
    attempts: 0,
    ...overrides,
  };
}

describe("pedestrian observation cache invalidation", () => {
  it("invalidates both old and new segments for a move", () => {
    const ids = affectedProjectionSegmentIds([
      segment("old", [[48, 2], [48.001, 2]]),
      segment("new", [[48, 2.001], [48.001, 2.001]]),
      segment("untouched", [[48.003, 2], [48.004, 2]]),
    ], [event()]);
    expect(ids).toEqual(["new", "old"]);
  });

  it("keeps deletion geometry and coalesces retries idempotently", () => {
    const deletion = event({ operation: "delete", newGeometry: null, sourceUpdatedAt: "2026-11-04T00:01:00.000Z" });
    const first = coalesceObservationInvalidationEvents([event(), deletion]);
    const second = coalesceObservationInvalidationEvents([...first, ...first]);
    expect(second).toHaveLength(1);
    expect(second[0]!.oldGeometry).toEqual(event().oldGeometry);
    expect(second[0]!.newGeometry).toBeNull();
  });

  it("supports lease expiry, exponential retry and incremental row replacement", () => {
    const now = new Date("2026-11-04T00:00:00.000Z");
    expect(isInvalidationLeaseExpired({ lockedAt: "2026-11-03T23:59:00.000Z" }, now, 30_000)).toBe(true);
    expect(isInvalidationLeaseExpired({ lockedAt: "2026-11-04T00:00:01.000Z" }, now, 30_000)).toBe(false);
    expect(retryAvailableAt(2, now)).toBe("2026-11-04T00:00:20.000Z");

    const previous = [
      { projectionSegmentId: "a", observationIds: ["old-a"], observedCount: 1, latestObservedAt: "2026-11-01" },
      { projectionSegmentId: "b", observationIds: ["old-b"], observedCount: 1, latestObservedAt: "2026-11-01" },
    ];
    const refreshed = [{ projectionSegmentId: "a", observationIds: ["new-a"], observedCount: 1, latestObservedAt: "2026-11-04" }];
    expect(applyIncrementalObservationCacheUpdate(previous, refreshed, ["a"])).toEqual([
      refreshed[0],
      previous[1],
    ]);
  });
});
