import { describe, expect, it } from "vitest";
import {
  buildPublicImpactCalculationFromActions,
  buildPublicImpactMetrics,
  PUBLIC_IMPACT_KPI_DEFINITIONS,
} from "./public-impact-kpis";

function action(params: {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  megotsKg?: number;
  megotsCondition?: "propre" | "humide" | "mouille" | null;
  actionPhase?: string | null;
  volunteersCount?: number;
  durationMinutes?: number;
}) {
  return {
    metadata: {
      wasteKg: params.wasteKg ?? null,
      cigaretteButts: params.cigaretteButts ?? null,
      volunteersCount: params.volunteersCount ?? 0,
      durationMinutes: params.durationMinutes ?? 0,
      actionPhase: params.actionPhase ?? "post_action_complete",
      wasteBreakdown:
        params.megotsKg !== undefined || params.megotsCondition !== undefined
          ? {
              ...(params.megotsKg !== undefined
                ? { megotsKg: params.megotsKg }
                : {}),
              ...(params.megotsCondition !== undefined
                ? { megotsCondition: params.megotsCondition ?? undefined }
                : {}),
            }
          : null,
    },
  };
}

describe("public Impact KPI contract", () => {
  it("owns the six keys, order, labels, classifications and formatting", () => {
    const metrics = buildPublicImpactMetrics(
      {
        wasteKg: 12.345,
        butts: 2_500.6,
        volunteers: 12.6,
        co2: 14.456,
        water: 20_000.6,
        euro: 18.6,
      },
      true,
    );

    expect(metrics.map((metric) => metric.key)).toEqual([
      "wasteKg",
      "butts",
      "volunteers",
      "co2",
      "water",
      "euro",
    ]);
    expect(metrics.map((metric) => metric.label)).toEqual(
      PUBLIC_IMPACT_KPI_DEFINITIONS.map((definition) => definition.label),
    );
    expect(metrics.map((metric) => metric.value)).toEqual([
      "12,3 kg",
      "2 501",
      "13",
      "14,5 kg",
      "20 001 L",
      "19 €",
    ]);
    expect(
      metrics
        .slice(0, 3)
        .every((metric) => metric.classification === "terrain"),
    ).toBe(true);
    expect(
      metrics.slice(3).every((metric) => metric.classification === "proxy"),
    ).toBe(true);
  });

  it("keeps the public calculation deterministic and excludes future pre-actions", () => {
    const inputs = [
      action({ wasteKg: 1, cigaretteButts: 2_500, volunteersCount: 2 }),
      action({
        actionPhase: "pre_action",
        wasteKg: 999,
        cigaretteButts: 999_999,
        volunteersCount: 99,
      }),
    ];

    const first = buildPublicImpactCalculationFromActions(inputs);
    const second = buildPublicImpactCalculationFromActions(inputs);

    expect(first).toEqual(second);
    expect(first.counters).toMatchObject({
      wasteKg: 1,
      butts: 2_500,
      volunteers: 2,
      co2: 1.2,
      water: 1_250_000,
      euro: 2,
    });
  });

  it.each(["propre", "humide", "mouille"] as const)(
    "keeps waste unknown when only the %s butt condition is available",
    (condition) => {
      const calculation = buildPublicImpactCalculationFromActions([
        action({ cigaretteButts: 2_500, megotsCondition: condition }),
      ]);

      expect(calculation.counters.wasteKg).toBe(0);
      expect(calculation.impactTerrain.wasteKnownActions).toBe(0);
    },
  );

  it("keeps declared waste separate from butt mass", () => {
    const calculation = buildPublicImpactCalculationFromActions([
      action({
        wasteKg: 1,
        megotsKg: 2,
        cigaretteButts: 2_500,
        megotsCondition: "humide",
      }),
    ]);

    expect(calculation.counters.wasteKg).toBe(1);
    expect(calculation.impactTerrain.wasteKnownActions).toBe(1);
  });

  it("preserves zero as known and null as unknown in aggregate coverage", () => {
    const calculation = buildPublicImpactCalculationFromActions([
      action({ wasteKg: 0, cigaretteButts: 10 }),
      action({ wasteKg: null, cigaretteButts: 10 }),
    ]);

    expect(calculation.impactTerrain.wasteKnownActions).toBe(1);
    expect(calculation.impactTerrain.wasteCoverageRate).toBe(50);
    expect(calculation.counters.wasteKg).toBe(0);
  });
});
