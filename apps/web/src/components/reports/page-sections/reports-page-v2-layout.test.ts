import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportsPageV2Layout } from "./reports-page-v2-layout";

describe("ReportsPageV2Layout", () => {
  it("locks report exports when the profile is not privileged", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPageV2Layout, {
        locale: "fr",
        roleLabel: "Bénévole",
        primaryAction: {
          href: "/profil/benevole",
          label: { fr: "Profil", en: "Profile" },
          description: { fr: "Accéder au profil", en: "Open the profile" },
        },
        generationContent: React.createElement("div", null, "Génération verrouillée"),
        defaultTab: "pilotage",
        canAccessExports: false,
        summaryKpis: [
          { label: "A", value: "1", previousValue: "0", interpretation: "neutral" },
          { label: "B", value: "2", previousValue: "1", interpretation: "neutral" },
          { label: "C", value: "3", previousValue: "2", interpretation: "neutral" },
        ],
        navigationItems: [],
        overview: null,
        contracts: [],
        communityEvents: [],
        weather: null,
        monthlyData: [],
        toReportsExportRow: () => ({}),
      }),
    );

    expect(markup).toContain("cmm-grid-shell");
    expect(markup).toContain("Export réservé");
    expect(markup).not.toContain("Génération verrouillée");
  });
});
