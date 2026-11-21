import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiFootprintMethodologySection } from "./ai-footprint-methodology-section";

describe("AiFootprintMethodologySection", () => {
  it("renders a French, read-only scenario with separate energy, carbon, water, and collection goals", () => {
    const markup = renderToStaticMarkup(<AiFootprintMethodologySection isFrench />);
    expect(markup).toContain('id="ai-footprint-methodology-title"');
    expect(markup).toContain("France 2025 (RTE, consommation)");
    expect(markup).toContain("États-Unis (proxy 2024)");
    expect(markup).toContain("Mon empreinte IA : scénarios pédagogiques");
    expect(markup).toContain("Aucune collecte ne compense physiquement");
    expect(markup).toContain('type="range" min="0" max="100" step="1"');
    expect(markup).toContain("ai-collection-share");
    expect(markup).toContain("role=\"status\"");
  });

  it("provides the corresponding English labels", () => {
    const markup = renderToStaticMarkup(<AiFootprintMethodologySection isFrench={false} />);
    expect(markup).toContain("My AI footprint: educational scenarios");
    expect(markup).toContain("Unknown region");
    expect(markup).toContain("The 500 L/butt proxy describes potential pollution risk");
  });
});
