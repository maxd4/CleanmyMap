import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { buildPilotageOverviewFromContracts } from "./overview";

describe("buildPilotageOverviewFromContracts", () => {
  it("keeps coherent numbers across summary/comparison/zones", () => {
    const contracts = [
      buildActionDataContract({
        id: "a1",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 10,
        volunteersCount: 4,
      }),
      buildActionDataContract({
        id: "a2",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-03-01",
        createdAt: "2026-03-24T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 5,
        volunteersCount: 2,
      }),
    ];

    const overview = buildPilotageOverviewFromContracts({
      contracts,
      periodDays: 30,
      now: new Date("2026-04-10T00:00:00.000Z"),
    });

    expect(overview.summary.kpis).toHaveLength(3);
    expect(overview.comparison.current.approvedActions).toBe(1);
    expect(overview.comparison.current.impactVolumeKg).toBe(10);
    expect(overview.comparisonsByWindow["30"].current.impactVolumeKg).toBe(10);
    expect(overview.zones.length).toBeGreaterThanOrEqual(1);
    expect(overview.methods.length).toBeGreaterThanOrEqual(3);
    expect(overview.priorities).toHaveLength(3);
    expect(overview.summary.kpis[0].previousValue.length).toBeGreaterThan(0);
    expect(overview.summary.recommendedAction.reason.length).toBeGreaterThan(0);
    expect(overview.summary.recommendedAction.label.length).toBeGreaterThan(0);
  });
});
