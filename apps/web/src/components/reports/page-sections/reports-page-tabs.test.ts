import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageTabs, resolveReportsTab } from "./reports-page-tabs";

describe("ReportsPageTabs", () => {
  it("marks the requested tab as active", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageTabs, {
        activeTab: "analysis",
      }),
    );

    expect(markup).toContain("aria-current=\"page\"");
    expect(markup).toContain("?tab=analysis");
    expect(markup).toContain("?tab=generation");
    expect(markup).toContain('aria-label="Onglets des rapports"');
    expect(markup).not.toContain("Choix, aperçu et export du rapport.");
    expect(markup).not.toContain("KPI, comparaisons, résultats et méthodes.");
  });

  it.each([
    [undefined, "generation"],
    ["", "generation"],
    ["invalid", "generation"],
    ["generation", "generation"],
    ["analysis", "analysis"],
    ["pilotage", "analysis"],
  ] as const)("resolves %s to %s", (requestedTab, expectedTab) => {
    expect(resolveReportsTab(requestedTab)).toBe(expectedTab);
  });
});
