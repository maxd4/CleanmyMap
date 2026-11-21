import { describe, expect, it } from "vitest";
import { estimatePersonalAiFootprint } from "./personal-ai-estimator";
import { computeQualifiedEnergy, RTE_FRANCE_2025_CONSUMPTION } from "./ai-cleanwalk-science";

describe("empreinte IA: frontières énergétiques et facteur régional opt-in", () => {
  it("keeps a facility measurement separate from IT energy and does not apply PUE twice", () => {
    const result = estimatePersonalAiFootprint({
      energyMeasurement: { kwh: 2, boundary: "FACILITY", evidence: "MEASURED" },
      region: "FR",
      electricityFactorId: "electricity-fr-rte-consumption-2025",
    });
    expect(result.physicalTotals.facilityEnergyKwh).toBe(2);
    expect(result.physicalTotals.itEnergyKwh).toBeNull();
    expect(result.pueApplied).toBe(false);
    expect(result.physicalTotals.operationalKgCo2e).toBeCloseTo(0.04, 10);
  });

  it("keeps IT energy partial when no PUE is declared", () => {
    const result = estimatePersonalAiFootprint({ energyMeasurement: { kwh: 2, boundary: "IT_FULL", evidence: "MEASURED" }, region: "FR" });
    expect(result.physicalTotals.itEnergyKwh).toBe(2);
    expect(result.physicalTotals.facilityEnergyKwh).toBeNull();
    expect(result.pueApplied).toBe(false);
    expect(result.physicalTotals.operationalKgCo2e).toBeNull();
  });

  it("preserves declared evidence in the output and applies a verified custom factor to the model path", () => {
    const declared = estimatePersonalAiFootprint({
      energyMeasurement: { kwh: 2, boundary: "IT_FULL", evidence: "DECLARED" },
      region: "FR",
      pue: 1.15,
      electricityFactorId: "electricity-fr-rte-consumption-2025",
    });
    expect(declared.dataQuality).toBe("DECLARED");
    expect(declared.modalities.text.methodologyNote).toContain("déclarée");
    expect(declared.pueApplied).toBe(true);
    const model = estimatePersonalAiFootprint({
      modelId: "meta-llama/llama-3.1-8b-instruct",
      textUsage: { inputTokens: 80, outputTokens: 20 },
      region: "FR",
      electricityFactorId: "electricity-fr-rte-consumption-2025",
    });
    const historical = estimatePersonalAiFootprint({
      modelId: "meta-llama/llama-3.1-8b-instruct",
      textUsage: { inputTokens: 80, outputTokens: 20 },
      region: "FR",
    });
    expect(model.physicalTotals.operationalKgCo2e! / historical.physicalTotals.operationalKgCo2e!).toBeCloseTo(0.02 / 0.0217, 5);
  });

  it("calculates local wall energy and the idle-adjusted increment separately", () => {
    const result = estimatePersonalAiFootprint({
      executionEnvironment: "local_device",
      localPower: { watts: 100, idleWatts: 30, durationSeconds: 3600 },
      region: "FR",
      electricityFactorId: "electricity-fr-rte-consumption-2025",
    });
    expect(result.physicalTotals.localWallEnergyKwh).toBeCloseTo(0.1, 10);
    expect(result.physicalTotals.localIncrementalEnergyKwh).toBeCloseTo(0.07, 10);
    expect(result.physicalTotals.facilityEnergyKwh).toBeNull();
    expect(result.methodologyNotes.join(" ")).toContain("Énergie incrémentale locale");
  });

  it("rejects incompatible boundaries, mixed sources, invalid PUE, and local power on cloud", () => {
    expect(() => computeQualifiedEnergy({ environment: "local_device", pue: 1.15 })).toThrow(/PUE local/);
    expect(() => computeQualifiedEnergy({ environment: "cloud_api", measurement: { kwh: 2, boundary: "LOCAL_WALL", evidence: "MEASURED" } })).toThrow(/LOCAL_WALL/);
    expect(() => estimatePersonalAiFootprint({ measuredEnergyKwh: 1, energyMeasurement: { kwh: 1, boundary: "FACILITY", evidence: "MEASURED" } })).toThrow(/Une seule origine/);
    expect(() => estimatePersonalAiFootprint({ localPower: { watts: 20, durationSeconds: 60 } })).toThrow(/requiert local_device/);
    expect(() => estimatePersonalAiFootprint({ energyMeasurement: { kwh: 1, boundary: "FACILITY", evidence: "MEASURED" }, region: "US", electricityFactorId: "electricity-fr-rte-consumption-2025" })).toThrow(/ne correspond pas/);
  });

  it("keeps France 2024 as the default and exposes France 2025 only by opt-in", () => {
    expect(RTE_FRANCE_2025_CONSUMPTION.value).toBe(0.02);
    const historical = estimatePersonalAiFootprint({ textUsage: { totalTokens: 1_000_000 }, region: "FR", energyScenario: "central" });
    const updated = estimatePersonalAiFootprint({ textUsage: { totalTokens: 1_000_000 }, region: "FR", energyScenario: "central", electricityFactorId: "electricity-fr-rte-consumption-2025" });
    expect(historical.physicalTotals.operationalKgCo2e).toBeCloseTo(0.007486, 8);
    expect(updated.physicalTotals.operationalKgCo2e).toBeCloseTo(0.0069, 8);
  });

  it("does not calculate carbon for an unknown region, and reports partial water rather than zero", () => {
    const unknown = estimatePersonalAiFootprint({ textUsage: { totalTokens: 1_000_000 }, region: "UNKNOWN" });
    const directOnly = estimatePersonalAiFootprint({ textUsage: { totalTokens: 1_000_000 }, region: "FR", datacenterWue: 0.4 });
    expect(unknown.physicalTotals.operationalKgCo2e).toBeNull();
    expect(directOnly.physicalTotals.directWaterLiters).toBeGreaterThan(0);
    expect(directOnly.physicalTotals.totalWaterLiters).toBeNull();
  });
});
