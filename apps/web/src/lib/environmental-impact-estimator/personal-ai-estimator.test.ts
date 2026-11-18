import { describe, expect, it } from "vitest";
import { estimatePersonalAiFootprint } from "./personal-ai-estimator";

describe("personal-ai-estimator", () => {
  it("calcule l'empreinte texte selon le scénario central et la région US", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: {
        totalTokens: 10_000_000, // 10 millions de tokens
      },
      energyScenario: "central",
      region: "US",
      pue: 1.15,
    });

    expect(result.accountingScope).toBe("PERSONAL_AI_USAGE");
    expect(result.scenario).toBe("central");
    expect(result.region).toBe("US");
    expect(result.pue).toBe(1.15);

    // IT energy : (10M / 1M) * 0.30 = 3.0 kWh
    expect(result.physicalTotals.itEnergyKwh).toBe(3);
    // Facility energy : 3.0 * 1.15 = 3.45 kWh
    expect(result.physicalTotals.facilityEnergyKwh).toBe(3.45);
    // Operational CO2e : 3.45 * 0.35 = 1.2075 kgCO2e
    expect(result.physicalTotals.operationalKgCo2e).toBe(1.2075);
    // Indirect water (mix US LBNL 4.52 L/kWh) : 3.45 * 4.52 = 15.594 L
    expect(result.physicalTotals.indirectWaterLiters).toBe(15.594);
    // Partial LCA (+30%) : 1.2075 * 1.30 = 1.56975 kgCO2e
    expect(result.physicalTotals.partialLcaKgCo2e).toBe(1.56975);

    expect(result.dataQuality).toBe("PROXY_SCENARIO");
    expect(result.antiDoubleCountingCompliance.compliant).toBe(true);
  });

  it("gère les scénarios de sensibilité bas et haut", () => {
    const lowResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 10_000_000 },
      energyScenario: "low",
      region: "US",
      pue: 1.0,
    });
    // Low : 10 * 0.06 = 0.6 kWh
    expect(lowResult.physicalTotals.itEnergyKwh).toBe(0.6);
    expect(lowResult.physicalTotals.facilityEnergyKwh).toBe(0.6);

    const highResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 10_000_000 },
      energyScenario: "high",
      region: "US",
      pue: 1.0,
    });
    // High : 10 * 0.60 = 6.0 kWh
    expect(highResult.physicalTotals.itEnergyKwh).toBe(6.0);
    expect(highResult.physicalTotals.facilityEnergyKwh).toBe(6.0);
  });

  it("respecte le facteur décarboné français et n'applique pas l'eau US en France", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 10_000_000 },
      energyScenario: "central",
      region: "FR",
      pue: 1.15,
    });

    // Facility energy : 3.45 kWh
    expect(result.physicalTotals.facilityEnergyKwh).toBe(3.45);
    // Carbone français RTE : 3.45 * 0.0217 = 0.074865 kgCO2e
    expect(result.physicalTotals.operationalKgCo2e).toBe(0.074865);
    // Eau indirecte : null car facteur LBNL non exportable arbitrairement
    expect(result.physicalTotals.indirectWaterLiters).toBeNull();
    expect(
      result.methodologyNotes.some((note) =>
        note.includes("Eau indirecte non calculée pour la région FR"),
      ),
    ).toBe(true);
  });

  it("ne propage aucun coefficient américain si la région est UNKNOWN", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 5_000_000 },
      energyScenario: "central",
      region: "UNKNOWN",
    });

    // Énergie physique calculable via le scénario
    expect(result.physicalTotals.itEnergyKwh).toBe(1.5);
    expect(result.physicalTotals.facilityEnergyKwh).toBe(1.725);
    // Carbone et eau : strictement null
    expect(result.physicalTotals.operationalKgCo2e).toBeNull();
    expect(result.physicalTotals.indirectWaterLiters).toBeNull();
    expect(result.physicalTotals.partialLcaKgCo2e).toBeNull();
    expect(
      result.methodologyNotes.some((note) =>
        note.includes("Infrastructure électrique inconnue"),
      ),
    ).toBe(true);
  });

  it("traite rigoureusement les modalités multimodales sans méthode sourcée", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 1_000_000 },
      imageUsage: { imageCount: 25 },
      audioUsage: { durationMinutes: 60 },
      videoUsage: { durationSeconds: 120 },
      region: "US",
    });

    // Modalité texte : physique calculé
    expect(result.modalities.text.hasSourcedPhysicalMethod).toBe(true);
    expect(result.modalities.text.activityCount).toBe(1_000_000);
    expect(result.modalities.text.energyKwh).not.toBeNull();

    // Modalité image : activité enregistrée, physique null, qualité NOT_CALCULABLE
    expect(result.modalities.image.hasSourcedPhysicalMethod).toBe(false);
    expect(result.modalities.image.activityCount).toBe(25);
    expect(result.modalities.image.activityUnit).toBe("images");
    expect(result.modalities.image.energyKwh).toBeNull();
    expect(result.modalities.image.operationalKgCo2e).toBeNull();
    expect(result.modalities.image.qualityDiagnostic).toBe("NOT_CALCULABLE");

    // Modalité audio : activité enregistrée, physique null, qualité NOT_CALCULABLE
    expect(result.modalities.audio.hasSourcedPhysicalMethod).toBe(false);
    expect(result.modalities.audio.activityCount).toBe(60);
    expect(result.modalities.audio.energyKwh).toBeNull();
    expect(result.modalities.audio.qualityDiagnostic).toBe("NOT_CALCULABLE");

    // Modalité vidéo : activité enregistrée, physique null, qualité NOT_CALCULABLE
    expect(result.modalities.video.hasSourcedPhysicalMethod).toBe(false);
    expect(result.modalities.video.activityCount).toBe(120);
    expect(result.modalities.video.energyKwh).toBeNull();
    expect(result.modalities.video.qualityDiagnostic).toBe("NOT_CALCULABLE");
  });

  it("gère l'absence d'activité et l'activité zéro", () => {
    const zeroResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 0 },
    });
    expect(zeroResult.physicalTotals.itEnergyKwh).toBe(0);
    expect(zeroResult.physicalTotals.operationalKgCo2e).toBe(0);
    expect(zeroResult.dataQuality).toBe("MEASURED");

    const emptyResult = estimatePersonalAiFootprint({});
    expect(emptyResult.physicalTotals.itEnergyKwh).toBeNull();
    expect(emptyResult.physicalTotals.operationalKgCo2e).toBeNull();
    expect(emptyResult.dataQuality).toBe("NOT_CALCULABLE");
  });

  it("somme correctement les inputTokens et outputTokens si totalTokens est omis", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: {
        inputTokens: 2_000_000,
        outputTokens: 1_000_000,
      },
      energyScenario: "central",
      pue: 1.0,
    });

    expect(result.modalities.text.activityCount).toBe(3_000_000);
    expect(result.physicalTotals.itEnergyKwh).toBe(0.9);
  });
});
