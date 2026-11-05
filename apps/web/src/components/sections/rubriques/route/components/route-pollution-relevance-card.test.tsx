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
          alternativeSearch: { relevant: false, reason: "unavailable" },
        })}
        fr
        onFindNearestRelevantRoute={vi.fn()}
      />,
    );

    expect(markup).toContain("Pertinence non évaluable");
    expect(markup).toMatch(/data-route-pollution-score[^>]*>Pertinence non évaluable<\/p>/);
    expect(markup).toContain("Indice conservé pour audit : 20 / 100");
    expect(markup).not.toContain("Trouver l’itinéraire pertinent le plus proche");
    expect(markup).toContain('data-route-pollution-warning="unavailable"');
  });

  it("renders a malformed persisted assessment as unavailable without exposing an action", () => {
    const malformed = assessment({
      confidence: undefined as never,
      alternativeSearch: undefined as never,
    });

    const markup = renderToStaticMarkup(
      <RoutePollutionRelevanceCard
        assessment={malformed}
        fr
        onFindNearestRelevantRoute={vi.fn()}
      />,
    );

    expect(markup).toMatch(/data-route-pollution-score[^>]*>Pertinence non évaluable<\/p>/);
    expect(markup).not.toContain("Trouver l’itinéraire pertinent le plus proche");
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

  it("keeps an evaluable red group visible without offering an alternative when global relevance is unavailable", () => {
    const markup = renderToStaticMarkup(
      <RoutePollutionRelevanceCard
        assessment={assessment({
          score: 72,
          status: "unavailable",
          warning: "unavailable",
          reason: "confidence_unknown",
          confidence: { level: "unknown", score: null, source: "unavailable" },
          groups: [
            { groupIndex: 1, score: 39, status: "available", warning: "red", confidence: { level: "high", score: 0.9, source: "segment_projection" }, reason: null },
            { groupIndex: 2, score: 72, status: "available", warning: "none", confidence: { level: "high", score: 0.9, source: "segment_projection" }, reason: null },
          ],
          alternativeSearch: { relevant: false, reason: "unavailable" },
        })}
        fr
        onFindNearestRelevantRoute={vi.fn()}
      />,
    );

    expect(markup).toContain("Groupe 1");
    expect(markup).toContain("Alerte : pertinence faible pour cet itinéraire.");
    expect(markup).not.toContain("Trouver l’itinéraire pertinent le plus proche");
  });

  it("shows the server-reported access and before/after scores", () => {
    const markup = renderToStaticMarkup(
      <RoutePollutionRelevanceCard
        assessment={assessment({
          score: 38,
          warning: "red",
          alternativeSearch: { relevant: true, reason: "warning" },
        })}
        fr
        onFindNearestRelevantRoute={vi.fn()}
        nearestRelevantSearch={{
          schemaVersion: "route-nearest-relevant-v1",
          status: "found",
          reason: "found",
          requestedOrigin: { kind: "precise", center: { latitude: 48.85, longitude: 2.35 }, source: "address", label: "Panthéon" },
          rendezvous: { latitude: 48.8566, longitude: 2.3522, source: "planner" },
          accessDistanceKm: 0.42,
          accessDurationMinutes: 6,
          radiusKm: 0.5,
          scoreBefore: 38,
          scoreAfter: 74,
          confidenceBefore: 0.9,
          confidenceAfter: 0.9,
          routingStatus: "network",
          triedRadiiKm: [0.5],
          candidatesEvaluated: 2,
          plansEvaluated: 2,
          bestAttempt: null,
          policy: { version: "route-nearest-relevant-v1", acceptanceScore: 65, minimumConfidenceScore: 0.5, radiiKm: [0.5, 1, 2, 3, 5] },
          limitations: [],
        }}
      />,
    );

    expect(markup).toContain("Score avant / après : 38 / 74");
    expect(markup).toContain("0.42 km d’accès piéton");
    expect(markup).toContain("Nouveau rendez-vous");
  });
});
