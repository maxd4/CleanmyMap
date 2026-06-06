import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnTriContextSection } from "./learn-tri-context-section";

describe("LearnTriContextSection", () => {
  it("renders decision paths and edge cases for tri, compost and behaviors", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnTriContextSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Chemins de décision");
    expect(markup).toContain("Par contexte");
    expect(markup).toContain("Action terrain");
    expect(markup).toContain("Plage");
    expect(markup).toContain("Ville");
    expect(markup).toContain("Événement");
    expect(markup).toContain("Compost domestique");
    expect(markup).toContain("Cas limites");
    expect(markup).toContain("Déchet non identifiable");
    expect(markup).toContain("Déchet souillé");
    expect(markup).toContain("Compost impossible");
    expect(markup).toContain("Matériel absent");
    expect(markup).toContain("Consigne locale ambiguë");
  });
});
