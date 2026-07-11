import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnTriContextSection } from "./learn-tri-context-section";

describe("LearnTriContextSection", () => {
  it("renders a compact selector, one active card and a closed edge-case accordion", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnTriContextSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Contexte de tri");
    expect(markup).toContain("Sélecteur");
    expect(markup).toContain("Action terrain");
    expect(markup).toContain("Plage");
    expect(markup).toContain("Ville");
    expect(markup).toContain("Événement");
    expect(markup).toContain("Compost domestique");
    expect(markup).toContain("Situation active");
    expect(markup).toContain("Voir le guide tri");
    expect(markup).toContain("Cas limites");
    expect(markup).toContain("Déchet souillé");
    expect(markup).toContain("Objet non identifiable");
    expect(markup).toContain("Consigne ambiguë");
    expect(markup).not.toContain("role=\"tablist\"");
  });
});
