import { describe, expect, it } from "vitest";
import type {
  RoutePollutionPotential,
  RoutePollutionPotentialConfidence,
  RoutePollutionPotentialIndex,
} from "./route-pollution-potential";
import {
  evaluateRoutePollutionRelevance,
  isRoutePollutionRelevanceAssessment,
  ROUTE_POLLUTION_RELEVANCE_POLICY,
} from "./route-pollution-relevance";

function confidence(score: number | null): RoutePollutionPotentialConfidence {
  return score === null
    ? { level: "unknown", score: null, source: "unavailable" }
    : { level: score >= 0.75 ? "high" : score >= 0.5 ? "medium" : "low", score, source: "segment_projection" };
}

function index(value: number | null, confidenceScore: number | null = 0.8): RoutePollutionPotentialIndex {
  return {
    value,
    status: value === null ? "unavailable" : "available",
    categories: {} as RoutePollutionPotentialIndex["categories"],
    uniqueSegmentCount: value === null ? 0 : 2,
    collectionLengthM: value === null ? 0 : 100,
    coveredLengthM: value === null ? 0 : 100,
    coverageRatio: value === null ? null : 1,
    confidence: confidence(confidenceScore),
    missingCategories: [],
    limitations: [],
  };
}

function potential(
  value: number | null,
  groupValues: number[] = [],
  confidenceScore: number | null = 0.8,
): RoutePollutionPotential {
  return {
    schemaVersion: "route-pollution-potential-v1",
    status: value === null ? "unavailable" : "available",
    value,
    selectedCategory: "mixed",
    global: index(value, confidenceScore),
    groups: groupValues.map((groupValue, groupIndex) => ({
      groupIndex: groupIndex + 1,
      volunteerCount: 5,
      index: index(groupValue),
    })),
    reference: {
      id: "paris-reference",
      label: "Référence parisienne théorique",
      kind: "theoretical_network",
      historicalScore: null,
      comparison: {
        pickupPreference: "balanced",
        routeTopology: "loop",
        travelBudgetMinutes: 60,
        usefulCollectionLengthM: 400,
      },
      provenance: ["offline-network-reference:test"],
    },
    coverage: {
      uniqueSegmentCount: value === null ? 0 : 2,
      collectionLengthM: value === null ? 0 : 100,
      coveredLengthM: value === null ? 0 : 100,
      coverageRatio: value === null ? null : 1,
      groupCount: groupValues.length,
    },
    confidence: confidence(confidenceScore),
    version: {
      potentialSchemaVersion: "route-pollution-potential-v1",
      referenceCatalogSchemaVersion: "route-pollution-reference-catalog-v1",
      projectionSchemaVersion: "paris-pedestrian-risk-projection-v1",
      projectionVersionId: "projection-test",
      networkVersionId: "network-test",
      riskModelVersion: "risk-test",
    },
    provenance: ["projection:paris-pantheon-jardin-des-plantes"],
    limitations: [],
  };
}

describe("route pollution relevance policy", () => {
  it.each([
    [39.99, "red"],
    [40, "orange"],
    [64.99, "orange"],
    [65, "none"],
  ] as const)("applies exact threshold %s as %s", (score, warning) => {
    const assessment = evaluateRoutePollutionRelevance(potential(score));

    expect(assessment.warning).toBe(warning);
    expect(assessment.policy).toEqual(ROUTE_POLLUTION_RELEVANCE_POLICY);
  });

  it.each([
    [null, "confidence_unknown"],
    [0.49, "confidence_insufficient"],
  ] as const)("does not alert when the score confidence is insufficient: %s", (confidenceScore, reason) => {
    const assessment = evaluateRoutePollutionRelevance(potential(20, [], confidenceScore));

    expect(assessment.warning).toBe("unavailable");
    expect(assessment.status).toBe("unavailable");
    expect(assessment.reason).toBe(reason);
    expect(assessment.alternativeSearch.relevant).toBe(false);
  });

  it("does not invent a warning when the server score is absent", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(null));

    expect(assessment.warning).toBe("unavailable");
    expect(assessment.reason).toBe("score_missing");
    expect(assessment.alternativeSearch).toEqual({ relevant: false, reason: "unavailable" });
  });

  it("keeps every group warning even when the global average is satisfactory", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(72, [72, 39, 64.99]));

    expect(assessment.warning).toBe("none");
    expect(assessment.groups.map((group) => group.warning)).toEqual(["none", "red", "orange"]);
    expect(assessment.alternativeSearch).toEqual({ relevant: true, reason: "group_warning" });
  });

  it("keeps group warnings visible without enabling alternative search when global relevance is unavailable", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(72, [39], null));

    expect(assessment.status).toBe("unavailable");
    expect(assessment.groups[0]?.warning).toBe("red");
    expect(assessment.alternativeSearch).toEqual({ relevant: false, reason: "unavailable" });
    expect(isRoutePollutionRelevanceAssessment(assessment)).toBe(true);
  });

  it("exposes the reference and selected category without changing historical scores", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(65));

    expect(assessment.selectedCategory).toBe("mixed");
    expect(assessment.reference?.label).toBe("Référence parisienne théorique");
    expect(assessment.reference?.historicalScore).toBeNull();
    expect(assessment.policyVersion).toBe("route-pollution-relevance-v1");
  });

  it.each([
    ["confidence absente", (assessment: Record<string, unknown>) => { delete assessment.confidence; }],
    ["confidence malformée", (assessment: Record<string, unknown>) => { assessment.confidence = { level: "high", score: 0.2, source: "segment_projection" }; }],
    ["groupe incomplet", (assessment: Record<string, unknown>) => { assessment.groups = [{ groupIndex: 1, score: 72 }]; }],
    ["référence invalide", (assessment: Record<string, unknown>) => { assessment.reference = { id: "reference", label: "Reference", kind: "theoretical_network", historicalScore: null, comparison: {}, provenance: [] }; }],
    ["seuils divergents", (assessment: Record<string, unknown>) => { (assessment.policy as Record<string, unknown>).warningRedBelow = 41; }],
    ["alerte incompatible", (assessment: Record<string, unknown>) => { assessment.warning = "red"; }],
    ["confiance incompatible avec l'alerte", (assessment: Record<string, unknown>) => { assessment.confidence = { level: "unknown", score: null, source: "unavailable" }; assessment.status = "unavailable"; assessment.warning = "unavailable"; assessment.reason = "confidence_unknown"; assessment.alternativeSearch = { relevant: true, reason: "warning" }; }],
    ["décision alternative incohérente", (assessment: Record<string, unknown>) => { assessment.alternativeSearch = { relevant: true, reason: "warning" }; }],
    ["référence historique sans score 100", (assessment: Record<string, unknown>) => { (assessment.reference as Record<string, unknown>).kind = "historical_action_score_100"; (assessment.reference as Record<string, unknown>).historicalScore = null; }],
    ["référence théorique avec score historique", (assessment: Record<string, unknown>) => { (assessment.reference as Record<string, unknown>).kind = "theoretical_network"; (assessment.reference as Record<string, unknown>).historicalScore = 100; }],
    ["référence incompatible avec la catégorie", (assessment: Record<string, unknown>) => { ((assessment.reference as Record<string, unknown>).comparison as Record<string, unknown>).pickupPreference = "waste"; }],
  ] as const)("refuse %s sans exception", (_label, mutate) => {
    const candidate = structuredClone(evaluateRoutePollutionRelevance(potential(72, [72])));
    mutate(candidate as Record<string, unknown>);

    expect(() => isRoutePollutionRelevanceAssessment(candidate)).not.toThrow();
    expect(isRoutePollutionRelevanceAssessment(candidate)).toBe(false);
  });

  it("accepts an unavailable score only as an auditable, non-actionable state", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(20, [], null));

    expect(isRoutePollutionRelevanceAssessment(assessment)).toBe(true);
    expect(assessment.status).toBe("unavailable");
    expect(assessment.score).toBe(20);
    expect(assessment.alternativeSearch).toEqual({ relevant: false, reason: "unavailable" });
  });

  it("rejects a validly shaped group warning when its score does not justify it", () => {
    const assessment = structuredClone(evaluateRoutePollutionRelevance(potential(72, [72, 39])));
    assessment.groups[1]!.warning = "none";

    expect(isRoutePollutionRelevanceAssessment(assessment)).toBe(false);
  });
});
