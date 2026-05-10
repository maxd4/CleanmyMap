import { describe, expect, it } from "vitest";
import {
  buildPdfReportFilename,
  buildPdfReportLines,
  buildSimplePdf,
  hasPdfReportData,
  type PdfReportPayload,
} from "./simple-pdf";

const payload: PdfReportPayload = {
  title: "Rapport test",
  rubrique: "Historique terrain",
  periode: "Année 2026",
  organizationType: "association",
  organizationName: "Clean Paris",
  data: {
    summary: ["Synthèse visible depuis la page."],
    stats: [{ label: "Actions", value: 12 }],
    rows: [{ Date: "2026-05-10", Lieu: "Paris", Kg: 4.5 }],
    columns: [
      { key: "Date", label: "Date" },
      { key: "Lieu", label: "Lieu" },
      { key: "Kg", label: "Kg" },
    ],
    generatedAt: "2026-05-10T08:00:00.000Z",
  },
};

describe("simple PDF export", () => {
  it("builds the expected report filename", () => {
    expect(
      buildPdfReportFilename({
        rubrique: "Historique terrain",
        periode: "Année 2026",
      }),
    ).toBe("rapport_historique_terrain_annee_2026.pdf");
  });

  it("detects missing report data", () => {
    expect(hasPdfReportData(null)).toBe(false);
    expect(hasPdfReportData({ rows: [] })).toBe(false);
    expect(hasPdfReportData({ stats: [{ label: "Actions", value: 1 }] })).toBe(true);
  });

  it("builds report lines from the visible page payload", () => {
    const lines = buildPdfReportLines(payload);

    expect(lines).toContain("Rapport test");
    expect(lines).toContain("Rubrique: Historique terrain");
    expect(lines).toContain("- Actions: 12");
    expect(lines).toContain("Date | Lieu | Kg");
    expect(lines).toContain("2026-05-10 | Paris | 4.5");
  });

  it("generates a PDF byte stream", () => {
    const pdf = buildSimplePdf(buildPdfReportLines(payload));

    expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe("%PDF-1.4");
    expect(pdf.byteLength).toBeGreaterThan(200);
  });
});
