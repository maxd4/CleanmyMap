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
import { UnsupportedPdfTextError } from "./simple-pdf-primitives";
import {
  measureSimplePdfText,
  SIMPLE_PDF_TEXT_MAX_WIDTH,
} from "./simple-pdf-serialization";

const payload: PdfReportPayload = {
  title: "Rapport test",
  rubrique: "Historique terrain",
  periode: "Année 2026",
  organizationType: "association",
  organizationName: "Clean France",
  data: {
    summary: ["Synthèse visible depuis la page."],
    stats: [{ label: "Actions", value: 12 }],
    rows: [{ Date: "2026-05-10", Lieu: "France", Kg: 4.5 }],
    columns: [
      { key: "Date", label: "Date" },
      { key: "Lieu", label: "Lieu" },
      { key: "Kg", label: "Kg" },
    ],
    generatedAt: "2026-05-10T08:00:00.000Z",
  },
};

type PdfTextOperator = {
  x: number;
  y: number;
  text: string;
};

// Independent Adobe Helvetica Type 1 / WinAnsi metrics from ReportLab's
// standard-font AFM data. This table deliberately does not call the
// production measurement helper, so geometry assertions can catch a shared
// metric error.
const REFERENCE_ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
] as const;

const REFERENCE_LATIN1_WIDTHS = [
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
] as const;

const REFERENCE_SPECIAL_BYTES = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x2c6, 0x88], [0x2030, 0x89], [0x160, 0x8a],
  [0x2039, 0x8b], [0x152, 0x8c], [0x17d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x2dc, 0x98], [0x2122, 0x99], [0x161, 0x9a], [0x203a, 0x9b], [0x153, 0x9c],
  [0x17e, 0x9e], [0x178, 0x9f],
]);

const REFERENCE_SPECIAL_WIDTHS = new Map<number, number>([
  [0x80, 556], [0x82, 222], [0x83, 556], [0x84, 333], [0x85, 1000], [0x86, 556],
  [0x87, 556], [0x88, 333], [0x89, 1000], [0x8a, 667], [0x8b, 333], [0x8c, 1000],
  [0x8e, 611], [0x91, 222], [0x92, 222], [0x93, 333], [0x94, 333], [0x95, 350],
  [0x96, 556], [0x97, 1000], [0x98, 333], [0x99, 1000], [0x9a, 500], [0x9b, 333],
  [0x9c, 944], [0x9e, 500], [0x9f, 667],
]);

function measureIndependentHelveticaText(value: string): number {
  let width = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0x09 || codePoint === 0x202f) {
      width += 278;
      continue;
    }
    if (codePoint === 0x0a || codePoint === 0x0c || codePoint === 0x0d) continue;

    const byte = codePoint >= 0x20 && codePoint <= 0x7e
      ? codePoint
      : codePoint >= 0xa0 && codePoint <= 0xff
        ? codePoint
        : REFERENCE_SPECIAL_BYTES.get(codePoint);
    if (byte === undefined) throw new Error(`Missing independent reference for U+${codePoint.toString(16)}`);
    const glyphWidth = byte < 0x7f
      ? REFERENCE_ASCII_WIDTHS[byte - 0x20]
      : byte >= 0xa0
        ? REFERENCE_LATIN1_WIDTHS[byte - 0xa0]
        : REFERENCE_SPECIAL_WIDTHS.get(byte);
    if (glyphWidth === undefined) throw new Error(`Missing independent width for WinAnsi byte ${byte}`);
    width += glyphWidth;
  }
  return (width * 11) / 1000;
}

const ALL_SUPPORTED_WIN_ANSI_GLYPHS = [
  String.fromCharCode(...Array.from({ length: 0x7f - 0x20 }, (_, index) => 0x20 + index)),
  String.fromCharCode(...Array.from({ length: 0x100 - 0xa0 }, (_, index) => 0xa0 + index)),
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ",
].join("");

function decodePdfLiteral(value: string): string {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") {
      bytes.push(value.charCodeAt(index));
      continue;
    }

    const octal = value.slice(index + 1, index + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      bytes.push(Number.parseInt(octal, 8));
      index += 3;
      continue;
    }

    const escaped = value[index + 1];
    if (escaped !== undefined) {
      bytes.push(escaped.charCodeAt(0));
      index += 1;
    }
  }
  return new TextDecoder("windows-1252").decode(Uint8Array.from(bytes));
}

function extractTextOperators(pdf: Uint8Array): PdfTextOperator[] {
  const source = new TextDecoder().decode(pdf);
  return Array.from(source.matchAll(/1 0 0 1 (\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Tm \((.*)\) Tj/g)).map(
    (match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      text: decodePdfLiteral(match[3] ?? ""),
    }),
  );
}

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
    expect(lines).toContain("2026-05-10 | France | 4.5");
  });

  it("generates a PDF byte stream", () => {
    const pdf = buildSimplePdf(buildPdfReportLines(payload));

    expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe("%PDF-1.4");
    expect(pdf.byteLength).toBeGreaterThan(200);
  });

  it("keeps all chapter and global rows in both report representations", () => {
    const chapterRows = Array.from({ length: 41 }, (_, index) => ({
      id: `chapter-${index + 1}`,
      value: `Valeur chapitre ${index + 1}`,
    }));
    const globalRows = Array.from({ length: 81 }, (_, index) => ({
      id: `global-${index + 1}`,
      value: `Valeur globale ${index + 1}`,
    }));
    const report = {
      ...payload,
      data: {
        ...payload.data,
        chapters: [
          { title: "Synthèse exécutive", lines: ["Résumé"] },
          {
            title: "Tableau de chapitre",
            rows: chapterRows,
            columns: [
              { key: "id", label: "Identifiant" },
              { key: "value", label: "Valeur" },
            ],
          },
        ],
        rows: globalRows,
        columns: [
          { key: "id", label: "Identifiant" },
          { key: "value", label: "Valeur" },
        ],
      },
    } satisfies PdfReportPayload;

    const html = buildOfficialReportHtml(report);
    const lines = buildPdfReportLines(report);

    expect(html).toContain("chapter-41");
    expect(html).toContain("global-81");
    expect(html).not.toContain("ligne(s) supplémentaire(s) non affichée(s)");
    expect(lines).toContain("  chapter-41 | Valeur chapitre 41");
    expect(lines).toContain("global-81 | Valeur globale 81");
    expect(lines.some((line) => line.includes("supplementaire(s) non affichee(s)"))).toBe(false);
  });

  it("wraps long simple-PDF lines without truncating their source content", () => {
    const longText = "Texte de méthode ".repeat(20);
    const lines = buildPdfReportLines({
      ...payload,
      data: { ...payload.data, summary: [longText] },
    });

    expect(lines).toContain(`- ${longText.trim()}`);
    expect(buildSimplePdf(lines).byteLength).toBeGreaterThan(200);
  });

  it.each([
    ["wide uppercase glyphs", "W".repeat(96)],
    ["wide k glyphs", "k".repeat(100)],
    ["wide H glyphs", "H".repeat(70)],
    ["wide N glyphs", "N".repeat(70)],
    ["wide R glyphs", "R".repeat(70)],
    ["narrow lowercase glyphs", "a".repeat(96)],
    ["French sentence", "Une phrase française longue conserve les espaces, la ponctuation et les unités de mesure sans débordement."],
    ["long identifier", "https://cleanmymap.example.org/rapports/action/2026/une-reference-sans-espace-".repeat(3)],
    ["WinAnsi scientific text", "É µ 20° 42 € l’action d’exemple"],
  ])("wraps %s using generated PDF text positions", (_label, value) => {
    const operators = extractTextOperators(buildSimplePdf([value]));

    expect(operators.length).toBeGreaterThan(0);
    expect(operators.map((operator) => operator.text).join("")).toBe(value);
    for (const operator of operators) {
      expect(operator.x).toBe(40);
      expect(operator.x + measureIndependentHelveticaText(operator.text)).toBeLessThanOrEqual(40 + SIMPLE_PDF_TEXT_MAX_WIDTH + 0.001);
    }
  });

  it("matches the independent AFM reference for every supported WinAnsi glyph", () => {
    expect(measureSimplePdfText(ALL_SUPPORTED_WIN_ANSI_GLYPHS)).toBeCloseTo(
      measureIndependentHelveticaText(ALL_SUPPORTED_WIN_ANSI_GLYPHS),
      8,
    );

    const operators = extractTextOperators(buildSimplePdf([ALL_SUPPORTED_WIN_ANSI_GLYPHS]));
    expect(operators.map((operator) => operator.text).join("")).toBe(ALL_SUPPORTED_WIN_ANSI_GLYPHS);
    expect(operators.every((operator) =>
      operator.x + measureIndependentHelveticaText(operator.text) <= 40 + SIMPLE_PDF_TEXT_MAX_WIDTH + 0.001,
    )).toBe(true);
  });

  it("keeps long banner text inside the banner width and preserves its fragments", () => {
    const value = "Bandeau de gouvernance : " + "W".repeat(96);
    const operators = extractTextOperators(buildSimplePdf([`!! ${value}`]));

    expect(operators.map((operator) => operator.text).join("")).toBe(value);
    expect(operators.every((operator) => operator.x + measureIndependentHelveticaText(operator.text) <= 555.001)).toBe(true);
  });

  it("paginates according to the additional width-constrained fragments", () => {
    const pdf = buildSimplePdf(Array.from({ length: 30 }, () => "W".repeat(96)));

    expect(new TextDecoder().decode(pdf)).toContain("/Count 2");
  });

  it("keeps a measured zero distinct from an unavailable value", () => {
    const lines = buildPdfReportLines({
      ...payload,
      data: {
        ...payload.data,
        rows: [{ measured: 0, unavailable: null }],
        columns: [
          { key: "measured", label: "Mesuré" },
          { key: "unavailable", label: "Indisponible" },
        ],
      },
    });

    expect(lines).toContain("0 | ");
  });

  it("encodes supported French and scientific characters and rejects unsupported glyphs", () => {
    const unicodeLines = buildPdfReportLines({
      ...payload,
      data: { ...payload.data, summary: ["Élève — µ 20° € … l’action"] },
    });
    const encodedPdf = new TextDecoder().decode(buildSimplePdf(unicodeLines));

    expect(encodedPdf).toContain("\\311");
    expect(encodedPdf).toContain("\\227");
    expect(encodedPdf).toContain("\\265");
    expect(encodedPdf).toContain("\\260");
    expect(encodedPdf).toContain("\\200");
    expect(encodedPdf).toContain("\\205");
    expect(encodedPdf).toContain("\\222");
    expect(() => buildSimplePdf(buildPdfReportLines({
      ...payload,
      data: { ...payload.data, summary: ["Caractère non supporté 🙂"] },
    }))).toThrow(UnsupportedPdfTextError);
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

  it("renders detailed chapters in the printable report html", () => {
    const html = buildOfficialReportHtml({
      ...payload,
      data: {
        ...payload.data,
        chapters: [
          {
            title: "Synthèse exécutive",
            subtitle: "Vue d’ensemble",
            lines: ["Résumé du rapport.", "Chiffres clés disponibles."],
            stats: [{ label: "Actions", value: 12 }],
          },
        ],
      },
    });

    expect(html).toContain("Sommaire cliquable");
    expect(html).toContain("Synthèse exécutive");
    expect(html).toContain("Résumé du rapport.");
  });

  it("renders the locked section message when a chapter is empty", () => {
    const lockedMessage =
      'Générez le rapport avec un niveau de détail : "Exhaustif" si vous voulez le détail de cette sous partie.';
    const escapedLockedMessage =
      'Générez le rapport avec un niveau de détail : &quot;Exhaustif&quot; si vous voulez le détail de cette sous partie.';
    const html = buildOfficialReportHtml({
      ...payload,
      data: {
        ...payload.data,
        chapters: [
          {
            title: "Synthèse exécutive",
            subtitle: "Vue d’ensemble",
            lines: ["Résumé du rapport.", "Chiffres clés disponibles."],
            stats: [{ label: "Actions", value: 12 }],
          },
          {
            title: "Cartographie d’impact",
            subtitle: "Lecture spatiale et évolution des signalements",
            locked: true,
            requiredDetailLevelLabel: "Exhaustif",
            lines: [lockedMessage],
          },
        ],
      },
    });

    expect(html).toContain("Sommaire cliquable");
    expect(html).toContain("Cartographie d’impact");
    expect(html).toContain("is-locked");
    expect(html).toContain("Section verrouillée");
    expect(html).toContain("Lecture réduite");
    expect(html).toContain(escapedLockedMessage);
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
