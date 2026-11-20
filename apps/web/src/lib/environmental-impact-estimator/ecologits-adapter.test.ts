import { describe, expect, it } from "vitest";
import {
  computeEcologitsCompatibleImpacts,
  computeOfficialEcologitsLlmImpacts,
  ECOLOGITS_CONSTANTS,
  ECOLOGITS_METADATA,
  evaluateEcologitsMethodology,
} from "./ecologits-adapter";
import { requireAiModel } from "./model-catalog";

describe("ecologits-adapter", () => {
  it("expose les constantes officielles exactes d'EcoLogits.js v3.0.0", () => {
    expect(ECOLOGITS_METADATA.packageName).toBe("@ecologits/ecologits.js");
    expect(ECOLOGITS_METADATA.version).toBe("3.0.0");
    expect(ECOLOGITS_METADATA.license).toBe("MPL-2.0");

    expect(ECOLOGITS_CONSTANTS.GPU_ENERGY_ALPHA).toBe(1.1665273170451914e-6);
    expect(ECOLOGITS_CONSTANTS.GPU_ENERGY_BETA).toBe(-0.011205921025579175);
    expect(ECOLOGITS_CONSTANTS.GPU_ENERGY_GAMMA).toBe(4.052928146734005e-5);
    expect(ECOLOGITS_CONSTANTS.LATENCY_ALPHA).toBe(0.0006785088094353663);
    expect(ECOLOGITS_CONSTANTS.LATENCY_BETA).toBe(0.0003119310311688259);
    expect(ECOLOGITS_CONSTANTS.LATENCY_GAMMA).toBe(0.019473717579473387);
    expect(ECOLOGITS_CONSTANTS.GPU_MEMORY_GB).toBe(80);
    expect(ECOLOGITS_CONSTANTS.SERVER_GPUS).toBe(8);
    expect(ECOLOGITS_CONSTANTS.SERVER_POWER_KW).toBe(1.2);
    expect(ECOLOGITS_CONSTANTS.BATCH_SIZE).toBe(64);
    expect(ECOLOGITS_CONSTANTS.HARDWARE_LIFESPAN_SECONDS).toBe(94_608_000);

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

  it("démontre la parité numérique exacte avec les vecteurs officiels EcoLogits.js v3.0.0 (dense, MoE, N_GPU = 1, 4, 8, 32 et sans latence)", () => {
    const officialVectors = [
      {
        name: "cohere/c4ai-aya-expanse-32b (dense, N_GPU=1, latency regression)",
        expectedGpuCount: 1,
        inputs: {
          modelActiveParameterCount: 32.3,
          modelTotalParameterCount: 32.3,
          outputTokenCount: 200,
          requestLatency: 5,
          ifElectricityMixAdpe: 9.855e-8,
          ifElectricityMixPe: 9.6884,
          ifElectricityMixGwp: 0.3844,
          ifElectricityMixWue: 3.1321,
          datacenterPue: 1.09,
          datacenterWue: 0.999,
        },
        expected: {
          energy: 0.00001639303138765219,
          gwp: 0.000007115283348746835,
          usageGwp: 0.000006301481265413502,
          embodiedGwp: 8.138020833333334e-7,
          wcf: 0.0000663690524682237,
          adpe: 4.719835921991472e-11,
          pe: 0.00016912049570835678,
          embodiedAdpe: 4.55828259766616e-11,
          embodiedPe: 0.000010298250412227296,
        },
      },
      {
        name: "cohere/command-a-03-2025 (dense 111B, N_GPU=4, tps+ttft)",
        expectedGpuCount: 4,
        inputs: {
          modelActiveParameterCount: 111,
          modelTotalParameterCount: 111,
          outputTokenCount: 200,
          requestLatency: 5,
          ifElectricityMixAdpe: 9.855e-8,
          ifElectricityMixPe: 9.6884,
          ifElectricityMixGwp: 0.3844,
          ifElectricityMixWue: 3.1321,
          datacenterPue: 1.09,
          datacenterWue: 0.999,
          tps: 63,
          ttft: 0.95,
        },
        expected: {
          energy: 0.00010216410036670692,
          gwp: 0.000041957168706094415,
          usageGwp: 0.00003927188018096214,
          embodiedGwp: 0.000002685288525132275,
          wcf: 0.0004136229826726363,
          adpe: 1.6047712707571693e-10,
          pe: 0.0010237876270673084,
          embodiedAdpe: 1.5040885498457796e-10,
          embodiedPe: 0.000033980957074504924,
        },
      },
      {
        name: "cohere/command-a-plus-05-2026 (MoE 25B/218B, N_GPU=8, tps+ttft)",
        expectedGpuCount: 8,
        inputs: {
          modelActiveParameterCount: 25,
          modelTotalParameterCount: 218,
          outputTokenCount: 200,
          requestLatency: 5,
          ifElectricityMixAdpe: 9.855e-8,
          ifElectricityMixPe: 9.6884,
          ifElectricityMixGwp: 0.3844,
          ifElectricityMixWue: 3.1321,
          datacenterPue: 1.09,
          datacenterWue: 0.999,
          tps: 139.5,
          ttft: 0.23,
        },
        expected: {
          energy: 0.0001049544290967799,
          gwp: 0.00004251074785244855,
          usageGwp: 0.0000403444825448022,
          embodiedGwp: 0.000002166265307646356,
          wcf: 0.000424919945968229,
          adpe: 1.3168049387544184e-10,
          pe: 0.0010442534737650046,
          embodiedAdpe: 1.2133723488795418e-10,
          embodiedPe: 0.000027412982903762258,
        },
      },
      {
        name: "mistralai/glm-5-2 (MoE 40B/744B, N_GPU=32, tps+ttft)",
        expectedGpuCount: 32,
        inputs: {
          modelActiveParameterCount: 40,
          modelTotalParameterCount: 744,
          outputTokenCount: 200,
          requestLatency: 5,
          ifElectricityMixAdpe: 7.771e-8,
          ifElectricityMixPe: 4.73,
          ifElectricityMixGwp: 0.03526,
          ifElectricityMixWue: 6.0315,
          datacenterPue: 1.16,
          datacenterWue: 0.09,
          tps: 57.5,
          ttft: 0.64,
        },
        expected: {
          energy: 0.0005695071712000123,
          gwp: 0.00004153009821883128,
          usageGwp: 0.000020080822856512435,
          embodiedGwp: 0.00002144927536231884,
          wcf: 0.0034791684043066684,
          adpe: 1.2456770009548256e-9,
          pe: 0.002965198562641079,
          embodiedAdpe: 1.2014205986808727e-9,
          embodiedPe: 0.00027142964286502104,
        },
      },
      {
        name: "no-request-latency (dense 7.3B, N_GPU=1, requestLatency=null)",
        expectedGpuCount: 1,
        inputs: {
          modelActiveParameterCount: 7.3,
          modelTotalParameterCount: 7.3,
          outputTokenCount: 200,
          requestLatency: null,
          ifElectricityMixAdpe: 7.37708e-8,
          ifElectricityMixPe: 9.988,
          ifElectricityMixGwp: 0.590478,
          ifElectricityMixWue: 5.04,
          datacenterPue: 1.2,
          datacenterWue: 0.569,
        },
        expected: {
          energy: 0.00001766064347655742,
          gwp: 0.000011873222020884668,
          usageGwp: 0.00001042822143875067,
          embodiedGwp: 0.0000014450005821339982,
          wcf: 0.00009738373157031703,
          adpe: 8.224046753374865e-11,
          pe: 0.00019468025261442178,
          embodiedAdpe: 8.093762773596823e-11,
          embodiedPe: 0.000018285745570566303,
        },
      },
    ];

    for (const vec of officialVectors) {
      const actual = computeOfficialEcologitsLlmImpacts(vec.inputs);
      expect(actual.gpuRequiredCount).toBe(vec.expectedGpuCount);
      expect(actual.requestEnergyKwh).toBe(vec.expected.energy);
      expect(actual.totalGwpKgCo2e).toBe(vec.expected.gwp);
      expect(actual.usageGwpKgCo2e).toBe(vec.expected.usageGwp);
      expect(actual.embodiedGwpKgCo2e).toBe(vec.expected.embodiedGwp);
      expect(actual.totalWcfLiters).toBe(vec.expected.wcf);
      expect(actual.totalAdpeKgSbEq).toBe(vec.expected.adpe);
      expect(actual.totalPeMj).toBe(vec.expected.pe);
      expect(actual.embodiedAdpeKgSbEq).toBe(vec.expected.embodiedAdpe);
      expect(actual.embodiedPeMj).toBe(vec.expected.embodiedPe);
    }
  });

  it("rejette les vecteurs d'erreur officiels EcoLogits (tps=0, paramètres nuls ou négatifs)", () => {
    const base = {
      modelActiveParameterCount: 7.3,
      modelTotalParameterCount: 7.3,
      outputTokenCount: 200,
      requestLatency: 5,
      ifElectricityMixAdpe: 7.37708e-8,
      ifElectricityMixPe: 9.988,
      ifElectricityMixGwp: 0.590478,
      ifElectricityMixWue: 5.04,
      datacenterPue: 1.2,
      datacenterWue: 0.569,
    };

    expect(() => computeOfficialEcologitsLlmImpacts({ ...base, tps: 0 })).toThrow(/tps/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({
        ...base,
        modelActiveParameterCount: 0,
        modelTotalParameterCount: 0,
      }),
    ).toThrow(/positive, finite/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({
        ...base,
        modelTotalParameterCount: -100,
      }),
    ).toThrow(/positive, finite/);
  });

  it("vérifie l'effet du batchSize, de la quantification, de la mémoire GPU, de la latence et de requestCount", () => {
    const base = {
      modelActiveParameterCount: 70,
      modelTotalParameterCount: 70,
      outputTokenCount: 500,
      datacenterPue: 1.15,
      datacenterWue: 0.5,
      ifElectricityMixGwp: 0.35,
      ifElectricityMixWue: 4.52,
    };

    // 70B en 16 bits -> 1.2 * 70 * 16 / 8 = 168 Go -> ceil(168/80) = 3 -> arrondi puissance de 2 = 4 GPU
    const fp16 = computeOfficialEcologitsLlmImpacts(base);
    expect(fp16.gpuRequiredCount).toBe(4);

    // 70B en 8 bits -> 84 Go -> ceil(84/80) = 2 -> 2 GPU
    const int8 = computeOfficialEcologitsLlmImpacts({
      ...base,
      modelQuantizationBits: 8,
    });
    expect(int8.gpuRequiredCount).toBe(2);
    expect(int8.requestItEnergyKwh).toBeLessThan(fp16.requestItEnergyKwh);

    // Variation du batchSize : un batch plus grand réduit la part d'énergie par token (beta < 0) et amortit le serveur
    const batch1 = computeOfficialEcologitsLlmImpacts({ ...base, batchSize: 1 });
    const batch64 = computeOfficialEcologitsLlmImpacts({ ...base, batchSize: 64 });
    expect(batch64.requestItEnergyKwh).toBeLessThan(batch1.requestItEnergyKwh);

    // Latence mesurée inférieure à la latence GPU théorique : plafonne generationLatencySeconds
    const cappedLatency = computeOfficialEcologitsLlmImpacts({
      ...base,
      requestLatency: 1.5,
    });
    expect(cappedLatency.generationLatencySeconds).toBe(1.5);
    expect(cappedLatency.embodiedGwpKgCo2e).toBeLessThan(fp16.embodiedGwpKgCo2e);

    // Multi-requêtes avec ttft : requestCount multiplie ttft
    const singleReq = computeOfficialEcologitsLlmImpacts({
      ...base,
      tps: 50,
      ttft: 0.5,
      requestCount: 1,
    });
    const tenReqs = computeOfficialEcologitsLlmImpacts({
      ...base,
      tps: 50,
      ttft: 0.5,
      requestCount: 10,
    });
    expect(tenReqs.generationLatencySeconds).toBeCloseTo(
      singleReq.generationLatencySeconds + 9 * 0.5,
      10,
    );
  });

  it("calcule les impacts pour un modèle documenté du catalogue et sépare strictement les composantes d'eau", () => {
    const llama70b = requireAiModel("meta-llama/llama-3.1-70b-instruct");
    const resultWithBothWaters = computeEcologitsCompatibleImpacts({
      model: llama70b,
      inputTokens: 10_000,
      outputTokens: 2_000,
      durationSeconds: 40,
      region: "US",
      pue: 1.15,
      datacenterWue: 0.5,
    });

    expect(resultWithBothWaters.isEcologitsCompliant).toBe(true);
    expect(resultWithBothWaters.gpuRequiredCount).toBe(4);
    expect(resultWithBothWaters.itEnergyKwh).toBeGreaterThan(0);
    expect(resultWithBothWaters.facilityEnergyKwh).toBeGreaterThan(
      resultWithBothWaters.itEnergyKwh!,
    );
    expect(resultWithBothWaters.operationalGwpKgCo2e).not.toBeNull();
    expect(resultWithBothWaters.embodiedGwpKgCo2e).toBeGreaterThan(0);
    expect(resultWithBothWaters.directWaterLiters).toBeGreaterThan(0);
    expect(resultWithBothWaters.indirectWaterLiters).toBeGreaterThan(0);
    expect(resultWithBothWaters.totalWaterLiters).toBeGreaterThan(0);
    expect(resultWithBothWaters.diagnostic).toBe("DOCUMENTED_MODEL");

    // Sans datacenterWue, directWaterLiters est null et totalWaterLiters DOIT rester null
    const resultWithoutDirectWue = computeEcologitsCompatibleImpacts({
      model: llama70b,
      outputTokens: 2_000,
      region: "US",
      pue: 1.15,
    });
    expect(resultWithoutDirectWue.directWaterLiters).toBeNull();
    expect(resultWithoutDirectWue.indirectWaterLiters).toBeGreaterThan(0);
    expect(resultWithoutDirectWue.totalWaterLiters).toBeNull();

    // En région FR avec datacenterWue, indirectWaterLiters est null et totalWaterLiters DOIT rester null
    const resultFrWithDirectWue = computeEcologitsCompatibleImpacts({
      model: llama70b,
      outputTokens: 2_000,
      region: "FR",
      pue: 1.15,
      datacenterWue: 0.5,
    });
    expect(resultFrWithDirectWue.directWaterLiters).toBeGreaterThan(0);
    expect(resultFrWithDirectWue.indirectWaterLiters).toBeNull();
    expect(resultFrWithDirectWue.totalWaterLiters).toBeNull();
  });

  it("gère l'absence de facteur électrique régional sans inventer de valeur (NA)", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");
    const result = computeEcologitsCompatibleImpacts({
      model: llama8b,
      outputTokens: 5_000,
      region: "UNKNOWN",
    });

    expect(result.isEcologitsCompliant).toBe(true);
    expect(result.itEnergyKwh).toBeGreaterThan(0);
    expect(result.facilityEnergyKwh).toBeGreaterThan(0);
    expect(result.operationalGwpKgCo2e).toBeNull();
    expect(result.totalGwpKgCo2e).toBeNull();
    expect(result.indirectWaterLiters).toBeNull();
    expect(result.totalWaterLiters).toBeNull();
    expect(result.diagnostic).toBe("NOT_CALCULABLE");
    expect(
      result.warnings.some((w) => w.includes("Facteur carbone électrique non disponible")),
    ).toBe(true);
  });

  it("refuse d'extrapoler H100 sur local_device, refuse les architectures non publiées et refuse de substituer inputTokens à outputTokens", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");
    const gpt4o = requireAiModel("openai/gpt-4o");

    // 1. local_device -> tout à null (NA), pas de 0 artificiel sur l'incorporé
    const localResult = computeEcologitsCompatibleImpacts({
      model: llama8b,
      outputTokens: 1_000,
      executionEnvironment: "local_device",
      region: "FR",
    });
    expect(localResult.isEcologitsCompliant).toBe(false);
    expect(localResult.itEnergyKwh).toBeNull();
    expect(localResult.embodiedGwpKgCo2e).toBeNull();
    expect(localResult.diagnostic).toBe("NOT_CALCULABLE");

    // 2. Modèle propriétaire sans paramètres publiés -> pas de substitution d'architecture
    const unreleasedResult = computeEcologitsCompatibleImpacts({
      model: gpt4o,
      outputTokens: 1_000,
      region: "US",
    });
    expect(unreleasedResult.isEcologitsCompliant).toBe(false);
    expect(unreleasedResult.itEnergyKwh).toBeNull();
    expect(unreleasedResult.diagnostic).toBe("NOT_CALCULABLE");

    // 3. outputTokens manquant ou nul avec inputTokens > 0 -> pas de substitution input -> output
    const missingOutputResult = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 10_000,
      region: "US",
    });
    expect(missingOutputResult.isEcologitsCompliant).toBe(false);
    expect(missingOutputResult.itEnergyKwh).toBeNull();

    const promptOnlyResult = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 10_000,
      outputTokens: 0,
      region: "US",
    });
    expect(promptOnlyResult.isEcologitsCompliant).toBe(false);
    expect(promptOnlyResult.itEnergyKwh).toBeNull();
  });

  it("préserve la précision sur une très petite requête (1 token), n'additionne jamais cachedTokens à inputTokens et ne classe pas un zéro déclaré en MEASURED", () => {
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");

    const tiny = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 10,
      cachedTokens: 5,
      outputTokens: 1,
      region: "US",
    });
    expect(tiny.itEnergyKwh).toBeGreaterThan(0);
    expect(tiny.facilityEnergyKwh).toBeGreaterThan(0);
    expect(tiny.notes.some((n) => n.includes("5 servis depuis le KV-cache et 5 non cachés"))).toBe(
      true,
    );

    const declaredZero = computeEcologitsCompatibleImpacts({
      model: llama8b,
      inputTokens: 0,
      outputTokens: 0,
      region: "US",
    });
    expect(declaredZero.itEnergyKwh).toBe(0);
    expect(declaredZero.embodiedGwpKgCo2e).toBe(0);
    expect(declaredZero.diagnostic).toBe("DOCUMENTED_MODEL");
    expect(declaredZero.diagnostic).not.toBe("MEASURED");

    expect(() =>
      computeEcologitsCompatibleImpacts({
        model: llama8b,
        inputTokens: 100,
        cachedTokens: 200,
        outputTokens: 50,
      }),
    ).toThrow(/cachedTokens/);
  });
});

describe("EcoLogits v3.0.0 — intégrité des paramètres et de l'architecture", () => {
  it("refuse les architectures partielles ou incohérentes et accepte une architecture MoE personnalisée complète", () => {
    const gpt4o = requireAiModel("openai/gpt-4o");
    const llama8b = requireAiModel("meta-llama/llama-3.1-8b-instruct");

    // 1. customActiveParametersBillion sans customTotalParametersBillion (sans modèle ni total documenté)
    const partialCustom = computeEcologitsCompatibleImpacts({
      customActiveParametersBillion: 12,
      outputTokens: 1_000,
      region: "US",
    });
    expect(partialCustom.isEcologitsCompliant).toBe(false);
    expect(partialCustom.gpuRequiredCount).toBeNull();
    expect(partialCustom.diagnostic).toBe("NOT_CALCULABLE");

    // 2. customActiveParametersBillion sans customTotalParametersBillion sur un modèle sans paramètres publiés
    const partialOnUnreleased = computeEcologitsCompatibleImpacts({
      model: gpt4o,
      customActiveParametersBillion: 12,
      outputTokens: 1_000,
      region: "US",
    });
    expect(partialOnUnreleased.isEcologitsCompliant).toBe(false);
    expect(partialOnUnreleased.gpuRequiredCount).toBeNull();
    expect(partialOnUnreleased.diagnostic).toBe("NOT_CALCULABLE");

    // 3. Résolution sans ambiguïté du total depuis un modèle documenté si seul active est personnalisé
    const resolvedFromDocumented = computeEcologitsCompatibleImpacts({
      model: llama8b,
      customActiveParametersBillion: 4,
      outputTokens: 1_000,
      region: "US",
    });
    expect(resolvedFromDocumented.isEcologitsCompliant).toBe(true);
    expect(resolvedFromDocumented.gpuRequiredCount).toBe(1);

    // 4. Architecture personnalisée complète et valide (MoE 12B actifs / 100B totaux)
    // 1.2 * 100 * 16 / 8 = 240 Go -> ceil(240/80) = 3 -> arrondi puissance de 2 = 4 GPU
    const fullCustomMoe = computeEcologitsCompatibleImpacts({
      customActiveParametersBillion: 12,
      customTotalParametersBillion: 100,
      outputTokens: 1_000,
      region: "US",
    });
    expect(fullCustomMoe.isEcologitsCompliant).toBe(true);
    expect(fullCustomMoe.gpuRequiredCount).toBe(4);
    expect(fullCustomMoe.notes.some((n) => n.includes("Architecture MoE"))).toBe(true);

    // 5. activeParameters > totalParameters rejeté dans l'adaptateur et dans le noyau
    expect(() =>
      computeEcologitsCompatibleImpacts({
        customActiveParametersBillion: 70,
        customTotalParametersBillion: 8,
        outputTokens: 1_000,
        region: "US",
      }),
    ).toThrow(/customActiveParametersBillion/);

    expect(() =>
      computeOfficialEcologitsLlmImpacts({
        modelActiveParameterCount: 70,
        modelTotalParameterCount: 8,
        outputTokenCount: 200,
        datacenterPue: 1.2,
        datacenterWue: 0.5,
        ifElectricityMixGwp: 0.5,
        ifElectricityMixWue: 4,
      }),
    ).toThrow(/modelActiveParameterCount cannot exceed modelTotalParameterCount/);
  });

  it("rejette les facteurs physiques invalides (NaN, Infinity, négatifs, PUE < 1) et les débordements", () => {
    const base = {
      modelActiveParameterCount: 7.3,
      modelTotalParameterCount: 7.3,
      outputTokenCount: 200,
      datacenterPue: 1.2,
      datacenterWue: 0.569,
      ifElectricityMixGwp: 0.590478,
      ifElectricityMixAdpe: 7.37708e-8,
      ifElectricityMixPe: 9.988,
      ifElectricityMixWue: 5.04,
    };

    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, ifElectricityMixGwp: Number.NaN }),
    ).toThrow(/ifElectricityMixGwp/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, ifElectricityMixWue: Number.POSITIVE_INFINITY }),
    ).toThrow(/ifElectricityMixWue/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, ifElectricityMixGwp: -0.1 }),
    ).toThrow(/ifElectricityMixGwp/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, ifElectricityMixAdpe: -1e-9 }),
    ).toThrow(/ifElectricityMixAdpe/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, ifElectricityMixPe: Number.NaN }),
    ).toThrow(/ifElectricityMixPe/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, datacenterPue: 0.95 }),
    ).toThrow(/datacenterPue/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, datacenterPue: Number.POSITIVE_INFINITY }),
    ).toThrow(/datacenterPue/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, datacenterWue: -0.5 }),
    ).toThrow(/datacenterWue/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, serverPower: -1 }),
    ).toThrow(/serverPower/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, gpuEmbodiedGwp: Number.NaN }),
    ).toThrow(/gpuEmbodiedGwp/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, gpuEnergyAlpha: Number.POSITIVE_INFINITY }),
    ).toThrow(/gpuEnergyAlpha/);

    // Débordement sur volumes extrêmes
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, outputTokenCount: 1e308 }),
    ).toThrow(/Physical integrity violation/);
    expect(() =>
      computeOfficialEcologitsLlmImpacts({ ...base, modelActiveParameterCount: 1e308, modelTotalParameterCount: 1e308 }),
    ).toThrow(/Cannot size the GPU set|Physical integrity violation/);
  });
});
