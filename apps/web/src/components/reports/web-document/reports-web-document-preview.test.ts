import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileText } from "lucide-react";
import {
  ReportsWebDocumentPreview,
  type ReportsWebDocumentPreviewProps,
} from "./reports-web-document-preview";
import type { ReportModel } from "@/lib/reports/report-model/types";

const mocks = vi.hoisted(() => ({
  reportCover: vi.fn(() => null),
}));

vi.mock("./report-cover", () => ({
  ReportCover: mocks.reportCover,
}));

const report = {
  generatedAt: "23/08/2026",
  executive: { summary: "Résumé", watchouts: [], budgetUseCases: [] },
  totals: { actions: 4, kg: 12, volunteers: 3, butts: 2, hours: 5 },
  map: { geoCoverage: 80, traceCoverage: 70, points: 4 },
  areas: [],
} as unknown as ReportModel;

const exportStatus = {
  icon: FileText,
  label: "Prêt à générer",
  description: "La configuration actuelle permet de lancer l'export.",
  tone: "border-slate-200 bg-slate-50 text-slate-900",
  iconTone: "text-red-600",
};

function createProps(
  overrides: Partial<ReportsWebDocumentPreviewProps> = {},
): ReportsWebDocumentPreviewProps {
  return {
    report,
    activeScopeLabel: "Global",
    weatherAdvice: "Conditions stables.",
    showPreview: false,
    previewRef: { current: null },
    onTogglePreview: vi.fn(),
    periodDisplayLabel: "Six mois",
    detailDisplayLabel: "Par défaut (12 à 16 pages)",
    modules: {
      dataAndCartography: true,
      transparencyAndMethods: true,
      rawData: false,
      detailedFiles: true,
    },
    historyCoverageLabel: "Historique: 4 actions",
    historyGuaranteeLabel: "Historique: couverture conforme à la fenêtre sélectionnée.",
    coverageRangeLabel: "01/01/2026 → 23/08/2026",
    detailCoverageLabel: "Synthèse, détails principaux et preuves disponibles.",
    exportStatus,
    ...overrides,
  };
}

describe("ReportsWebDocumentPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the preview closed/openable and preserves the visible labels", () => {
    const closedMarkup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps(),
      ),
    );

    expect(closedMarkup).toContain("Voir l&#x27;aperçu");
    expect(closedMarkup).toContain("Historique: 4 actions");
    expect(closedMarkup).toContain("Six mois");
    expect(closedMarkup).toContain("Par défaut (12 à 16 pages)");
    expect(closedMarkup).not.toContain("synthese-executive");

    const openMarkup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({ showPreview: true }),
      ),
    );
    expect(openMarkup).toContain("Masquer l&#x27;aperçu");
    expect(openMarkup).toContain("Aperçu du PDF");
  });

  it("passes the unchanged report-cover contract and preserves the executive id", () => {
    renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({ showPreview: true }),
      ),
    );

    expect(mocks.reportCover).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "synthese-executive",
        report,
        activeScopeLabel: "Global",
        weatherAdvice: "Conditions stables.",
      }),
      undefined,
    );
  });

  it("keeps the export status badge in Preview without owning export or data logic", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({
          exportStatus: {
            ...exportStatus,
            label: "Export à vérifier",
            tone: "border-red-200 bg-red-50 text-red-900",
          },
        }),
      ),
    );

    expect(markup).toContain("Export à vérifier");
    expect(markup).toContain("border-red-200 bg-red-50 text-red-900");
  });

  it("shows only enabled optional modules and keeps the core chapters visible", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({
          modules: {
            dataAndCartography: false,
            transparencyAndMethods: true,
            rawData: false,
            detailedFiles: false,
          },
        }),
      ),
    );

    expect(markup).toContain("Synthèse exécutive");
    expect(markup).toContain("Périmètre du rapport");
    expect(markup).toContain("Résultats terrain");
    expect(markup).toContain("Transparence &amp; méthodes");
    expect(markup).not.toContain("Données &amp; cartographie");
    expect(markup).not.toContain("Données brutes");
    expect(markup).not.toContain("Fichiers détaillés");
  });
});
