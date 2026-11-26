import { describe, expect, it } from "vitest";
import { computePeriodComparison } from "./period-comparison";

describe("computePeriodComparison", () => {
  it("computes current and previous window metrics with deltas", () => {
    const result = computePeriodComparison(
      [
        {
          status: "approved",
          observedAt: "2026-04-08",
          createdAt: "2026-04-07T08:00:00.000Z",
          latitude: 48.85,
          longitude: 2.35,
          wasteKg: 10,
        },
        {
          status: "pending",
          observedAt: "2026-04-05",
          createdAt: "2026-04-01T08:00:00.000Z",
          latitude: null,
          longitude: null,
          wasteKg: 2,
        },
        {
          status: "approved",
          observedAt: "2026-03-20",
          createdAt: "2026-03-19T08:00:00.000Z",
          latitude: 48.86,
          longitude: 2.36,
          wasteKg: 4,
        },
      ],
      15,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(result.current.actionsCount).toBe(1);
    expect(result.previous.actionsCount).toBe(1);
    expect(result.current.volumeKg).toBe(10);
    expect(result.previous.volumeKg).toBe(4);
    expect(result.current.moderationDelayDays).toBeGreaterThan(0);
    expect(result.deltas.volumeKg.direction).toBe("up");
  });

  it("sums known waste only and exposes coverage", () => {
    const result = computePeriodComparison(
      [
        { status: "approved", observedAt: "2026-04-08", createdAt: null, latitude: null, longitude: null, wasteKg: 0 },
        { status: "approved", observedAt: "2026-04-07", createdAt: null, latitude: null, longitude: null, wasteKg: null },
      ],
      15,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(result.current.volumeKg).toBe(0);
    expect(result.current.wasteKnownActions).toBe(1);
    expect(result.current.wasteCoverageRate).toBe(50);
  });

  it("returns null percent delta when denominator is zero and numerator is non-zero", () => {
    const result = computePeriodComparison(
      [
        { status: "approved", observedAt: "2026-04-08", createdAt: null, latitude: 48.85, longitude: 2.35, wasteKg: 10 },
      ],
      15,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(result.previous.actionsCount).toBe(0);
    expect(result.current.actionsCount).toBe(1);
    expect(result.deltas.actionsCount.percent).toBeNull();
    expect(result.deltas.actionsCount.strength).toBe("strong");
    expect(result.deltas.volumeKg.percent).toBeNull();

    const empty = computePeriodComparison([], 15, new Date("2026-04-10T00:00:00.000Z"));
    expect(empty.deltas.actionsCount.percent).toBe(0);
    expect(empty.deltas.actionsCount.strength).toBe("stable");
  });

  it("marks volumeKg non-comparable when current mass is null and previous is 10kg, or when truncated", () => {
    const result = computePeriodComparison(
      [
        { status: "approved", observedAt: "2026-04-08", createdAt: null, latitude: 48.85, longitude: 2.35, wasteKg: null },
        { status: "approved", observedAt: "2026-03-20", createdAt: null, latitude: 48.85, longitude: 2.35, wasteKg: 10 },
      ],
      15,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(result.deltas.volumeKg).toEqual({
      absolute: null,
      percent: null,
      direction: "flat",
      strength: "stable",
    });

    const truncated = computePeriodComparison(
      [
        { status: "approved", observedAt: "2026-04-08", createdAt: null, latitude: 48.85, longitude: 2.35, wasteKg: 12 },
        { status: "approved", observedAt: "2026-03-20", createdAt: null, latitude: 48.85, longitude: 2.35, wasteKg: 10 },
      ],
      15,
      new Date("2026-04-10T00:00:00.000Z"),
      { isTruncated: true },
    );

    expect(truncated.deltas.actionsCount.absolute).toBeNull();
    expect(truncated.deltas.volumeKg.percent).toBeNull();
    expect(truncated.deltas.coverageRate.absolute).toBeNull();
  });
});
