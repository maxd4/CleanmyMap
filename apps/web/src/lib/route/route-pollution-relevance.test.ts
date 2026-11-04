import { describe, expect, it } from "vitest";
import type {
  RoutePollutionPotential,
  RoutePollutionPotentialConfidence,
  RoutePollutionPotentialIndex,
} from "./route-pollution-potential";
import {
  evaluateRoutePollutionRelevance,
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

  it("exposes the reference and selected category without changing historical scores", () => {
    const assessment = evaluateRoutePollutionRelevance(potential(65));

    expect(assessment.selectedCategory).toBe("mixed");
    expect(assessment.reference?.label).toBe("Référence parisienne théorique");
    expect(assessment.reference?.historicalScore).toBeNull();
    expect(assessment.policyVersion).toBe("route-pollution-relevance-v1");
  });
});
