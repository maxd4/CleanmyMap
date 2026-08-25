import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { computeMapKpiStats } from "./use-map-kpi-stats";

describe("map KPI scope", () => {
  it("counts only collection actions and keeps the canonical estimate", () => {
    const action = buildActionDataContract({
      id: "map-action",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-08-25",
      locationLabel: "Lieu action",
      latitude: 48.85,
      longitude: 2.35,
      cigaretteButts: 13_875,
      volunteersCount: 2,
    });
    const spot = buildActionDataContract({
      id: "map-spot",
      type: "spot",
      status: "approved",
      source: "test",
      observedAt: "2026-08-25",
      locationLabel: "Signalement",
      latitude: 48.86,
      longitude: 2.36,
    });

    const stats = computeMapKpiStats([
      toActionMapItem(action),
      toActionMapItem(spot),
    ]);

    expect(stats.visibleActions).toBe(1);
    expect(stats.wasteKg).toBe(5.55);
    expect(stats.co2AvoidedKg).toBeCloseTo(6.66, 10);
    expect(stats.euroSaved).toBe(8);
  });
});
