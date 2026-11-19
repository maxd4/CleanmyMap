import { describe, expect, it } from "vitest";
import {
  computeEcologitsCompatibleImpacts,
  ECOLOGITS_CONSTANTS,
  ECOLOGITS_METADATA,
  evaluateEcologitsMethodology,
} from "./ecologits-adapter";
import { requireAiModel } from "./model-catalog";

describe("ecologits-adapter", () => {
  it("expose les métadonnées et l'évaluation scientifique vérifiable d'EcoLogits", () => {
    expect(ECOLOGITS_METADATA.packageName).toBe("@ecologits/ecologits.js");
    expect(ECOLOGITS_METADATA.version).toBe("3.0.0");
    expect(ECOLOGITS_METADATA.license).toBe("MPL-2.0");
    expect(ECOLOGITS_CONSTANTS.BATCH_SIZE).toBe(64);

    const evaluation = evaluateEcologitsMethodology();
    expect(evaluation.version).toContain("3.0.0");
    expect(evaluation.license).toBe("MPL-2.0");
    expect(evaluation.units.energy).toContain("kWh");
    expect(evaluation.units.gwp).toContain("kgCO₂e");
    expect(evaluation.units.wcfWater).toContain("L");
    expect(evaluation.strengths.length).toBeGreaterThan(0);
    expect(evaluation.limitationsForCleanMyMap.length).toBeGreaterThan(0);
    expect(evaluation.technicalCostAssessment).toBeTruthy();
  });

  it("calcule les impacts pour un modèle documenté selon les équations EcoLogits", () => {
    const llama70b = requireAiModel("meta-llama/llama-3.1-70b-instruct");
    const result = computeEcologitsCompatibleImpacts({
      model: llama70b,
      inputTokens: 10_000,
      outputTokens: 2_000,
      durationSeconds: 40,
      region: "US",
      pue: 1.15,
      datacenterWue: 0.5,
    });

    expect(result.itEnergyKwh).toBeGreaterThan(0);
    expect(result.facilityEnergyKwh).toBeGreaterThan(result.itEnergyKwh);
    expect(result.operationalGwpKgCo2e).not.toBeNull();
    expect(result.embodiedGwpKgCo2e).toBeGreaterThan(0);
    expect(result.totalGwpKgCo2e).toBe(
      Math.round(((result.operationalGwpKgCo2e ?? 0) + result.embodiedGwpKgCo2e) * 1_000_000) /
        1_000_000,
    );
    expect(result.directWaterLiters).toBeGreaterThan(0);
    expect(result.indirectWaterLiters).toBeGreaterThan(0);
    expect(result.totalWaterLiters).toBe(
      Math.round(((result.directWaterLiters ?? 0) + (result.indirectWaterLiters ?? 0)) * 1_000_000) /
        1_000_000,
    );
    expect(result.embodiedAdpeKgSbEq).toBeGreaterThan(0);
    expect(result.embodiedPeMj).toBeGreaterThan(0);
    expect(result.diagnostic).toBe("DOCUMENTED_MODEL");
  });

  it("gère l'absence de facteur électrique régional sans inventer de valeur (NA)", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");
    const result = computeEcologitsCompatibleImpacts({
      model: llama8b,
      outputTokens: 5_000,
      region: "UNKNOWN",
    });

    expect(result.itEnergyKwh).toBeGreaterThan(0);
    expect(result.facilityEnergyKwh).toBeGreaterThan(0);
    // Carbone et eau indirecte : strictement null
    expect(result.operationalGwpKgCo2e).toBeNull();
    expect(result.totalGwpKgCo2e).toBeNull();
    expect(result.indirectWaterLiters).toBeNull();
    expect(result.diagnostic).toBe("NOT_CALCULABLE");
    expect(
      result.warnings.some((w) => w.includes("Facteur carbone électrique non disponible")),
    ).toBe(true);
  });

  it("prend en compte la décote énergétique du prompt caching", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");

    const fullPrefill = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 100_000,
      cachedTokens: 0,
      outputTokens: 100,
      durationSeconds: 10,
    });

    const cachedPrefill = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 0,
      cachedTokens: 100_000,
      outputTokens: 100,
      durationSeconds: 10,
    });

    expect(cachedPrefill.itEnergyKwh).toBeLessThan(fullPrefill.itEnergyKwh);
  });

  it("préserve la précision sur une très petite requête (1 token) et ne classe pas un zéro déclaré en MEASURED", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");

    const tiny = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 0,
      outputTokens: 1,
      region: "US",
    });
    expect(tiny.itEnergyKwh).toBeGreaterThan(0);
    expect(tiny.facilityEnergyKwh).toBeGreaterThan(0);

    const declaredZero = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 0,
      outputTokens: 0,
      region: "US",
    });
    expect(declaredZero.diagnostic).toBe("DOCUMENTED_MODEL");
    expect(declaredZero.diagnostic).not.toBe("MEASURED");
  });

  it("exclut les impacts incorporés cloud lors d'une exécution locale", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");

    const localResult = computeEcologitsCompatibleImpacts({
      model: llama8b,
      outputTokens: 5_000,
      executionEnvironment: "local_device",
      region: "FR",
    });

    expect(localResult.embodiedGwpKgCo2e).toBe(0);
    expect(localResult.embodiedAdpeKgSbEq).toBe(0);
    expect(localResult.embodiedPeMj).toBe(0);
    expect(
      localResult.notes.some((n) => n.includes("Exécution locale sur matériel personnel")),
    ).toBe(true);
  });
});
