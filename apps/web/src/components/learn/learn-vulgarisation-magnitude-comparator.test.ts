import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnVulgarisationMagnitudeComparator } from "./learn-vulgarisation-magnitude-comparator";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";

describe("LearnVulgarisationMagnitudeComparator", () => {
  it("renders the before/after comparator for the Vulgarisation rubric", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        SitePreferencesProvider,
        null,
        React.createElement(LearnVulgarisationMagnitudeComparator, null),
      ),
    );

    expect(markup).toContain("Passer du chiffre brut au sens utile");
    expect(markup).toContain("Avant");
    expect(markup).toContain("Après");
    expect(markup).toContain("Lecture CleanMyMap");
    expect(markup).toContain("Sortie terrain");
    expect(markup).toContain("Eau mobilisée");
    expect(markup).toContain("CO2eq");
    expect(markup).toContain("Valeur utile");
  });
});
