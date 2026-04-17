import { describe, expect, it } from "vitest";
import { computeClimateContext } from "./climate-context";

describe("computeClimateContext", () => {
  it("applies required formulas and builds comparisons", () => {
    const output = computeClimateContext({
      periodDays: 30,
      now: new Date("2026-04-10T00:00:00.000Z"),
      records: [
        {
          observedAt: "2026-04-09",
          wasteKg: 10,
          cigaretteButts: 120,
          durationMinutes: 60,
          volunteersCount: 3,
          latitude: 48.85,
          longitude: 2.35,
        },
        {
          observedAt: "2026-03-05",
          wasteKg: 5,
          cigaretteButts: 40,
          durationMinutes: 30,
          volunteersCount: 2,
          latitude: null,
          longitude: null,
        },
      ],
    });

    expect(output.comparison.current.volumeKg).toBe(10);
    expect(output.comparison.previous.volumeKg).toBe(5);
    expect(output.comparison.current.co2ProxyKg).toBe(12);
    expect(output.comparison.current.citizenHours).toBe(3);
    expect(output.comparison.current.geocoverageRate).toBe(100);
    expect(output.methods.length).toBeGreaterThanOrEqual(4);
    expect(output.weeklyDecisions.length).toBeGreaterThan(0);
  });
});
