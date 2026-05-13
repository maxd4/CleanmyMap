import { describe, expect, it } from "vitest";
import { buildExportUiCopy } from "./export-ui";

describe("buildExportUiCopy", () => {
  it("builds consistent CSV copy", () => {
    expect(buildExportUiCopy({ format: "csv", subject: "Vue filtree" })).toEqual({
      triggerLabel: "Exporter CSV",
      pendingLabel: "Preparation CSV...",
      successMessage: "Vue filtree CSV genere.",
      errorMessage:
        "Impossible de generer l'export CSV vue filtree. Verifiez les donnees puis reessayez.",
    });
  });

  it("builds consistent PDF copy", () => {
    expect(buildExportUiCopy({ format: "pdf", subject: "Rapport" })).toEqual({
      triggerLabel: "Exporter PDF",
      pendingLabel: "Preparation PDF...",
      successMessage: "Rapport PDF genere.",
      errorMessage:
        "Impossible de generer l'export PDF rapport. Verifiez les donnees puis reessayez.",
    });
  });
});
