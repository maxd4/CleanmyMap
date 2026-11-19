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

    // Couverture partielle signalée explicitement
    expect(result.modalityCoverage.status).toBe("PARTIAL_MULTIMODAL");
    expect(result.modalityCoverage.coversAllDeclaredActivity).toBe(false);
    expect(result.modalityCoverage.calculableModalities).toEqual(["text"]);
    expect(result.modalityCoverage.nonCalculableDeclaredModalities).toEqual([
      "image",
      "audio",
      "video",
    ]);
    expect(result.dataQuality).toBe("NOT_CALCULABLE");
    expect(result.modalities.text.qualityDiagnostic).toBe("PROXY_SCENARIO");
    expect(
      result.methodologyNotes.some((n) => n.includes("Couverture partielle")),
    ).toBe(true);
  });

  it("gère l'absence d'activité et l'activité zéro sans classer un zéro déclaré comme MEASURED", () => {
    const zeroUnknownResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 0 },
    });
    expect(zeroUnknownResult.physicalTotals.itEnergyKwh).toBe(0);
    expect(zeroUnknownResult.physicalTotals.operationalKgCo2e).toBeNull();
    expect(zeroUnknownResult.dataQuality).toBe("NOT_CALCULABLE");

    const zeroUsResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 0 },
      region: "US",
    });
    expect(zeroUsResult.physicalTotals.itEnergyKwh).toBe(0);
    expect(zeroUsResult.physicalTotals.operationalKgCo2e).toBe(0);
    expect(zeroUsResult.dataQuality).toBe("PROXY_SCENARIO");
    expect(zeroUsResult.dataQuality).not.toBe("MEASURED");

    const measuredZeroResult = estimatePersonalAiFootprint({
      measuredEnergyKwh: 0,
      region: "US",
    });
    expect(measuredZeroResult.dataQuality).toBe("MEASURED");

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

  it("calcule les impacts pour un modèle documenté du catalogue via les paramètres EcoLogits", () => {
    const result = estimatePersonalAiFootprint({
      modelId: "meta-llama/llama-3.1-70b-instruct",
      hosterOperator: "aws_bedrock",
      textUsage: {
        inputTokens: 50_000,
        outputTokens: 10_000,
        cachedTokens: 20_000,
      },
      region: "US",
      pue: 1.15,
      datacenterWue: 0.8,
    });

    expect(result.modelDetails).toBeDefined();
    expect(result.modelDetails?.id).toBe("meta-llama/llama-3.1-70b-instruct");
    expect(result.modelDetails?.publisher).toBe("Meta");
    expect(result.modelDetails?.hoster).toBe("AWS Bedrock");
    expect(result.modelDetails?.activeParametersBillion).toBe(70);

    expect(result.physicalTotals.itEnergyKwh).toBeGreaterThan(0);
    expect(result.physicalTotals.facilityEnergyKwh).toBeGreaterThan(0);
    expect(result.physicalTotals.operationalKgCo2e).toBeGreaterThan(0);
    expect(result.physicalTotals.embodiedKgCo2e).toBeGreaterThan(0);
    expect(result.physicalTotals.directWaterLiters).toBeGreaterThan(0);
    expect(result.physicalTotals.indirectWaterLiters).toBeGreaterThan(0);
    expect(result.physicalTotals.totalWaterLiters).toBeGreaterThan(0);
    expect(result.dataQuality).toBe("DOCUMENTED_MODEL");
  });

  it("gère les modèles de raisonnement sans multiplicateur artificiel de réflexion", () => {
    const result = estimatePersonalAiFootprint({
      modelId: "deepseek-ai/deepseek-r1",
      textUsage: {
        inputTokens: 1_000,
        outputTokens: 5_000, // contient 3 500 tokens de réflexion
        reasoningTokensIncluded: 3_500,
      },
      region: "US",
    });

    expect(result.modelDetails?.isReasoningModel).toBe(true);
    expect(
      result.methodologyNotes.some((n) =>
        n.includes("tokens de raisonnement inclus dans le volume de génération"),
      ),
    ).toBe(true);
    // Vérification que reasoningTokens n'a pas été ajouté en surplus (anti-double-comptage)
    expect(result.modalities.text.activityCount).toBe(6_000);
  });

  it("utilise prioritairement une mesure électrique directe aux bornes", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 1_000_000 },
      measuredEnergyKwh: 4.5, // 4.5 kWh mesurés
      region: "US",
      pue: 1.15,
    });

    expect(result.physicalTotals.itEnergyKwh).toBe(4.5);
    expect(result.physicalTotals.facilityEnergyKwh).toBe(round6(4.5 * 1.15));
    expect(result.dataQuality).toBe("MEASURED");
    expect(
      result.modalities.text.methodologyNote.includes("Consommation électrique directe mesurée"),
    ).toBe(true);
  });

  it("distingue strictement le calcul physique location-based de la déclaration market-based", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 10_000_000 },
      region: "US", // 0.35 kgCO2e/kWh location-based
      marketBasedDeclaration: {
        claimedKgCo2ePerKwh: 0.05, // déclaration contractuelle opérateur (PPA éolien/solaire)
        providerCertificateNote: "Certificat de garantie d'origine 100% renouvelable",
      },
    });

    // La valeur physique reste le mix réel du réseau américain
    expect(result.physicalTotals.operationalKgCo2e).toBe(1.2075);
    // La déclaration contractuelle est exposée séparément
    expect(result.marketBasedDisclosure).toBeDefined();
    expect(result.marketBasedDisclosure?.isReported).toBe(true);
    expect(result.marketBasedDisclosure?.claimedKgCo2e).toBe(round6(3.45 * 0.05));
    expect(result.marketBasedDisclosure?.note).toContain("Certificat de garantie d'origine");
  });

  it("adapte le calcul pour une exécution locale sur machine personnelle", () => {
    const result = estimatePersonalAiFootprint({
      modelId: "meta-llama/llama-3.1-8b-instruct",
      executionEnvironment: "local_device",
      textUsage: { outputTokens: 10_000 },
      region: "FR",
    });

    expect(result.executionEnvironment).toBe("local_device");
    expect(result.pue).toBe(1.0); // aucun surcoût de refroidissement data center
    expect(result.physicalTotals.embodiedKgCo2e).toBe(0); // pas d'amortissement serveur cloud
  });

  it("rejette les entrées invalides, non finies, négatives, non entières ou contradictoires", () => {
    expect(() =>
      estimatePersonalAiFootprint({ textUsage: { totalTokens: 100 }, pue: Infinity }),
    ).toThrow(/pue/);
    expect(() =>
      estimatePersonalAiFootprint({ textUsage: { totalTokens: 100 }, pue: 0.9 }),
    ).toThrow(/pue/);
    expect(() =>
      estimatePersonalAiFootprint({ textUsage: { totalTokens: 100 }, pue: 6.0 }),
    ).toThrow(/pue/);
    expect(() =>
      estimatePersonalAiFootprint({ imageUsage: { imageCount: -1 } }),
    ).toThrow(/imageCount/);
    expect(() =>
      estimatePersonalAiFootprint({ imageUsage: { imageCount: 2.5 } }),
    ).toThrow(/imageCount/);
    expect(() =>
      estimatePersonalAiFootprint({ textUsage: { totalTokens: 10.5 } }),
    ).toThrow(/totalTokens/);
    expect(() =>
      estimatePersonalAiFootprint({ audioUsage: { durationMinutes: -5 } }),
    ).toThrow(/durationMinutes/);
    expect(() =>
      estimatePersonalAiFootprint({
        textUsage: { totalTokens: 100, inputTokens: 80, outputTokens: 50 },
      }),
    ).toThrow(/totalTokens/);
    expect(() =>
      estimatePersonalAiFootprint({
        textUsage: { inputTokens: 100, cachedTokens: 120 },
      }),
    ).toThrow(/cachedTokens/);
    expect(() =>
      estimatePersonalAiFootprint({
        textUsage: { outputTokens: 100, reasoningTokensIncluded: 120 },
      }),
    ).toThrow(/reasoningTokensIncluded/);
  });

  it("préserve la précision interne pour de très faibles volumes de tokens non nuls", () => {
    const result = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 1 },
      energyScenario: "central",
      region: "US",
      pue: 1.15,
    });

    expect(result.physicalTotals.itEnergyKwh).toBeGreaterThan(0);
    expect(result.physicalTotals.facilityEnergyKwh).toBeGreaterThan(0);
    expect(result.physicalTotals.operationalKgCo2e).toBeGreaterThan(0);
    expect(result.physicalTotals.indirectWaterLiters).toBeGreaterThan(0);
  });

  it("évalue honnêtement les règles anti-double-comptage et leurs limites externes", () => {
    const frResult = estimatePersonalAiFootprint({
      textUsage: { totalTokens: 1_000_000 },
      region: "FR",
    });
    expect(frResult.antiDoubleCountingCompliance.verifiedRules).toContain(
      "NO_IT_FACILITY_DOUBLE_COUNT",
    );
    expect(frResult.antiDoubleCountingCompliance.notApplicableRules).toContain(
      "NO_WATER_DOUBLE_COUNT",
    );
    expect(frResult.antiDoubleCountingCompliance.unverifiableLimits).toContain(
      "NO_CROSS_SCOPE_DOUBLE_COUNT",
    );
    expect(frResult.antiDoubleCountingCompliance.verifiedRules).not.toContain(
      "NO_CROSS_SCOPE_DOUBLE_COUNT",
    );

    const usWithWue = estimatePersonalAiFootprint({
      modelId: "meta-llama/llama-3.1-8b-instruct",
      textUsage: { inputTokens: 10_000, outputTokens: 5_000 },
      region: "US",
      datacenterWue: 0.5,
    });
    expect(usWithWue.antiDoubleCountingCompliance.unverifiableLimits).toContain(
      "NO_WATER_DOUBLE_COUNT",
    );
  });
});

function round6(val: number): number {
  return Math.round(val * 1_000_000) / 1_000_000;
}
