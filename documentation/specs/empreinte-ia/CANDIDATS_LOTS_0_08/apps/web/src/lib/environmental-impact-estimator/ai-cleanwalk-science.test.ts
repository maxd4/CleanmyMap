import { describe, expect, it } from "vitest";
import { computeQualifiedEnergy, computeTextEnergyScenario, computeEnergyCarbonWater, RTE_FRANCE_2025_CONSUMPTION } from "./ai-cleanwalk-science";

describe("lot0 science: energy boundaries and provenance",()=>{
  it("does not apply PUE twice on a FACILITY measurement",()=>{
    const v=computeQualifiedEnergy({environment:"cloud_api",measurement:{kwh:2,boundary:"FACILITY",evidence:"MEASURED"},pue:1.5});
    expect(v.facilityKwh).toBe(2);expect(v.itKwh).toBeNull();
  });
  it("IT without a known PUE remains physically partial",()=>{
    const v=computeQualifiedEnergy({environment:"cloud_api",measurement:{kwh:2,boundary:"IT_FULL",evidence:"MEASURED"}});
    expect(v.itKwh).toBe(2);expect(v.facilityKwh).toBeNull();
  });
  it("computes local wall and idle-adjusted incremental energy independently",()=>{
    const v=computeQualifiedEnergy({environment:"local_device",localPower:{watts:100,idleWatts:30,durationSeconds:3600}});
    expect(v.localWallKwh).toBeCloseTo(.1,9);expect(v.localIncrementalKwh).toBeCloseTo(.07,9);
    expect(v.facilityKwh).toBeNull();
  });
  it("refuses local PUE and mixed measurement sources",()=>{
    expect(()=>computeQualifiedEnergy({environment:"local_device",pue:1.15})).toThrow();
    expect(()=>computeQualifiedEnergy({environment:"cloud_api",measurement:{kwh:2,boundary:"LOCAL_WALL",evidence:"MEASURED"}})).toThrow();
  });
  it("preserves the 2024 historical factor by making the 2025 factor opt-in",()=>{
    expect(RTE_FRANCE_2025_CONSUMPTION.kgCo2ePerKwh).toBe(.0200);
    expect(RTE_FRANCE_2025_CONSUMPTION.basis).toBe("consumption_direct");
  });
  it("computes 1M proxy tokens in FR 2025 at low, central, high",()=>{
    for(const [scenario, expectedSite, expectedCarbon] of [["low",.069,.00138],["central",.345,.0069],["high",.69,.0138]] as const){
      const energy=computeTextEnergyScenario(1_000_000,scenario);
      const outcome=computeEnergyCarbonWater({energy,region:"FR",factor:RTE_FRANCE_2025_CONSUMPTION,locationMode:"HYPOTHETICAL"});
      expect(energy.facilityKwh).toBeCloseTo(expectedSite,9);
      expect(outcome.co2eKg).toBeCloseTo(expectedCarbon,9);
      expect(outcome.status).toBe("SCENARIO_ONLY");
      expect(outcome.totalWaterLiters).toBeNull();
    }
  });
  it("does not infer carbon from the user's country or missing physical region",()=>{
    const energy=computeTextEnergyScenario(1_000_000,"central");
    const v=computeEnergyCarbonWater({energy,region:"FR",factor:RTE_FRANCE_2025_CONSUMPTION,locationMode:"UNKNOWN"});
    expect(v.co2eKg).toBeNull();expect(v.status).toBe("UNKNOWN");
  });
  it("keeps indirect and direct water separate: total NA when either component unknown",()=>{
    const energy=computeTextEnergyScenario(1_000_000,"central");
    const v=computeEnergyCarbonWater({energy,region:"FR",factor:RTE_FRANCE_2025_CONSUMPTION,locationMode:"HYPOTHETICAL",wueSiteLitersPerItKwh:0.4});
    expect(v.directWaterLiters).toBeCloseTo(.12,9);expect(v.indirectWaterLiters).toBeNull();expect(v.totalWaterLiters).toBeNull();
  });
});
