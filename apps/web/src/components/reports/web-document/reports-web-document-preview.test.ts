import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function createProps(
  overrides: Partial<ReportsWebDocumentPreviewProps> = {},
): ReportsWebDocumentPreviewProps {
  return {
    report,
    activeScopeLabel: "Global",
    showPreview: false,
    previewRef: { current: null },
    onTogglePreview: vi.fn(),
    periodDisplayLabel: "Six mois",
    coverageRangeLabel: "01/01/2026 → 23/08/2026",
    modulesLabel: "Données & cartographie",
    dataStatusLabel: "Données disponibles",
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
    expect(closedMarkup).toContain("Périmètre actif");
    expect(closedMarkup).toContain("Actions incluses");
    expect(closedMarkup).toContain("4 actions");
    expect(closedMarkup).toContain("Six mois");
    expect(closedMarkup).toContain("01/01/2026 → 23/08/2026");
    expect(closedMarkup).toContain("Données &amp; cartographie");
    expect(closedMarkup).toContain("Données disponibles");
    expect(closedMarkup).not.toMatch(/6 à 8 pages|12 à 16 pages|20 à 28 pages/);
    expect(closedMarkup).not.toContain("Étape 2");
    expect(closedMarkup).not.toContain("synthese-executive");

    const openMarkup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({ showPreview: true }),
      ),
    );
    expect(openMarkup).toContain("Masquer l&#x27;aperçu");
    expect(openMarkup).toContain("Première page du PDF");
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
      }),
      undefined,
    );
  });

  it("keeps the preview focused on the actual report summary", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        ReportsWebDocumentPreview,
        createProps({
          modulesLabel: "Transparence & méthodes",
        }),
      ),
    );

    expect(markup).toContain("Résumé du rapport");
    expect(markup).toContain("Transparence &amp; méthodes");
    expect(markup).not.toContain("Ce qui sortira dans le PDF");
    expect(markup).not.toContain("Par défaut");
  });
});
