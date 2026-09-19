import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./contracts/contract-model";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  BUTTS_PER_KG_REFERENCE,
  buildActionImpactMethodology,
  computeActionImpactKpis,
  estimateActionWasteKg,
  resolveActionWasteKgSource,
  sumActionImpactKpis,
} from "./impact-calculators";

function makeContract(
  overrides: Partial<Parameters<typeof buildActionDataContract>[0]> = {},
) {
  return buildActionDataContract({
    id: "impact-test",
    type: "action",
    status: "approved",
    source: "test",
    observedAt: "2026-08-25",
    locationLabel: "Lieu de test",
    latitude: 48.85,
    longitude: 2.35,
    ...overrides,
  });
}

describe("canonical action impact calculation", () => {
  it("keeps declared waste as the selected source", () => {
    const impact = computeActionImpactKpis(
      makeContract({ wasteKg: 12, cigaretteButts: 10, volunteersCount: 4, durationMinutes: 10 }),
    );

    expect(impact).toMatchObject({
      wasteKg: 12,
      wasteKgSource: "declared",
      butts: 10,
      volunteers: 4,
      co2AvoidedKg: 14.399999999999999,
      waterSavedLiters: 5000,
      streetCleaningSavings: {
        wasteKg: 12,
        durationMinutes: 10,
        actionHours: 10 / 60,
        massEstimateEuros: 18,
        timeEstimateEuros: (10 / 60) * 12.31,
        lowerBoundEuros: (10 / 60) * 12.31,
        upperBoundEuros: 18,
      },
      euroSaved: 18,
    });
  });

  it("keeps waste unavailable when only cigarette butts are present", () => {
    const impact = computeActionImpactKpis(
      makeContract({ cigaretteButts: 3750 }),
    );

    expect(impact).toMatchObject({
      wasteKg: 0,
      wasteKnown: false,
      wasteKgSource: "none",
      co2AvoidedKg: 0,
      euroSaved: 0,
    });
  });

  it("does not qualify invalid declared waste as a measured value", () => {
    expect(
      [-1, Number.NaN, Number.POSITIVE_INFINITY].map((wasteKg) => {
        const contract = { metadata: { wasteKg } };
        return [estimateActionWasteKg(contract), resolveActionWasteKgSource(contract)];
      }),
    ).toEqual([
      [null, "none"],
      [null, "none"],
      [null, "none"],
    ]);
  });

  it("keeps a missing declared waste value unmeasured", () => {
    const contract = { metadata: { wasteKg: undefined } };
    const nullContract = { metadata: { wasteKg: null } };

    expect(estimateActionWasteKg(contract)).toBeNull();
    expect(resolveActionWasteKgSource(contract)).toBe("none");
    expect(estimateActionWasteKg(nullContract)).toBeNull();
    expect(resolveActionWasteKgSource(nullContract)).toBe("none");
  });

  it("does not turn qualified cigarette-butt mass into waste", () => {
    const impact = computeActionImpactKpis(
      makeContract({
        cigaretteButts: 1_000,
        wasteBreakdown: { megotsCondition: "mouille" },
      }),
    );

    expect(impact.wasteKg).toBe(0);
    expect(impact.wasteKnown).toBe(false);
    expect(impact.wasteKgSource).toBe("none");
  });

  it("does not use the cigarette-butt breakdown as total waste", () => {
    const impact = computeActionImpactKpis(
      makeContract({
        wasteBreakdown: { megotsKg: 2.4 },
      }),
    );

    expect(impact).toMatchObject({
      wasteKg: 0,
      wasteKnown: false,
      wasteKgSource: "none",
      co2AvoidedKg: 0,
      euroSaved: 0,
    });
  });

  it("does not invent collection impact for a spot without metrics", () => {
    const impact = computeActionImpactKpis(
      makeContract({ type: "spot" }),
    );

    expect(impact).toEqual({
      wasteKg: 0,
      wasteKnown: false,
      wasteKgSource: "none",
      butts: 0,
      volunteers: 0,
      co2AvoidedKg: 0,
      waterSavedLiters: 0,
      streetCleaningSavings: {
        wasteKg: 0,
        durationMinutes: 0,
        actionHours: 0,
        massEstimateEuros: 0,
        timeEstimateEuros: 0,
        lowerBoundEuros: 0,
        upperBoundEuros: 0,
      },
      euroSaved: 0,
    });
  });

  it("keeps waste unavailable for 13,875 cigarette butts without a waste measure", () => {
    const impact = computeActionImpactKpis(
      makeContract({ cigaretteButts: 13_875 }),
    );

    expect(impact.wasteKg).toBe(0);
    expect(impact.wasteKnown).toBe(false);
    expect(impact.wasteKgSource).toBe("none");
    expect(impact.co2AvoidedKg).toBe(0);
    expect(impact.euroSaved).toBe(0);
  });

  it("aggregates all canonical KPIs from the same contract corpus", () => {
    const totals = sumActionImpactKpis([
      makeContract({ wasteKg: 2, cigaretteButts: 100, volunteersCount: 2 }),
      makeContract({ cigaretteButts: 2500, volunteersCount: 1 }),
    ]);

    expect(totals).toEqual({
      wasteKg: 2,
      wasteKnown: true,
      wasteKnownActions: 1,
      wasteActionCount: 2,
      wasteCoverageRate: 50,
      butts: 2600,
      volunteers: 3,
      co2AvoidedKg: expect.closeTo(2.4, 10),
      waterSavedLiters: 1_300_000,
      streetCleaningSavings: {
        wasteKg: 2,
        durationMinutes: 0,
        actionHours: 0,
        massEstimateEuros: 3,
        timeEstimateEuros: 0,
        lowerBoundEuros: 0,
        upperBoundEuros: 3,
      },
      euroSaved: 3,
    });
  });

  it("keeps an empty action corpus at zero coverage with no known waste", () => {
    expect(sumActionImpactKpis([])).toMatchObject({
      wasteKg: 0,
      wasteKnown: false,
      wasteKnownActions: 0,
      wasteActionCount: 0,
      wasteCoverageRate: 0,
    });
  });

  it("calculates independent mass/time estimates and bounds without volunteer multiplication", () => {
    const totals = sumActionImpactKpis([
      makeContract({ wasteKg: 10, volunteersCount: 20, durationMinutes: 60 }),
      makeContract({ wasteKg: 0, volunteersCount: 50, durationMinutes: 30 }),
    ]);

    expect(totals.streetCleaningSavings).toEqual({
      wasteKg: 10,
      durationMinutes: 90,
      actionHours: 1.5,
      massEstimateEuros: 15,
      timeEstimateEuros: 18.465,
      lowerBoundEuros: 15,
      upperBoundEuros: 18.465,
    });
    expect(totals.wasteKnownActions).toBe(2);
  });

  it("exposes formulas from the same runtime constants as the calculator", () => {
    const methodology = buildActionImpactMethodology();

    expect(methodology.version).toBe(IMPACT_PROXY_CONFIG.version);
    expect(methodology.scope).toBe(
      "Actions approuvees et filtrees par la surface concernee.",
    );
    expect(methodology.buttsPerKg).toBe(BUTTS_PER_KG_REFERENCE);
    expect(methodology.formulas.butts).toBe("butts = max(0, cigaretteButts)");
    expect(methodology.formulas.volunteers).toBe("volunteers = max(0, volunteersCount)");
    expect(methodology.formulas.wasteKg).toContain("valeur déclarée");
    expect(methodology.formulas.wasteKg).not.toContain("cigaretteButts / 2500");
    expect(methodology.formulas.co2e).toContain(
      String(IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg),
    );
    expect(methodology.formulas.water).toContain(
      String(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
    expect(methodology.formulas.euro).toContain(
      String(IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg),
    );
    expect(methodology.formulas.euro).toContain("somme(durationMinutes) / 60");
    expect(methodology.formulas.surface).toContain(
      String(IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg),
    );
  });
});
