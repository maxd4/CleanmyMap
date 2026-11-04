import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RoutePollutionRelevanceAssessment } from "@/lib/route/route-pollution-relevance";
import { RoutePollutionRelevanceCard } from "./route-pollution-relevance-card";

function assessment(overrides: Partial<RoutePollutionRelevanceAssessment> = {}): RoutePollutionRelevanceAssessment {
  return {
    schemaVersion: "route-pollution-relevance-v1",
    policyVersion: "route-pollution-relevance-v1",
    score: 72,
    status: "evaluated",
    warning: "none",
    reason: null,
    selectedCategory: "mixed",
    confidence: { level: "high", score: 0.9, source: "segment_projection" },
    reference: {
      id: "paris-reference",
      label: "Référence parisienne théorique",
      kind: "theoretical_network",
      historicalScore: null,
      comparison: { pickupPreference: "balanced", routeTopology: "loop", travelBudgetMinutes: 60, usefulCollectionLengthM: 400 },
      provenance: ["test"],
    },
    groups: [],
    alternativeSearch: { relevant: false, reason: "not_relevant" },
    policy: { version: "route-pollution-relevance-v1", warningRedBelow: 40, warningOrangeBelow: 65, minimumConfidenceScore: 0.5 },
    limitations: [],
    ...overrides,
  };
}

describe("RoutePollutionRelevanceCard", () => {
  it("renders an explicit non-evaluable state for unknown confidence", () => {
    const markup = renderToStaticMarkup(
      <RoutePollutionRelevanceCard
        assessment={assessment({
          score: 20,
          status: "unavailable",
          warning: "unavailable",
          reason: "confidence_unknown",
          confidence: { level: "unknown", score: null, source: "unavailable" },
        })}
        fr
        onFindNearestRelevantRoute={vi.fn()}
      />,
    );

    expect(markup).toContain("Pertinence non évaluable");
    expect(markup).not.toContain("Trouver l’itinéraire pertinent le plus proche");
    expect(markup).toContain('data-route-pollution-warning="unavailable"');
  });

  it("keeps group warnings visible and gives the mobile alternative a named button", () => {
    const markup = renderToStaticMarkup(
      <RoutePollutionRelevanceCard
        assessment={assessment({
          groups: [
            { groupIndex: 1, score: 72, status: "available", warning: "none", confidence: { level: "high", score: 0.9, source: "segment_projection" }, reason: null },
            { groupIndex: 2, score: 39, status: "available", warning: "red", confidence: { level: "high", score: 0.9, source: "segment_projection" }, reason: null },
          ],
          alternativeSearch: { relevant: true, reason: "group_warning" },
        })}
        fr
        onFindNearestRelevantRoute={vi.fn()}
      />,
    );

    expect(markup).toContain("Groupe 2");
    expect(markup).toContain("Alerte : pertinence faible pour cet itinéraire.");
    expect(markup).toContain('aria-label="Pertinence théorique par groupe"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("w-full");
    expect(markup).toContain("sm:w-auto");
  });
});
