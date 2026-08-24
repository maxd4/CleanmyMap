import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageV2Layout } from "./reports-page-v2-layout";

describe("ReportsPageV2Layout", () => {
  it("renders only the active tab content", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageV2Layout, {
        activeTab: "analysis",
        generationContent: React.createElement("div", null, "Génération verrouillée"),
        analysisContent: React.createElement("div", null, "Analyse active"),
      }),
    );

    expect(markup).toContain("cmm-grid-shell");
    expect(markup).not.toContain("Génération verrouillée");
    expect(markup).toContain("Analyse active");
  });
});
