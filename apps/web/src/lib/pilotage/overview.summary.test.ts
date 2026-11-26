import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { computePilotageComparison } from "./metrics";
import { buildSummary, pickDecisionRecommendation } from "./overview.summary";
import { buildZones } from "./overview.zones";
import { buildOperationalPriorities } from "./prioritization";
import { ADMIN_ROUTE, DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

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

  it("does not turn unavailable moderation into a backlog signal", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
    const approvedOnly = [
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
    const comparison = computePilotageComparison(approvedOnly, 30, now, {
      moderationAvailability: "unavailable",
    });
    const priorities = buildOperationalPriorities({ comparison, zones: [] });
    const summary = buildSummary(comparison, priorities);
    const recommendation = pickDecisionRecommendation(comparison);

    expect(comparison.current.pendingCount).toBeNull();
    expect(comparison.current.moderationDelayDays).toBeNull();
    expect(priorities.some((priority) => priority.id === "admin-backlog")).toBe(false);
    expect(recommendation.href).not.toBe("/admin");
    expect(recommendation.reason).toContain("moderation indisponible");
    expect(summary.alert.title).not.toContain("moderation");
  });

  it("prefers moderation when its negative trend is the highest risk", () => {
    const comparison = computePilotageComparison(
      [
        buildActionDataContract({
          id: "approved-only",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 4,
        }),
        buildActionDataContract({
          id: "pending-current",
          type: "action",
          status: "pending",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-03-20T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 999,
          volunteersCount: 99,
        }),
        buildActionDataContract({
          id: "pending-previous",
          type: "action",
          status: "pending",
          source: "test",
          observedAt: "2026-03-01",
          createdAt: "2026-03-09T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 2,
        }),
      ],
      30,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(pickDecisionRecommendation(comparison).href).toBe(ADMIN_ROUTE);
  });

  it("does not substitute deltaAbsolute when deltaPercent is null in risk ranking", () => {
    const comparison = computePilotageComparison(
      [
        buildActionDataContract({
          id: "approved-only",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 4,
        }),
        buildActionDataContract({
          id: "pending-current",
          type: "action",
          status: "pending",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-01T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 4,
        }),
      ],
      30,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(comparison.metrics.moderationDelayDays?.deltaPercent).toBeNull();
    expect(pickDecisionRecommendation(comparison).href).toBe(DASHBOARD_ROUTE);
  });

  it("falls back to the dashboard when all decision risks are neutral", () => {
    const comparison = computePilotageComparison(
      [
        buildActionDataContract({
          id: "approved-only",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 4,
        }),
      ],
      30,
      new Date("2026-04-10T00:00:00.000Z"),
    );

    expect(
      pickDecisionRecommendation({
        ...comparison,
        metrics: {
          ...comparison.metrics,
          qualityScore: {
            ...comparison.metrics.qualityScore,
            interpretation: "positive",
          },
          coverageRate: {
            ...comparison.metrics.coverageRate,
            interpretation: "positive",
          },
          moderationDelayDays: {
            ...comparison.metrics.moderationDelayDays!,
            interpretation: "neutral",
          },
        },
      }).href,
    ).toBe(DASHBOARD_ROUTE);
  });

  it("distinguishes missing mass, observed zero, empty previous period and partial corpus", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
    const comparison = computePilotageComparison(
      [
        buildActionDataContract({
          id: "unknown-mass",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: null,
          volunteersCount: 3,
        }),
      ],
      30,
      now,
      { moderationAvailability: "unavailable" },
    );
    const summary = buildSummary(comparison, []);
    expect(summary.kpis[0]?.value).toBe("Non renseigné (0% renseigné)");
    expect(summary.kpis[0]?.previousValue).toBe("Non renseigné (aucune action)");
    expect(summary.kpis[0]?.deltaPercent).toBe("Non comparable");
    expect(summary.kpis[2]?.previousValue).toBe("Indisponible");
    expect(summary.kpis[2]?.deltaAbsolute).toBe("Non comparable");
    expect(summary.kpis[2]?.deltaPercent).toBe("Non comparable");

    const observedZero = computePilotageComparison(
      [
        buildActionDataContract({
          id: "zero-mass",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 0,
          volunteersCount: 0,
        }),
      ],
      30,
      now,
      { moderationAvailability: "unavailable" },
    );
    const zeroSummary = buildSummary(observedZero, []);
    expect(zeroSummary.kpis[0]?.value).toBe("0.0 kg (100% renseigné)");
  });

  it("checks exact wasteKnownActions counts and propagates dataAvailability", () => {
    const now = new Date("2026-04-10T00:00:00.000Z");
    const comparison = computePilotageComparison(
      [
        buildActionDataContract({
          id: "c1",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-04-09",
          createdAt: "2026-04-08T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 10,
          volunteersCount: 2,
        }),
        buildActionDataContract({
          id: "p1",
          type: "action",
          status: "approved",
          source: "test",
          observedAt: "2026-03-01",
          createdAt: "2026-02-28T00:00:00.000Z",
          locationLabel: "Paris 10e",
          latitude: 48.87,
          longitude: 2.35,
          wasteKg: 5,
          volunteersCount: 2,
        }),
      ],
      30,
      now,
    );

    // Simulate rounded 100.0% coverage where 1 action is still missing mass
    comparison.current.approvedActions = 2001;
    comparison.current.wasteKnownActions = 2000;
    comparison.current.wasteCoverageRate = 100;

    const incompleteExactSummary = buildSummary(comparison, []);
    expect(incompleteExactSummary.kpis[1]?.value).toBe("Indisponible");
    expect(incompleteExactSummary.kpis[0]?.deltaPercent).toBe("Non comparable");

    // Truncated corpus must also mark all period comparisons non comparable
    comparison.current.approvedActions = 1;
    comparison.current.wasteKnownActions = 1;
    const truncatedSummary = buildSummary(comparison, [], {
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
    expect(truncatedSummary.kpis[2]?.deltaPercent).toBe("Non comparable");
    expect(truncatedSummary.recommendedAction.label).toBe("Verifier la disponibilite des donnees");

    // Failed actions source must mark values and deltas unavailable
    const failedSummary = buildSummary(comparison, [], {
      isTruncated: false,
      sourceHealth: {
        partial: true,
        failedSources: ["actions"],
        availableSources: [],
        warnings: ["actions_failed"],
      },
    });
    expect(failedSummary.kpis[0]?.value).toBe("Indisponible");
    expect(failedSummary.kpis[2]?.value).toBe("Indisponible");
    expect(failedSummary.kpis[0]?.deltaPercent).toBe("Indisponible");
  });
});
