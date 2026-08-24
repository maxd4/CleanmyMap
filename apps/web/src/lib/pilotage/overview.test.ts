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
    expect(overview.methods.length).toBeGreaterThanOrEqual(5);
    expect(overview.methods.map((method) => method.id)).toEqual(
      expect.arrayContaining([
        "field-load",
        "place-context",
        "route-profile",
      ]),
    );
    expect(overview.priorities).toHaveLength(3);
    expect(overview.summary.kpis[0].previousValue.length).toBeGreaterThan(0);
    expect(overview.summary.recommendedAction.reason.length).toBeGreaterThan(0);
    expect(overview.summary.recommendedAction.label.length).toBeGreaterThan(0);
  });

  it("marks moderation unavailable without changing approved-derived metrics", () => {
    const contracts = [
      buildActionDataContract({
        id: "approved-only",
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
    ];

    const overview = buildPilotageOverviewFromContracts({
      contracts,
      periodDays: 30,
      now: new Date("2026-04-10T00:00:00.000Z"),
      moderationAvailability: "unavailable",
    });

    expect(overview.comparison.current.approvedActions).toBe(1);
    expect(overview.comparison.current.impactVolumeKg).toBe(10);
    expect(overview.comparison.current.pendingCount).toBeNull();
    expect(overview.comparison.current.moderationDelayDays).toBeNull();
    expect(overview.comparison.metrics.moderationDelayDays).toBeNull();
    expect(overview.zones[0]?.currentModerationDelayDays).toBeNull();
    expect(overview.priorities.some((priority) => priority.id === "admin-backlog")).toBe(false);
    expect(overview.summary.recommendedAction.reason).toContain("moderation indisponible");
  });

  it("preserves source health and truncation separately from business metrics", () => {
    const sourceHealth = {
      partial: true,
      failedSources: ["spots" as const],
      availableSources: ["actions" as const],
      warnings: ["spots_unavailable"],
    };

    const overview = buildPilotageOverviewFromContracts({
      contracts: [],
      periodDays: 90,
      dataAvailability: {
        isTruncated: true,
        sourceHealth,
      },
    });

    expect(overview.dataAvailability).toEqual({
      isTruncated: true,
      sourceHealth,
    });
    expect(overview.comparison.current.approvedActions).toBe(0);
  });
});
