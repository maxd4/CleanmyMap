import { describe, expect, it } from "vitest";
import { solveAiCleanwalkGoals, type AiCollectionGoalInput, type AiMaterialScenario, ADEME_BNR_2021_INCORPORATION } from "./ai-cleanwalk-goal-solver";
const materials:AiMaterialScenario[]=[
  {material:"PLASTIC",share:.5,destination:"RECYCLING",recyclingFraction:1,incorporationYield:1},
  {material:"ALUMINIUM",share:.1,destination:"RECYCLING",recyclingFraction:1,incorporationYield:1},
  {material:"GLASS",share:.4,destination:"RECYCLING",recyclingFraction:1,incorporationYield:1},
];
function scenario(p=50, extra:Partial<AiCollectionGoalInput>={}):AiCollectionGoalInput{
  return {targetCarbonKgCo2e:.12075,targetWaterConsumedLiters:1.5594,materials,butts:{mode:"NOT_RECYCLED"},waterMode:"RISQUE_CONVENTIONNEL",preferredPercent:p,maxPersonHours:.25,...extra};
}
describe("lots0+08 dual thresholds",()=>{
  it("pins BNR factors to actual incorporated material, not collected mass",()=>{
    expect(ADEME_BNR_2021_INCORPORATION.GLASS).toBe(1.948);
    expect(ADEME_BNR_2021_INCORPORATION.PLASTIC).toBe(2.702);
    expect(ADEME_BNR_2021_INCORPORATION.ALUMINIUM).toBe(6.407);
    expect(.5*2.702+.1*6.407+.4*1.948).toBeCloseTo(2.7709,9);
  });
  it("offers exactly slider 1..98 when both thresholds and 0.25h budget are explicit",()=>{
    const result=solveAiCleanwalkGoals(scenario());
    expect(result.eligiblePercents).toHaveLength(98);
    expect(result.eligiblePercents[0]).toBe(1);
    expect(result.eligiblePercents.at(-1)).toBe(98);
    expect(result.positions[0].status).toBe("INFEASIBLE");
    expect(result.positions[99].status).toBe("OVER_BUDGET");
    expect(result.positions[100].status).toBe("INFEASIBLE");
  });
  it("recalculates rounded integer butts without claiming ACV water savings",()=>{
    const r=solveAiCleanwalkGoals(scenario());
    expect(r.selected.buttsCount).toBe(2);
    expect(r.selected.wasteKg).toBeCloseTo(.04358,3);
    expect(r.selected.netAcvWaterConsumedSavedLiters).toBeNull();
    expect(r.selected.waterConventionalRiskLiters).toBe(1000);
  });
  it("restores slider 99 if user removes the voluntary effort budget",()=>{
    const r=solveAiCleanwalkGoals(scenario(99,{maxPersonHours:null}));
    expect(r.positions[99].status).toBe("FEASIBLE_SCENARIO");
  });
  it("never grants carbon recycling benefit to unselected butt processing",()=>{
    const r=solveAiCleanwalkGoals(scenario(100));
    expect(r.selected.status).toBe("INFEASIBLE");
  });
  it("Tchao provider factor is opt-in AND carbon scope comparability required",()=>{
    const no=solveAiCleanwalkGoals(scenario(100,{butts:{mode:"TCHAO_PROVIDER_SCENARIO",acceptsCarbonComparabilityHypothesis:false},maxPersonHours:null}));
    expect(no.selected.status).toBe("UNKNOWN");
    const yes=solveAiCleanwalkGoals(scenario(100,{butts:{mode:"TCHAO_PROVIDER_SCENARIO",acceptsCarbonComparabilityHypothesis:true},maxPersonHours:null}));
    expect(yes.selected.status).toBe("FEASIBLE_SCENARIO");
    expect(yes.selected.buttsCount).toBeGreaterThanOrEqual(35);
  });
  it("NA carbon or unknown waste destination cannot become a zero",()=>{
    const u=solveAiCleanwalkGoals(scenario(20,{targetCarbonKgCo2e:null}));
    expect(u.selected.status).toBe("UNKNOWN");
    const other:AiMaterialScenario[]=[{material:"OTHER",share:1,destination:"UNKNOWN",recyclingFraction:null,incorporationYield:null}];
    expect(solveAiCleanwalkGoals(scenario(20,{materials:other})).selected.status).toBe("UNKNOWN");
  });
  it("non-recycling incineration = 0 recycling benefit but treatment emissions remain unknown",()=>{
    const ms:AiMaterialScenario[]=[{material:"PLASTIC",share:1,destination:"INCINERATION_WITH_RECOVERY",recyclingFraction:0,incorporationYield:0}];
    const r=solveAiCleanwalkGoals(scenario(20,{materials:ms,targetCarbonKgCo2e:0,targetWaterConsumedLiters:1}));
    expect(r.selected.status).toBe("FEASIBLE_SCENARIO");
    expect(r.selected.materialBreakdown[0].recyclingBenefitKgCo2e).toBe(0);
    expect(r.selected.materialBreakdown[0].treatmentEmissionsKgCo2e).toBeNull();
  });
  it("water ACV with unknown factors refuses to invent liters saved",()=>{
    const r=solveAiCleanwalkGoals(scenario(20,{waterMode:"EAU_CONSOMMEE_ACV"}));
    expect(r.selected.status).toBe("UNKNOWN");
  });
  it("signed ACV water can make a position infeasible",()=>{
    const ms:AiMaterialScenario[]=[{material:"PLASTIC",share:1,destination:"RECYCLING",recyclingFraction:1,incorporationYield:1,netWaterSavingsLitersPerKgMpr:-2}];
    const r=solveAiCleanwalkGoals(scenario(0,{materials:ms,waterMode:"EAU_CONSOMMEE_ACV",maxPersonHours:null}));
    expect(r.selected.status).toBe("INFEASIBLE");
  });
  it("fractions must sum to 1 and yields must be bounded",()=>{
    expect(()=>solveAiCleanwalkGoals(scenario(20,{materials:[{...materials[0],share:.9}]}))).toThrow();
    expect(()=>solveAiCleanwalkGoals(scenario(20,{materials:[{...materials[0],share:1,incorporationYield:1.2}]}))).toThrow();
  });
  it("15 billion-token US scenario with 70% incorporation reproduces conditional hours",()=>{
    const mix=materials.map(m=>({...m,incorporationYield:.7}));
    const base={targetCarbonKgCo2e:1811.25,targetWaterConsumedLiters:23391,materials:mix,maxPersonHours:null};
    const no20=solveAiCleanwalkGoals(scenario(20,{...base}));
    const yes20=solveAiCleanwalkGoals(scenario(20,{...base,butts:{mode:"TCHAO_PROVIDER_SCENARIO",acceptsCarbonComparabilityHypothesis:true}}));
    expect(no20.selected.requiredPersonHours).toBeCloseTo(117.90557,4);
    expect(yes20.selected.requiredPersonHours).toBeCloseTo(115.89871,4);
    const no80=solveAiCleanwalkGoals(scenario(80,{...base}));
    const yes80=solveAiCleanwalkGoals(scenario(80,{...base,butts:{mode:"TCHAO_PROVIDER_SCENARIO",acceptsCarbonComparabilityHypothesis:true}}));
    expect(no80.selected.requiredPersonHours).toBeCloseTo(471.62228,4);
    expect(yes80.selected.requiredPersonHours).toBeCloseTo(369.30616,4);
  });
});
