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
});
