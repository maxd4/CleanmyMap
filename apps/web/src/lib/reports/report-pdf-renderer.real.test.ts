import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PdfReportPayload } from "@/lib/pdf-export/simple-pdf";

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: [],
    executablePath: async () => process.env.CMM_CHROME_PATH,
  },
}));

import { renderOfficialReportPdf } from "./report-pdf-renderer";

const runRealPdfTest = process.env.CMM_RUN_REAL_PDF === "1" ? it : it.skip;

const payload: PdfReportPayload = {
  title: "Rapport A4 réel — Corpus déterministe",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "multi_action",
  data: {
    generatedAt: "2026-10-17T12:00:00.000Z",
    summary: [
      "Deux actions consolidées ; les inconnues restent n/a et les proxys sont explicitement signalés.",
      "Corpus Unicode : élève, CO₂e, mégots, zéro mesuré.",
    ],
    stats: [
      { label: "Actions", value: 2 },
      { label: "Masse impact", value: "3.5 kg" },
      { label: "Mégots", value: "n/a" },
      { label: "CO₂e proxy", value: "1.2 kg" },
    ],
    chapters: [
      {
        id: "synthese-executive",
        title: "Synthèse exécutive",
        subtitle: "Corpus complet, partiel et indisponible",
        lines: ["Une valeur mesurée à zéro reste distincte de n/a."],
        stats: [{ label: "Mesure nulle", value: 0 }],
      },
      {
        id: "methodologie-fiabilite",
        title: "Méthodologie et fiabilité",
        lines: ["Version proxy : impact-proxy-v1. Source : public.actions."],
        rows: [{ source: "public.actions", value: "impact-proxy-v1" }],
        columns: [
          { key: "source", label: "Source" },
          { key: "value", label: "Version" },
        ],
      },
    ],
    rows: [
      { Date: "2026-10-01", Masse: 3.5, CO2e: 1.2, Inconnu: null },
      { Date: "2026-10-02", Masse: 0, CO2e: null, Inconnu: "n/a" },
    ],
    columns: [
      { key: "Date", label: "Date" },
      { key: "Masse", label: "Masse (kg)" },
      { key: "CO2e", label: "CO₂e proxy (kg)" },
      { key: "Inconnu", label: "Indisponible" },
    ],
  },
};

describe("real official PDF rendering", () => {
  runRealPdfTest("generates A4 PDFs for both official themes without changing document content", async () => {
    const outputDirectory = resolve(process.cwd(), "../../artifacts/reports-05");
    await mkdir(outputDirectory, { recursive: true });

    const rendered = await Promise.all(((["impact", "scientific"] as const)).map(async (theme) => {
      const bytes = await renderOfficialReportPdf({ payload, theme });
      const path = resolve(outputDirectory, `official-report-${theme}.pdf`);
      await writeFile(path, bytes);
      return { theme, path, bytes };
    }));

    for (const { bytes } of rendered) {
      expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe("%PDF-1.4");
      expect(bytes.byteLength).toBeGreaterThan(10_000);
    }
    expect(rendered.map(({ theme }) => theme)).toEqual(["impact", "scientific"]);
  }, 120_000);
});
