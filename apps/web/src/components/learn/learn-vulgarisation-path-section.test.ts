import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnVulgarisationPathSection } from "./learn-vulgarisation-path-section";

describe("LearnVulgarisationPathSection", () => {
  it("renders the four-step reading path and the CleanMyMap cues", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnVulgarisationPathSection, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Lecture en 4 temps");
    expect(markup).toContain("1 idée = 1 carte");
    expect(markup).toContain("Contexte");
    expect(markup).toContain("Ordres de grandeur");
    expect(markup).toContain("Méthodologie");
    expect(markup).toContain("Exemples CleanMyMap");
    expect(markup).toContain("Dans CleanMyMap");
    expect(markup).toContain("Lire un rapport sans surinterpréter");
    expect(markup).toContain("Préparer une action avec le bon niveau de détail");
  });
});
