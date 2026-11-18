import { describe, expect, it } from "vitest";
import {
  ANTI_DOUBLE_COUNTING_RULES,
  assertNoGenericAiCallsToTokensConversion,
  evaluateDataQualityDiagnostic,
  getScientificFactor,
  listScientificFactors,
  resolveElectricityFactorForRegion,
  SCIENTIFIC_FACTOR_REGISTRY,
  type ScientificFactorRecord,
} from "./scientific-registry";

describe("scientific-registry", () => {
  it("contient des facteurs uniques et valides dans le registre canonique", () => {
    expect(SCIENTIFIC_FACTOR_REGISTRY.length).toBeGreaterThanOrEqual(10);

    const ids = new Set<string>();
    for (const factor of SCIENTIFIC_FACTOR_REGISTRY) {
      expect(ids.has(factor.id)).toBe(false);
      ids.add(factor.id);

      expect(factor.id).toBeTruthy();
      expect(factor.version).toBeTruthy();
      expect(factor.label).toBeTruthy();
      expect(factor.source).toBeTruthy();
      expect(factor.sourceUrls.length).toBeGreaterThan(0);
      expect(factor.date).toBeTruthy();
      expect(["US", "FR", "GLOBAL", "UNKNOWN"]).toContain(factor.region);
      expect(factor.unit).toBeTruthy();
      expect(factor.hypotheses.length).toBeGreaterThan(0);
      expect(["OBSERVED", "DERIVED", "DECLARED", "ASSUMPTION", "PROXY", "NA"]).toContain(
        factor.proofStatus,
      );
    }
  });

  it("garantit l'exactitude des valeurs de référence historiques et méthodologiques", () => {
    const usElec = getScientificFactor("electricity-us-egrid-2024");
    expect(usElec.value).toBe(0.35);
    expect(usElec.unit).toBe("kgCO2e/kWh");
    expect(usElec.region).toBe("US");
    expect(usElec.proofStatus).toBe("PROXY");

    const frElec = getScientificFactor("electricity-fr-rte-2024");
    expect(frElec.value).toBe(0.0217);
    expect(frElec.unit).toBe("kgCO2e/kWh");
    expect(frElec.region).toBe("FR");
    expect(frElec.proofStatus).toBe("OBSERVED");

    const usWater = getScientificFactor("water-indirect-datacenter-us-2024");
    expect(usWater.value).toBe(4.52);
    expect(usWater.unit).toBe("L/kWh");
    expect(usWater.region).toBe("US");
    expect(usWater.proofStatus).toBe("PROXY");

    const scenarioLow = getScientificFactor("ai-inference-energy-scenario-low-v1");
    expect(scenarioLow.value).toBe(0.06);
    expect(scenarioLow.unit).toBe("kWh/million_tokens");

    const scenarioCentral = getScientificFactor("ai-inference-energy-scenario-central-v1");
    expect(scenarioCentral.value).toBe(0.30);
    expect(scenarioCentral.unit).toBe("kWh/million_tokens");

    const scenarioHigh = getScientificFactor("ai-inference-energy-scenario-high-v1");
    expect(scenarioHigh.value).toBe(0.60);
    expect(scenarioHigh.unit).toBe("kWh/million_tokens");

    const partialLca = getScientificFactor("ai-partial-lca-overhead-v1");
    expect(partialLca.value).toBe(0.30);
    expect(partialLca.unit).toBe("fraction");

    const carEq = getScientificFactor("digital-car-equivalent-ademe-v1");
    expect(carEq.value).toBe(14.2);
    expect(carEq.unit).toBe("kgCO2e/100km");
  });

  it("gère les modalités sans méthode sourcée avec valeur null et statut NA", () => {
    const imageFactor = getScientificFactor("multimodal-image-unmeasured-v1");
    expect(imageFactor.value).toBeNull();
    expect(imageFactor.proofStatus).toBe("NA");

    const audioFactor = getScientificFactor("multimodal-audio-unmeasured-v1");
    expect(audioFactor.value).toBeNull();
    expect(audioFactor.proofStatus).toBe("NA");

    const videoFactor = getScientificFactor("multimodal-video-unmeasured-v1");
    expect(videoFactor.value).toBeNull();
    expect(videoFactor.proofStatus).toBe("NA");
  });

  it("lève une erreur claire lors de la recherche d'un facteur inconnu", () => {
    expect(() => getScientificFactor("facteur-inexistant")).toThrow(
      /Facteur scientifique introuvable dans le registre canonique/,
    );
  });

  it("filtre les facteurs par région ou périmètre via listScientificFactors", () => {
    const usFactors = listScientificFactors({ region: "US" });
    expect(usFactors.every((f: ScientificFactorRecord) => f.region === "US")).toBe(true);
    expect(usFactors.length).toBeGreaterThanOrEqual(2);

    const inferenceFactors = listScientificFactors({ scope: "ai_inference_energy" });
    expect(inferenceFactors.length).toBe(3);
    expect(inferenceFactors.map((f: ScientificFactorRecord) => f.id)).toEqual([
      "ai-inference-energy-scenario-low-v1",
      "ai-inference-energy-scenario-central-v1",
      "ai-inference-energy-scenario-high-v1",
    ]);
  });

  it("bloque strictement la conversion du proxy aiCalls en facteur par token", () => {
    expect(() =>
      assertNoGenericAiCallsToTokensConversion({
        metricKey: "aiCalls",
        targetUnit: "tokens",
      }),
    ).toThrow(/VIOLATION DU CONTRAT SCIENTIFIQUE/);

    expect(() =>
      assertNoGenericAiCallsToTokensConversion({
        metricKey: "service_aiCalls_count",
        targetUnit: "token_equivalent",
      }),
    ).toThrow(/VIOLATION DU CONTRAT SCIENTIFIQUE/);

    // Ne lève aucune exception pour des usages légitimes
    expect(() =>
      assertNoGenericAiCallsToTokensConversion({
        metricKey: "aiCalls",
        targetUnit: "detections",
      }),
    ).not.toThrow();

    expect(() =>
      assertNoGenericAiCallsToTokensConversion({
        metricKey: "textTokens",
        targetUnit: "tokens",
      }),
    ).not.toThrow();
  });

  it("ne propage jamais automatiquement les coefficients américains à une infrastructure inconnue", () => {
    expect(resolveElectricityFactorForRegion("UNKNOWN")).toBeNull();
    expect(resolveElectricityFactorForRegion(null)).toBeNull();
    expect(resolveElectricityFactorForRegion(undefined)).toBeNull();
    expect(resolveElectricityFactorForRegion("GERMANY")).toBeNull();

    const usResolved = resolveElectricityFactorForRegion("US");
    expect(usResolved).not.toBeNull();
    expect(usResolved?.id).toBe("electricity-us-egrid-2024");
    expect(usResolved?.value).toBe(0.35);

    const frResolved = resolveElectricityFactorForRegion("FR");
    expect(frResolved).not.toBeNull();
    expect(frResolved?.id).toBe("electricity-fr-rte-2024");
    expect(frResolved?.value).toBe(0.0217);
  });

  it("évalue un diagnostic de qualité des données déterministe sans score numérique arbitraire", () => {
    expect(
      evaluateDataQualityDiagnostic({ isMissingOrUnmeasured: true }),
    ).toBe("NOT_CALCULABLE");

    expect(
      evaluateDataQualityDiagnostic({ hasDirectMeasurement: true }),
    ).toBe("MEASURED");

    expect(
      evaluateDataQualityDiagnostic({ hasDocumentedModel: true }),
    ).toBe("DOCUMENTED_MODEL");

    expect(
      evaluateDataQualityDiagnostic({ isScenarioOrRegionalProxy: true }),
    ).toBe("PROXY_SCENARIO");

    expect(
      evaluateDataQualityDiagnostic({}),
    ).toBe("NOT_CALCULABLE");
  });

  it("expose les règles anti-double-comptage canoniques", () => {
    expect(ANTI_DOUBLE_COUNTING_RULES.length).toBe(6);
    const ruleIds = ANTI_DOUBLE_COUNTING_RULES.map((r) => r.id);
    expect(ruleIds).toContain("NO_IT_FACILITY_DOUBLE_COUNT");
    expect(ruleIds).toContain("NO_WATER_DOUBLE_COUNT");
    expect(ruleIds).toContain("NO_ACV_EMBODIED_DOUBLE_COUNT");
    expect(ruleIds).toContain("NO_CROSS_SCOPE_DOUBLE_COUNT");
    expect(ruleIds).toContain("NO_TOKEN_TIME_DOUBLE_COUNT");
    expect(ruleIds).toContain("NO_REVERSE_CO2_TO_KWH");
  });
});
