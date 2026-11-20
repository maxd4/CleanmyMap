import { describe, expect, it } from "vitest";
import {
  compareOffers,
  priceCarbonPareto,
  type OfferCandidate,
  type OfferCostScope,
  type OfferPlotPoint,
} from "./offer-comparison";

const evidence = { checkedAt: "2026-11-20", sourceUrls: ["https://example.org/fixture"] } as const;

function offer(
  id: string,
  priceEuroPerSuccess: number | null,
  carbonGramsPerSuccess: number | null,
  extra: Partial<OfferCandidate> = {},
): OfferCandidate {
  const successfulTasks = 1_000;
  const baseline: OfferCandidate = {
    id,
    name: id,
    modelId: "synthetic/model",
    modelVersion: "1.0",
    providerId: "synthetic_cloud",
    deploymentId: `deployment_${id}`,
    executionEnvironment: "cloud_api",
    weightsAvailability: "open_weights",
    access: { billingMode: "API", codingPlatformIds: ["codex", "cursor"], reasoningConfigurationId: "synthetic-high" },
    codingAssessment: {
      benchmarkId: "synthetic-code-benchmark-v1",
      codingWorkloadId: "same-task-v1",
      reasoningConfigurationId: "synthetic-high",
      successRate: { min: 0.90, max: 0.90 },
      criticalRequirementsPassed: true,
      evidence,
    },
    evidence,
    kind: "REAL_VERIFIED",
    quality: "PASS",
    capabilities: "PASS",
    privacy: "PASS",
    availability: "PASS",
    campaign: {
      attemptedTasks: successfulTasks,
      successfulTasks,
      successDefinitionId: "same-success-v1",
      workloadId: "same-task-v1",
      workloadDomain: "CODE",
      price: priceEuroPerSuccess === null ? null : {
        totalEur: { min: priceEuroPerSuccess * successfulTasks, max: priceEuroPerSuccess * successfulTasks },
        scope: "FULL_ATTRIBUTABLE" as OfferCostScope,
        method: "BILLED",
        evidence,
      },
      energy: {
        totalKwh: { min: 2, max: 2 }, boundary: "FACILITY", evidence,
      },
      operationalCarbon: carbonGramsPerSuccess === null ? null : {
        totalKgCo2e: { min: carbonGramsPerSuccess, max: carbonGramsPerSuccess },
        location: "SINGLE_REGION_VERIFIED",
        accountingMethodId: "location-based-v1",
        boundary: "LOCATION_BASED_OPERATIONAL",
        evidence,
      },
    },
  };
  return { ...baseline, ...extra };
}

function evaluatedStatus(result: ReturnType<typeof compareOffers>, id: string) {
  return result.offers.find((item) => item.offer.id === id)?.eligibility;
}

describe("lot 21, prix et Pareto (fixtures synthétiques, pas des offres réelles)", () => {
  const reference = offer("A", 0.100, 100);

  it("n'exclut aucune offre nettement moins chère et inclut +15 % exactement", () => {
    const result = compareOffers(reference, [
      offer("B", 0.070, 35),
      offer("C", 0.100, 45),
      offer("D", 0.113, 20),
      offer("E", 0.140, 130),
      offer("F", 0.060, 125),
      offer("G", 0.115, 18),
      offer("H", 0.11501, 10),
      offer("I", 0.010, 200),
    ]);
    expect(result.robustPriceCapEuroPerSuccess).toBeCloseTo(0.115);
    expect(result.plotPoints.map((point) => point.id)).toEqual(["A", "B", "C", "D", "F", "G", "I"]);
    expect(evaluatedStatus(result, "E")).toBe("OVER_PRICE_CAP");
    expect(evaluatedStatus(result, "H")).toBe("OVER_PRICE_CAP");
    expect(result.plotPoints.filter((point) => point.onPriceCarbonParetoFront).map((point) => point.id))
      .toEqual(["B", "D", "F", "G", "I"]);
    expect(result.plotPoints.find((point) => point.id === "C")?.onPriceCarbonParetoFront).toBe(false);
  });

  it("normalise prix, énergie et carbone sur le nombre de tâches réussies", () => {
    const ref = offer("ref", 0.1, 100, {
      campaign: {
        ...reference.campaign,
        attemptedTasks: 1_000,
        successfulTasks: 900,
        price: { totalEur: { min: 90, max: 90 }, scope: "FULL_ATTRIBUTABLE", method: "BILLED", evidence },
        energy: { totalKwh: { min: 2, max: 2 }, boundary: "FACILITY", evidence },
        operationalCarbon: {
          totalKgCo2e: { min: 90, max: 90 },
          location: "SINGLE_REGION_VERIFIED", accountingMethodId: "location-based-v1",
          boundary: "LOCATION_BASED_OPERATIONAL", evidence,
        },
      },
    });
    const candidate = offer("new", 0.07, 35, {
      campaign: {
        ...reference.campaign,
        attemptedTasks: 1_000,
        successfulTasks: 890,
        price: { totalEur: { min: 62.30, max: 62.30 }, scope: "FULL_ATTRIBUTABLE", method: "BILLED", evidence },
        energy: { totalKwh: { min: 1.2, max: 1.2 }, boundary: "FACILITY", evidence },
        operationalCarbon: {
          totalKgCo2e: { min: 31.15, max: 31.15 },
          location: "SINGLE_REGION_VERIFIED", accountingMethodId: "location-based-v1",
          boundary: "LOCATION_BASED_OPERATIONAL", evidence,
        },
      },
    });
    const result = compareOffers(ref, [candidate]);
    expect(result.offers[0]?.priceEuroPerSuccess?.min).toBeCloseTo(0.1);
    expect(result.offers[1]?.priceEuroPerSuccess?.min).toBeCloseTo(0.07);
    expect(result.offers[0]?.energyWhPerSuccess?.min).toBeCloseTo(2_000 / 900);
    expect(result.offers[1]?.energyWhPerSuccess?.min).toBeCloseTo(1_200 / 890);
    expect(result.offers[1]?.carbonGramsCo2ePerSuccess?.min).toBeCloseTo(35);
  });

  it("ne divise jamais par zéro tâche réussie et refuse un prix de référence nul", () => {
    const zeroSuccess = offer("bad", 0.1, 100, {
      campaign: { ...reference.campaign, successfulTasks: 0 },
    });
    expect(evaluatedStatus(compareOffers(zeroSuccess, [offer("B", 0.07, 35)]), "B")).toBe("PRICE_UNKNOWN");
    expect(compareOffers(zeroSuccess, []).offers[0]?.priceEuroPerSuccess).toBeNull();
    expect(evaluatedStatus(compareOffers(offer("zero", 0, 100), [offer("B", 0.07, 35)]), "B"))
      .toBe("PRICE_UNKNOWN");
  });

  it("respecte des intervalles de prix robustes sans les remplacer par leurs milieux", () => {
    const ref = offer("ref", null, 100, {
      campaign: { ...reference.campaign, price: {
        totalEur: { min: 95, max: 105 }, scope: "FULL_ATTRIBUTABLE", method: "BILLED", evidence,
      } },
    });
    const uncertain = offer("uncertain", 0.100, 20, {
      campaign: { ...reference.campaign, price: {
        totalEur: { min: 100, max: 115 }, scope: "FULL_ATTRIBUTABLE", method: "BILLED", evidence,
      } },
    });
    const robust = offer("robust", 0.080, 30, {
      campaign: { ...reference.campaign, price: {
        totalEur: { min: 80, max: 90 }, scope: "FULL_ATTRIBUTABLE", method: "BILLED", evidence,
      } },
    });
    const result = compareOffers(ref, [uncertain, robust]);
    expect(evaluatedStatus(result, "uncertain")).toBe("PRICE_ELIGIBILITY_UNCERTAIN");
    expect(evaluatedStatus(result, "robust")).toBe("ELIGIBLE_PRICE");
    expect(result.plotPoints).toEqual([]);
  });

  it("bloque les environnements, qualités, confidentialité et disponibilité incompatibles", () => {
    const result = compareOffers(reference, [
      offer("local", 0.04, 2, { executionEnvironment: "local_device" }),
      offer("quality", 0.04, 2, { quality: "UNPROVEN" }),
      offer("wrong", 0.04, 2, { quality: "FAIL" }),
      offer("private", 0.04, 2, { privacy: "UNPROVEN" }),
      offer("unavailable", 0.04, 2, { availability: "FAIL" }),
      offer("scenario", 0.04, 2, { kind: "SCENARIO_ONLY" }),
      offer("other_task", 0.04, 2, {
        campaign: { ...reference.campaign, workloadId: "other" },
      }),
    ]);
    expect(result.plotPoints.map((point) => point.id)).toEqual(["A"]);
    expect(evaluatedStatus(result, "local")).toBe("ENVIRONMENT_MISMATCH");
    expect(evaluatedStatus(result, "quality")).toBe("QUALITY_UNPROVEN");
    expect(evaluatedStatus(result, "wrong")).toBe("QUALITY_INSUFFICIENT");
    expect(evaluatedStatus(result, "private")).toBe("PRIVACY_BLOCKED");
    expect(evaluatedStatus(result, "unavailable")).toBe("UNAVAILABLE");
    expect(evaluatedStatus(result, "scenario")).toBe("SCENARIO_ONLY");
    expect(evaluatedStatus(result, "other_task")).toBe("WORKLOAD_MISMATCH");
  });

  it("un open-weight hébergé à distance reste cloud ; MoE n'intervient pas dans le routage", () => {
    const candidate = offer("openweights", 0.07, 35, { weightsAvailability: "open_weights" });
    expect(compareOffers(reference, [candidate]).plotPoints.map((point) => point.id))
      .toEqual(["A", "openweights"]);
  });

  it("refuse les limites de coût incomparables, les preuves absentes et les axes NA", () => {
    const result = compareOffers(reference, [
      offer("tco", 0.05, 5, { campaign: { ...reference.campaign, price: {
        totalEur: { min: 50, max: 50 }, scope: "LOCAL_TCO", method: "BILLED", evidence,
      } } }),
      offer("price_na", null, 20),
      offer("carbon_na", 0.07, null),
      offer("storage_only", 0.07, 30, { campaign: { ...reference.campaign,
        operationalCarbon: { totalKgCo2e: { min: 30, max: 30 }, location: "INPUT_OR_STORAGE_REGION_ONLY",
          accountingMethodId: "location-based-v1", boundary: "LOCATION_BASED_OPERATIONAL", evidence },
      } }),
      offer("carbon_range", 0.07, 30, { campaign: { ...reference.campaign,
        operationalCarbon: { totalKgCo2e: { min: 20, max: 40 }, location: "REGIONAL_SET_VERIFIED",
          accountingMethodId: "location-based-v1", boundary: "LOCATION_BASED_OPERATIONAL", evidence },
      } }),
      offer("inconsistent", 0.07, 30, { campaign: { ...reference.campaign,
        operationalCarbon: { totalKgCo2e: { min: 30, max: 30 }, location: "SINGLE_REGION_VERIFIED",
          accountingMethodId: "market-based-other-v1", boundary: "LOCATION_BASED_OPERATIONAL", evidence },
      } }),
    ]);
    expect(evaluatedStatus(result, "tco")).toBe("COST_BOUNDARY_MISMATCH");
    expect(evaluatedStatus(result, "price_na")).toBe("PRICE_UNKNOWN");
    expect(evaluatedStatus(result, "carbon_na")).toBe("ELIGIBLE_PRICE");
    expect(result.plotPoints.map((point) => point.id)).toEqual(["A"]);
    expect(result.offers.find((o) => o.offer.id === "carbon_range")?.carbonGramsCo2ePerSuccess)
      .toEqual({ min: 20, max: 40 });
    expect(result.offers.find((o) => o.offer.id === "inconsistent")?.warnings)
      .toContain("CARBON_ACCOUNTING_MISMATCH");
  });

  it("ne transforme pas un autre périmètre énergétique en gain calculable", () => {
    const result = compareOffers(reference, [offer("gpu", 0.07, 20, {
      campaign: { ...reference.campaign,
        energy: { totalKwh: { min: 1.2, max: 1.2 }, boundary: "GPU_ONLY", evidence },
      },
    })]);
    expect(result.offers[1]?.warnings).toContain("ENERGY_BOUNDARY_MISMATCH");
  });

  it("ne domine pas deux points identiques et conserve tous les points", () => {
    const points: Omit<OfferPlotPoint, "onPriceCarbonParetoFront" | "platformContinuityPreferred">[] = [
      { id: "A", name: "A", xEuroPerSuccess: 0.1, yGramsCo2ePerSuccess: 100, isReference: true },
      { id: "B", name: "B", xEuroPerSuccess: 0.1, yGramsCo2ePerSuccess: 100, isReference: false },
      { id: "C", name: "C", xEuroPerSuccess: 0.2, yGramsCo2ePerSuccess: 100, isReference: false },
    ];
    expect(priceCarbonPareto(points)).toEqual(["A", "B"]);
  });
});

describe("lot 21, invariants supplémentaires", () => {
  it("refuse une référence non qualifiée et les identifiants ambigus", () => {
    const ref = offer("A", 0.1, 100, { quality: "UNPROVEN" });
    expect(evaluatedStatus(compareOffers(ref, [offer("B", 0.07, 35)]), "B"))
      .toBe("REFERENCE_UNVERIFIED");
    expect(() => compareOffers(offer("A", 0.1, 100), [offer("A", 0.07, 35)]))
      .toThrow("identifiant dupliqué");
  });
  it("refuse une grandeur infinie après conversion sans point fictif", () => {
    const reference = offer("A", 0.1, 100);
    const extreme = offer("HUGE", 0.07, 35, {
      campaign: { ...reference.campaign, operationalCarbon: {
        totalKgCo2e: { min: 1e308, max: 1e308 },
        location: "SINGLE_REGION_VERIFIED", accountingMethodId: "location-based-v1",
        boundary: "LOCATION_BASED_OPERATIONAL", evidence,
      } },
    });
    const result = compareOffers(reference, [extreme]);
    expect(result.offers[1]?.carbonGramsCo2ePerSuccess).toBeNull();
    expect(result.plotPoints.map((p) => p.id)).toEqual(["A"]);
  });
});


describe("lot 21, qualité numérique minimale", () => {
  it("applique la tolérance documentée de 3 points de succès absolus sans ignorer les pertes graves", () => {
    const reference = offer("A", 0.1, 100, {
      campaign: { ...offer("base", 0.1, 100).campaign,
        attemptedTasks: 1000, successfulTasks: 900 },
    });
    const within = offer("B", 0.07, 35, {
      campaign: { ...reference.campaign, successfulTasks: 890 },
    });
    const below = offer("C", 0.07, 35, {
      campaign: { ...reference.campaign, successfulTasks: 850 },
    });
    const result = compareOffers(reference, [within, below]);
    expect(evaluatedStatus(result, "B")).toBe("ELIGIBLE_PRICE");
    expect(evaluatedStatus(result, "C")).toBe("QUALITY_INSUFFICIENT");
  });
});


describe("lot 21, équivalence code/raisonnement et accès abonnement", () => {
  const reference = offer("reference", 0.10, 100);
  const code = reference.codingAssessment!;

  it("refuse un modèle moins capable même si son prix et son carbone sont meilleurs", () => {
    const result = compareOffers(reference, [
      offer("equivalent", 0.08, 40, { access: { ...reference.access, reasoningConfigurationId: "medium" }, codingAssessment: {
        ...code, reasoningConfigurationId: "medium", successRate: { min: 0.88, max: 0.88 },
      } }),
      offer("weaker", 0.01, 2, { access: { ...reference.access, reasoningConfigurationId: "max" }, codingAssessment: {
        ...code, reasoningConfigurationId: "max", successRate: { min: 0.75, max: 0.75 },
      } }),
    ]);
    expect(evaluatedStatus(result, "equivalent")).toBe("ELIGIBLE_PRICE");
    expect(evaluatedStatus(result, "weaker")).toBe("QUALITY_INSUFFICIENT");
    expect(result.plotPoints.map((p) => p.id)).toEqual(["reference", "equivalent"]);
  });

  it("ne suppose pas qu'un raisonnement maximal corrige une capacité inférieure", () => {
    const result = compareOffers(reference, [
      offer("max_unmeasured", 0.01, 2, { access: { ...reference.access, reasoningConfigurationId: "max" }, codingAssessment: { ...code, reasoningConfigurationId: "" } }),
      offer("unmatched", 0.01, 2, { codingAssessment: { ...code, benchmarkId: "easy-only" } }),
      offer("critical_regression", 0.01, 2, { codingAssessment: { ...code, criticalRequirementsPassed: false } }),
      offer("bounds_uncertain", 0.01, 2, { access: { ...reference.access, reasoningConfigurationId: "medium" }, codingAssessment: {
        ...code, reasoningConfigurationId: "medium", successRate: { min: 0.85, max: 0.94 },
      } }),
    ]);
    expect(evaluatedStatus(result, "max_unmeasured")).toBe("REASONING_CONFIGURATION_UNPROVEN");
    expect(evaluatedStatus(result, "unmatched")).toBe("CODING_PROFILE_MISMATCH");
    expect(evaluatedStatus(result, "critical_regression")).toBe("QUALITY_INSUFFICIENT");
    expect(evaluatedStatus(result, "bounds_uncertain")).toBe("QUALITY_INSUFFICIENT");
  });

  function subscribed(id: string, cost: number, carbon: number, platform: string,
    plan = "existing-plan", availability: "VERIFIED" | "UNKNOWN" | "UNAVAILABLE" = "VERIFIED"): OfferCandidate {
    const base = offer(id, cost, carbon);
    return {
      ...base,
      access: {
        billingMode: "SUBSCRIPTION", codingPlatformIds: [platform],
        subscriptionPlatformId: platform, subscriptionPlanId: plan,
        reasoningConfigurationId: "synthetic-high",
        verifiedReasoningConfigurationIds: ["synthetic-high"],
        subscriptionPlanAvailability: availability,
      },
      campaign: {
        ...base.campaign,
        price: { totalEur: { min: cost * 1000, max: cost * 1000 },
          scope: "SUBSCRIPTION_ALLOCATED", method: "SUBSCRIPTION_PERIOD_ALLOCATED",
          subscriptionAttribution: {
            periodId: "2026-11", planId: plan, fullPeriodFeeAndOveragesIncluded: true,
            quotaSufficientForWorkload: true,
          },
          evidence,
        },
      },
    };
  }

  it("un abonnement doit garantir la disponibilité de l'effort de raisonnement sur la plateforme", () => {
    const ref = subscribed("ref", 0.10, 100, "codex");
    const candidate = subscribed("missing_effort", 0.05, 2, "codex");
    const result = compareOffers(ref, [{ ...candidate, access: {
      ...candidate.access, verifiedReasoningConfigurationIds: ["low"],
    } }], { billingMode: "SUBSCRIPTION", codingPlatformId: "codex", currentPlanId: "existing-plan" });
    expect(evaluatedStatus(result, "missing_effort")).toBe("SUBSCRIPTION_ACCESS_UNPROVEN");
  });

  it("le mode commercial est explicite et interdit l'analogie abonnement / prix API", () => {
    const ref = subscribed("ref", 0.10, 100, "codex");
    const result = compareOffers(ref, [
      offer("api", 0.01, 2),
      subscribed("unknown_plan", 0.05, 2, "cursor", "new-plan", "UNKNOWN"),
      subscribed("unavailable", 0.05, 2, "cursor", "new-plan", "UNAVAILABLE"),
    ], { billingMode: "SUBSCRIPTION", codingPlatformId: "codex", currentPlanId: "existing-plan" });
    expect(evaluatedStatus(result, "api")).toBe("BILLING_MODE_MISMATCH");
    expect(evaluatedStatus(result, "unknown_plan")).toBe("SUBSCRIPTION_ACCESS_UNPROVEN");
    expect(evaluatedStatus(result, "unavailable")).toBe("SUBSCRIPTION_PLAN_UNAVAILABLE");
  });

  it("refuse de convertir un abonnement non attribué, quota insuffisant ou fenêtre différente en prix vérifié", () => {
    const ref = subscribed("ref", 0.10, 100, "codex");
    const candidate = subscribed("new", 0.07, 20, "codex");
    const badPrice = candidate.campaign.price!;
    const noQuota = { ...candidate, campaign: {
      ...candidate.campaign, price: { ...badPrice, subscriptionAttribution: {
        ...badPrice.subscriptionAttribution!, quotaSufficientForWorkload: false,
      } },
    } };
    const otherPeriod = { ...candidate, id: "otherPeriod", campaign: {
      ...candidate.campaign, price: { ...badPrice, subscriptionAttribution: {
        ...badPrice.subscriptionAttribution!, periodId: "2026-12",
      } },
    } };
    const r = compareOffers(ref, [noQuota, otherPeriod], { billingMode: "SUBSCRIPTION" });
    expect(evaluatedStatus(r, "new")).toBe("PRICE_UNKNOWN");
    expect(evaluatedStatus(r, "otherPeriod")).toBe("COST_BOUNDARY_MISMATCH");
  });

  it("attribue un petit bonus de continuité seulement si forfait exact et quasi-égalité prix/carbone", () => {
    const ref = subscribed("ref", 0.1, 100, "codex");
    const other = subscribed("switch", 0.08, 40, "cursor", "other-plan");
    const near = subscribed("stay", 0.081, 40.8, "codex");
    const far = subscribed("stay_far", 0.10, 60, "codex");
    const prefs = { billingMode: "SUBSCRIPTION", codingPlatformId: "Codex", currentPlanId: "existing-plan" } as const;
    const r = compareOffers(ref, [other, near, far], prefs);
    expect(r.offers.find((item) => item.offer.id === "stay")?.platformContinuityPreferred).toBe(true);
    expect(r.offers.find((item) => item.offer.id === "stay_far")?.platformContinuityPreferred).toBe(false);
    expect(compareOffers(ref, [other, near], { billingMode: "SUBSCRIPTION", codingPlatformId: "codex" })
      .offers.find((item) => item.offer.id === "stay")?.platformContinuityPreferred).toBe(false);
    expect(r.plotPoints.find((p) => p.id === "stay")?.onPriceCarbonParetoFront).toBe(false);
  });

  it("conserve les comparaisons non code sans imposer un benchmark de programmation", () => {
    const base = offer("ref", 0.1, 100, { codingAssessment: null,
      campaign: { ...reference.campaign, workloadDomain: "NON_CODE" },
    });
    const cand = offer("cand", 0.07, 40, { codingAssessment: null,
      campaign: { ...reference.campaign, workloadDomain: "NON_CODE" },
    });
    expect(evaluatedStatus(compareOffers(base, [cand]), "cand")).toBe("ELIGIBLE_PRICE");
  });
});
