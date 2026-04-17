import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { computePilotageComparison } from "./metrics";

describe("computePilotageComparison", () => {
  it("computes deltas for current vs previous window", () => {
    const contracts = [
      buildActionDataContract({
        id: "a-current",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 12,
        volunteersCount: 5,
        cigaretteButts: 100,
      }),
      buildActionDataContract({
        id: "a-previous",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-03-20",
        createdAt: "2026-03-27T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 4,
        volunteersCount: 2,
        cigaretteButts: 20,
      }),
      buildActionDataContract({
        id: "pending",
        type: "action",
        status: "pending",
        source: "test",
        observedAt: "2026-04-07",
        createdAt: "2026-04-01T10:00:00.000Z",
        locationLabel: "Paris 11e",
        latitude: null,
        longitude: null,
        wasteKg: 0,
      }),
    ];

    const result = computePilotageComparison(
      contracts,
      15,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(result.current.approvedActions).toBe(1);
    expect(result.previous.approvedActions).toBe(1);
    expect(result.current.impactVolumeKg).toBe(12);
    expect(result.previous.impactVolumeKg).toBe(4);
    expect(result.metrics.impactVolumeKg.deltaPercent).toBe(200);
    expect(result.current.moderationDelayDays).toBeGreaterThan(0);
    expect(result.current.reliability.level).toBeTruthy();
    expect(result.current.reliability.score).toBeGreaterThanOrEqual(0);
    expect(result.current.reliability.score).toBeLessThanOrEqual(100);
  });
});
