import { describe, expect, it } from "vitest";
import { getScientificFactor } from "./scientific-registry";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";
import { solveAiCleanwalkGoals, type AiCollectionGoalInput, type AiMaterialScenario } from "./ai-cleanwalk-goal-solver";

const materials: AiMaterialScenario[] = [
  { material: "PLASTIC", share: 0.5, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
  { material: "ALUMINIUM", share: 0.1, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
  { material: "GLASS", share: 0.4, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 },
];

function makeScenario(overrides: Partial<AiCollectionGoalInput> = {}): AiCollectionGoalInput {
  return {
    targetCarbonKgCo2e: 0.12075,
    targetWaterConsumedLiters: 1.5594,
    waterMode: "RISQUE_CONVENTIONNEL",
    materials,
    butts: { mode: "NOT_RECYCLED" },
    maxPersonHours: 0.25,
    preferredPercent: 50,
    ...overrides,
  };
}

describe("solveAiCleanwalkGoals", () => {
  it("uses registry factors for BNR incorporation and keeps them tied to incorporated material", () => {
    expect(getScientificFactor("ademe-bnr-glass-incorporation-2021").value).toBe(1.948);
    expect(getScientificFactor("ademe-bnr-plastic-incorporation-2021").value).toBe(2.702);
    expect(getScientificFactor("ademe-bnr-aluminium-incorporation-2021").value).toBe(6.407);
    expect(0.5 * 2.702 + 0.1 * 6.407 + 0.4 * 1.948).toBeCloseTo(2.7709, 9);
  });

  it("returns the expected discontinuous feasible set for both targets and the voluntary cap", () => {
    const projection = solveAiCleanwalkGoals(makeScenario());
    expect(projection.positions).toHaveLength(101);
    expect(projection.factorVersions).toContain("ademe-bnr-glass-incorporation-2021@2021.1");
    expect(projection.factorVersions).toContain(IMPACT_PROXY_CONFIG.effectiveVersion);
    expect(projection.eligiblePercents[0]).toBe(1);
    expect(projection.eligiblePercents.at(-1)).toBe(98);
    expect(projection.eligiblePercents).toHaveLength(98);
    expect(projection.positions[0].status).toBe("INFEASIBLE");
    expect(projection.positions[99].status).toBe("OVER_BUDGET");
    expect(projection.positions[100].status).toBe("INFEASIBLE");
  });

  it("distinguishes a zero target from an unknown target and never invents NA as zero", () => {
    expect(solveAiCleanwalkGoals(makeScenario({ targetCarbonKgCo2e: 0, targetWaterConsumedLiters: 0 })).selected.requiredPersonHours).toBe(0);
    expect(solveAiCleanwalkGoals(makeScenario({ targetCarbonKgCo2e: null })).selected.status).toBe("UNKNOWN");
    expect(solveAiCleanwalkGoals(makeScenario({ materials: [{ material: "STEEL", share: 1, destination: "RECYCLING", recyclingFraction: 1, incorporationYield: 1 }] })).selected.status).toBe("UNKNOWN");
  });

  it("uses the 500 L risk path separately from net ACV water", () => {
    const risk = solveAiCleanwalkGoals(makeScenario());
    expect(risk.selected.waterConventionalRiskLiters).toBe(1000);
    expect(risk.selected.netAcvWaterConsumedSavedLiters).toBeNull();
    const acv = solveAiCleanwalkGoals(makeScenario({ waterMode: "EAU_CONSOMMEE_ACV" }));
    expect(acv.selected.status).toBe("UNKNOWN");
    expect(IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt).toBe(500);
  });

  it("classifies zero or negative mechanisms as infeasible for positive targets", () => {
    const noCredit = [{ material: "PLASTIC" as const, share: 1, destination: "INCINERATION_WITH_RECOVERY" as const, recyclingFraction: 0, incorporationYield: 0 }];
    const projection = solveAiCleanwalkGoals(makeScenario({ materials: noCredit, targetCarbonKgCo2e: 1, targetWaterConsumedLiters: 0, preferredPercent: 0, maxPersonHours: null }));
    expect(projection.selected.status).toBe("INFEASIBLE");
    expect(projection.overallStatus).toBe("NO_FEASIBLE_POSITION");
    expect(solveAiCleanwalkGoals(makeScenario({ preferredPercent: 100, targetWaterConsumedLiters: 0, maxPersonHours: null })).selected.status).toBe("INFEASIBLE");
    const negativeWater = [{ material: "PLASTIC" as const, share: 1, destination: "RECYCLING" as const, recyclingFraction: 1, incorporationYield: 1, netWaterSavingsLitersPerKgMpr: -2 }];
    expect(solveAiCleanwalkGoals(makeScenario({ materials: negativeWater, waterMode: "EAU_CONSOMMEE_ACV", targetCarbonKgCo2e: 0, targetWaterConsumedLiters: 1, preferredPercent: 0, maxPersonHours: null })).selected.status).toBe("INFEASIBLE");
    const zeroWater = [{ material: "PLASTIC" as const, share: 1, destination: "RECYCLING" as const, recyclingFraction: 1, incorporationYield: 1, netWaterSavingsLitersPerKgMpr: 0 }];
    expect(solveAiCleanwalkGoals(makeScenario({ materials: zeroWater, waterMode: "EAU_CONSOMMEE_ACV", targetCarbonKgCo2e: 0, targetWaterConsumedLiters: 1, preferredPercent: 0, maxPersonHours: null })).selected.status).toBe("INFEASIBLE");
  });

  it("keeps treatment emissions unknown when the recycling benefit is zero", () => {
    const incineration = [{ material: "PLASTIC" as const, share: 1, destination: "INCINERATION_NO_RECOVERY" as const, recyclingFraction: 0, incorporationYield: 0 }];
    const position = solveAiCleanwalkGoals(makeScenario({ materials: incineration, targetCarbonKgCo2e: 0, targetWaterConsumedLiters: 0, preferredPercent: 0 })).selected;
    expect(position.status).toBe("FEASIBLE_SCENARIO");
    expect(position.materialBreakdown[0].recyclingBenefitKgCo2e).toBe(0);
    expect(position.materialBreakdown[0].treatmentEmissionsKgCo2e).toBeNull();
    expect(position.materialBreakdown[0].netTreatmentClimateKgCo2e).toBeNull();
  });

  it("requires explicit acceptance of the provider's CO₂/CO₂e comparability claim", () => {
    const unaccepted = solveAiCleanwalkGoals(makeScenario({ butts: { mode: "TCHAO_PROVIDER_SCENARIO", acceptsCarbonComparabilityHypothesis: false }, targetWaterConsumedLiters: 0, preferredPercent: 100, maxPersonHours: null }));
    const accepted = solveAiCleanwalkGoals(makeScenario({ butts: { mode: "TCHAO_PROVIDER_SCENARIO", acceptsCarbonComparabilityHypothesis: true }, targetWaterConsumedLiters: 0, preferredPercent: 100, maxPersonHours: null }));
    expect(unaccepted.selected.status).toBe("UNKNOWN");
    expect(accepted.selected.status).toBe("FEASIBLE_SCENARIO");
  });

  it("applies ceiling after solving and monotonically increases quantities as targets grow", () => {
    const base = solveAiCleanwalkGoals(makeScenario({ preferredPercent: 50, maxPersonHours: null })).selected;
    const harder = solveAiCleanwalkGoals(makeScenario({ targetCarbonKgCo2e: 0.2415, preferredPercent: 50, maxPersonHours: null })).selected;
    expect(base.buttsCount).toBe(Math.ceil(base.requiredPersonHours! * 380 * 0.5 - 1e-12));
    expect(harder.requiredPersonHours).toBeGreaterThan(base.requiredPersonHours!);
    expect(harder.wasteKg).toBeGreaterThan(base.wasteKg!);
    expect(harder.buttsCount).toBeGreaterThanOrEqual(base.buttsCount!);
  });

  it("accepts a budget reached exactly and flags the next smaller budget", () => {
    const unbounded = solveAiCleanwalkGoals(makeScenario({ preferredPercent: 50, maxPersonHours: null })).selected.requiredPersonHours!;
    expect(solveAiCleanwalkGoals(makeScenario({ preferredPercent: 50, maxPersonHours: unbounded })).selected.status).toBe("FEASIBLE_SCENARIO");
    expect(solveAiCleanwalkGoals(makeScenario({ preferredPercent: 50, maxPersonHours: unbounded - 1e-7 })).selected.status).toBe("OVER_BUDGET");
  });

  it("rejects invalid mixes, duplicate materials, and invalid ranges", () => {
    expect(() => solveAiCleanwalkGoals(makeScenario({ materials: [{ ...materials[0], share: 0.9 }] }))).toThrow(/totaliser 1/);
    expect(() => solveAiCleanwalkGoals(makeScenario({ materials: [materials[0], materials[0]] }))).toThrow(/Doublon/);
    expect(() => solveAiCleanwalkGoals(makeScenario({ materials: [{ ...materials[0], incorporationYield: 1.2 }] }))).toThrow(/fraction/);
    expect(() => solveAiCleanwalkGoals(makeScenario({ preferredPercent: 101 }))).toThrow(/0..100/);
  });

  it("reproduces the conditional 15-billion-token reference scenarios", () => {
    const mix = materials.map((material) => ({ ...material, incorporationYield: 0.7 }));
    const base = { targetCarbonKgCo2e: 1811.25, targetWaterConsumedLiters: 23391, materials: mix, maxPersonHours: null };
    const noButtCredit20 = solveAiCleanwalkGoals(makeScenario({ ...base, preferredPercent: 20 })).selected;
    const buttCredit20 = solveAiCleanwalkGoals(makeScenario({ ...base, preferredPercent: 20, butts: { mode: "TCHAO_PROVIDER_SCENARIO", acceptsCarbonComparabilityHypothesis: true } })).selected;
    const noButtCredit80 = solveAiCleanwalkGoals(makeScenario({ ...base, preferredPercent: 80 })).selected;
    const buttCredit80 = solveAiCleanwalkGoals(makeScenario({ ...base, preferredPercent: 80, butts: { mode: "TCHAO_PROVIDER_SCENARIO", acceptsCarbonComparabilityHypothesis: true } })).selected;
    expect(noButtCredit20.requiredPersonHours).toBeCloseTo(117.90557, 4);
    expect(buttCredit20.requiredPersonHours).toBeCloseTo(115.89871, 4);
    expect(noButtCredit80.requiredPersonHours).toBeCloseTo(471.62228, 4);
    expect(buttCredit80.requiredPersonHours).toBeCloseTo(369.30616, 4);
    expect(noButtCredit20.buttsCount).toBe(8961);
    expect(buttCredit20.buttsCount).toBe(8809);
    expect(noButtCredit80.buttsCount).toBe(143374);
    expect(buttCredit80.buttsCount).toBe(112270);
  });
});
