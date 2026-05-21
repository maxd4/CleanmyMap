import { describe, expect, it } from "vitest";
import {
  buildPdfReportFilename,
  buildPdfReportLines,
  buildSimplePdf,
  hasPdfReportData,
  type PdfReportPayload,
} from "./simple-pdf";
import {
  buildOfficialReportHtml,
  renderOfficialMarkdown,
} from "./official-report-html";

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

  it("honors explicit page breaks", () => {
    const pdf = buildSimplePdf(["Premiere page", "\f", "Deuxieme page"]);
    const pdfText = new TextDecoder().decode(pdf);
    const pageMatches = pdfText.match(/\/Type \/Page /g) ?? [];

    expect(pageMatches.length).toBe(2);
  });

  it("renders donut chart blocks as vector content", () => {
    const pdf = buildSimplePdf([
      "Rapport test",
      "",
      "## Camembert mensuel",
      "Bloc vectoriel de la répartition métier du stockage sur le mois courant.",
      "@@CMBR_START|stockage|Répartition métier du stockage",
      "@@CMBR_META|2026-04-01|1000|800|2",
      "@@CMBR_ITEM|0|socle_estimateur_impact|Socle d’estimateur d’impact|700|70.0|500|200|40.0|2",
      "@@CMBR_ITEM|1|emails|Emails|300|30.0|300|0|0.0|1",
      "@@CMBR_END",
    ]);
    const pdfText = new TextDecoder().decode(pdf);

    expect(pdfText).toContain("%PDF-1.4");
    expect(pdfText).toContain("Camembert mensuel");
    expect(pdfText).not.toContain("@@CMBR_START");
    expect(pdfText).not.toContain("@@CMBR_ITEM");
  });

  it("builds an official printable report html", () => {
    const html = buildOfficialReportHtml(payload);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Livrable officiel CleanMyMap");
    expect(html).toContain("Rapport test");
    expect(html).toContain("Sommaire");
    expect(html).toContain("Indicateurs");
    expect(html).toContain("Données visibles");
    expect(html).toContain("Méthode et limites");
  });

  it("renders the controlled markdown grammar and escapes html", () => {
    const html = renderOfficialMarkdown([
      "# Titre",
      "",
      "::: important",
      "- **Point** utile",
      "- <script>alert(1)</script>",
      ":::",
      "",
      "| Colonne | Valeur |",
      "|---|---|",
      "| A | <img src=x onerror=alert(1)> |",
    ].join("\n"));

    expect(html).toContain("cmm-callout important");
    expect(html).toContain("<strong>Point</strong>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
  });
});
