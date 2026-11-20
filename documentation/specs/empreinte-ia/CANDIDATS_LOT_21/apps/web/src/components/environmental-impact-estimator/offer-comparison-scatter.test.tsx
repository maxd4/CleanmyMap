import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfferComparisonScatter } from "./offer-comparison-scatter";
import type { OfferComparison } from "@/lib/environmental-impact-estimator/offer-comparison";

const fixture: OfferComparison = {
  referenceId: "A", preferences: { billingMode: "API" }, maxCostMultiplier: 1.15, robustPriceCapEuroPerSuccess: 0.115,
  offers: [],
  plotPoints: [
    { id: "A", name: "Référence", xEuroPerSuccess: 0.1, yGramsCo2ePerSuccess: 100,
      isReference: true, onPriceCarbonParetoFront: false, platformContinuityPreferred: false },
    { id: "B", name: "Alternative", xEuroPerSuccess: 0.07, yGramsCo2ePerSuccess: 35,
      isReference: false, onPriceCarbonParetoFront: true, platformContinuityPreferred: false },
  ],
};

describe("OfferComparisonScatter accessibility", () => {
  it("garde le SVG informatif et la sélection au clavier sur des boutons natifs", () => {
    const markup = renderToStaticMarkup(
      <OfferComparisonScatter comparison={fixture} selectedOfferId="B" onSelect={vi.fn()} onPreferencesChange={vi.fn()} />,
    );
    const graphic = markup.slice(markup.indexOf("<svg"), markup.indexOf("</svg>") + 6);
    const afterGraphic = markup.slice(markup.indexOf("</svg>") + 6);
    expect(graphic).toContain('role="img"');
    expect(graphic.match(/<circle\b/g)).toHaveLength(2);
    expect(graphic).not.toContain('role="button"');
    expect(afterGraphic.match(/<button\b/g)).toHaveLength(2);
    expect(markup).toContain('id="ai-comparison-billing"');
    expect(afterGraphic).toContain('aria-pressed="true"');
    expect(afterGraphic).toContain("Coût complet");
    expect(afterGraphic).toContain("Alternative");
    expect(afterGraphic).toContain("focus-visible:outline-2");
  });

  it("ne fabrique aucun point à partir de prix ou carbone non calculables", () => {
    const empty = renderToStaticMarkup(
      <OfferComparisonScatter comparison={{ ...fixture, plotPoints: [] }}
        selectedOfferId={null} onSelect={vi.fn()} onPreferencesChange={vi.fn()} />,
    );
    expect(empty).toContain("Aucun point comparable");
    expect(empty).not.toContain("<svg");
  });
});


describe("OfferComparisonScatter subscription preferences", () => {
  it("montre le mode d'accès, la plateforme et le forfait uniquement en abonnement", () => {
    const subscribed = renderToStaticMarkup(
      <OfferComparisonScatter comparison={{ ...fixture, preferences: {
        billingMode: "SUBSCRIPTION", codingPlatformId: "codex", currentPlanId: "pro",
      } }} selectedOfferId={null} onSelect={vi.fn()} onPreferencesChange={vi.fn()} />,
    );
    expect(subscribed).toContain('id="ai-comparison-platform"');
    expect(subscribed).toContain('id="ai-comparison-plan"');
    expect(subscribed).toContain("Le bonus de continuité");
    const api = renderToStaticMarkup(
      <OfferComparisonScatter comparison={fixture} selectedOfferId={null}
        onSelect={vi.fn()} onPreferencesChange={vi.fn()} />,
    );
    expect(api).not.toContain('id="ai-comparison-platform"');
  });
});
