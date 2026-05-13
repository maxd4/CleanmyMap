import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RubriquePdfExportButton } from "./rubrique-pdf-export-button";

describe("RubriquePdfExportButton", () => {
  it("renders the shared PDF label and generated filename", () => {
    const markup = renderToStaticMarkup(
      React.createElement(RubriquePdfExportButton, {
        rubrique: "Tableau de bord",
        periode: "2026-05",
        organizationType: "Association",
        defaultTitle: "Bilan mensuel",
        data: {
          summary: ["Une ligne utile"],
        },
      }),
    );

    expect(markup).toContain("Exporter PDF");
    expect(markup).toContain("rapport_tableau_de_bord_2026_05.pdf");
    expect(markup).toContain("Exporter le rapport PDF Bilan mensuel");
  });
});
