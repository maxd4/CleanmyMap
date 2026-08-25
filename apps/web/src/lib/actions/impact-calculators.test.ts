import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "./data-contract";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import {
  BUTTS_PER_KG_REFERENCE,
  buildActionImpactMethodology,
  computeActionImpactKpis,
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
      makeContract({ wasteKg: 12, cigaretteButts: 10, volunteersCount: 4 }),
    );

    expect(impact).toMatchObject({
      wasteKg: 12,
      wasteKgSource: "declared",
      butts: 10,
      volunteers: 4,
      co2AvoidedKg: 14.399999999999999,
      waterSavedLiters: 5000,
      euroSaved: 18,
    });
  });

  it("estimates waste from cigarette butts when weight is absent", () => {
    const impact = computeActionImpactKpis(
      makeContract({ cigaretteButts: 3750 }),
    );

    expect(impact.wasteKg).toBe(1.5);
    expect(impact.wasteKgSource).toBe("cigarette_butts");
    expect(impact.co2AvoidedKg).toBe(1.7999999999999998);
    expect(impact.euroSaved).toBe(2);
  });

  it("uses wasteBreakdown.megotsKg when it is the available weight signal", () => {
    const impact = computeActionImpactKpis(
      makeContract({
        wasteBreakdown: { megotsKg: 2.4 },
      }),
    );

    expect(impact.wasteKg).toBe(2.4);
    expect(impact.wasteKgSource).toBe("waste_breakdown");
    expect(impact.co2AvoidedKg).toBe(2.88);
    expect(impact.euroSaved).toBe(4);
  });

  it("does not invent collection impact for a spot without metrics", () => {
    const impact = computeActionImpactKpis(
      makeContract({ type: "spot" }),
    );

    expect(impact).toEqual({
      wasteKg: 0,
      wasteKgSource: "none",
      butts: 0,
      volunteers: 0,
      co2AvoidedKg: 0,
      waterSavedLiters: 0,
      euroSaved: 0,
    });
  });

  it("derives non-zero waste, CO2e and euros for 13,875 cigarette butts", () => {
    const impact = computeActionImpactKpis(
      makeContract({ cigaretteButts: 13_875 }),
    );

    expect(impact.wasteKg).toBe(13_875 / BUTTS_PER_KG_REFERENCE);
    expect(impact.wasteKg).toBe(5.55);
    expect(impact.wasteKgSource).toBe("cigarette_butts");
    expect(impact.co2AvoidedKg).toBeCloseTo(6.66, 10);
    expect(impact.euroSaved).toBe(8);
  });

  it("aggregates all canonical KPIs from the same contract corpus", () => {
    const totals = sumActionImpactKpis([
      makeContract({ wasteKg: 2, cigaretteButts: 100, volunteersCount: 2 }),
      makeContract({ cigaretteButts: 2500, volunteersCount: 1 }),
    ]);

    expect(totals).toEqual({
      wasteKg: 3,
      butts: 2600,
      volunteers: 3,
      co2AvoidedKg: expect.closeTo(3.6, 10),
      waterSavedLiters: 1_300_000,
      euroSaved: 5,
    });
  });

  it("exposes formulas from the same runtime constants as the calculator", () => {
    const methodology = buildActionImpactMethodology();

    expect(methodology.version).toBe(IMPACT_PROXY_CONFIG.version);
    expect(methodology.buttsPerKg).toBe(BUTTS_PER_KG_REFERENCE);
    expect(methodology.formulas.wasteKg).toContain(String(BUTTS_PER_KG_REFERENCE));
    expect(methodology.formulas.co2e).toContain(
      String(IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg),
    );
    expect(methodology.formulas.water).toContain(
      String(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt),
    );
    expect(methodology.formulas.euro).toContain(
      String(IMPACT_PROXY_CONFIG.factors.euroSavedPerWasteKg),
    );
    expect(methodology.formulas.surface).toContain(
      String(IMPACT_PROXY_CONFIG.factors.surfaceM2PerWasteKg),
    );
  });
});
