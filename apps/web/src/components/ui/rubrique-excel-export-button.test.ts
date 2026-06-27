import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDeliverableBaseName, normalizeDeliverableRubrique } from "@/lib/reports/deliverable-name";
import { RubriqueExcelExportButton } from "./rubrique-excel-export-button";

describe("RubriqueExcelExportButton", () => {
  it("renders the shared CSV label and filename hint", () => {
    const expectedFilename = `${buildDeliverableBaseName({
      rubrique: normalizeDeliverableRubrique("Mon espace"),
    })}.csv`;
    const markup = renderToStaticMarkup(
      React.createElement(RubriqueExcelExportButton, {
        rubriqueTitle: "Mon espace",
        data: [{ label: "France", value: 12 }],
      }),
    );

    expect(markup).toContain("Exporter CSV");
    expect(markup).toContain(`title="${expectedFilename}"`);
    expect(markup).toContain("Exporter les donnees de Mon espace au format CSV");
  });
});
