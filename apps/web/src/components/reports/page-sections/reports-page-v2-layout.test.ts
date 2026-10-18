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
    expect(markup.indexOf("cmm-page-header")).toBeLessThan(
      markup.indexOf('data-testid="reports-page-tabs"'),
    );
    expect(markup.indexOf('data-testid="reports-page-tabs"')).toBeLessThan(
      markup.indexOf('data-testid="reports-tab-content"'),
    );
    expect(markup).toContain("Rapports d’impact");
    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain('id="reports-tabpanel-analysis"');
  });

  it("renders the files content for the files tab", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageV2Layout, {
        activeTab: "files",
        generationContent: React.createElement("div", null, "Génération"),
        analysisContent: React.createElement("div", null, "Analyse"),
        filesContent: React.createElement("div", null, "Mes fichiers actifs"),
      }),
    );

    expect(markup).toContain("Mes fichiers actifs");
    expect(markup).not.toContain("Génération active");
    expect(markup).not.toContain("Analyse active");
    expect(markup).toContain('id="reports-tabpanel-files"');
  });
});
