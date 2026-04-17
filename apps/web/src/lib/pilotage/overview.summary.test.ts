import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { computePilotageComparison } from "./metrics";
import { buildSummary, pickDecisionRecommendation } from "./overview.summary";
import { buildZones } from "./overview.zones";
import { buildOperationalPriorities } from "./prioritization";

describe("overview summary", () => {
  it("builds decision summary with 3 KPIs and an actionable recommendation", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
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
        status: "pending",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-02T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 2,
        volunteersCount: 1,
      }),
    ];

    const comparison = computePilotageComparison(contracts, 30, now);
    const zones = buildZones(contracts, 30, now);
    const priorities = buildOperationalPriorities({ comparison, zones });
    const summary = buildSummary(comparison, priorities);
    const recommendation = pickDecisionRecommendation(comparison);

    expect(summary.kpis).toHaveLength(3);
    expect(summary.alert.title.length).toBeGreaterThan(0);
    expect(summary.recommendedAction.reason.length).toBeGreaterThan(0);
    expect(recommendation.href.startsWith("/")).toBe(true);
    expect(recommendation.label.length).toBeGreaterThan(0);
  });
});
