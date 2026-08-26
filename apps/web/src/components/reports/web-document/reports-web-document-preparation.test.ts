import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ReportsWebDocumentPreparation,
  type ReportsWebDocumentPreparationProps,
} from "./reports-web-document-preparation";
import {
  ReportsWebDocument,
  type ReportsWebDocumentProps,
} from "../reports-web-document";

const mocks = vi.hoisted(() => ({
  useReportsWebDocumentModel: vi.fn(),
  usePdfExport: vi.fn(),
  preview: vi.fn(() => null),
  delivery: vi.fn(() => "Générer le rapport"),
  deliveryHistory: vi.fn(() => null),
}));

vi.mock("@/components/reports/web-document/use-reports-web-document-model", () => ({
  useReportsWebDocumentModel: mocks.useReportsWebDocumentModel,
}));

vi.mock("@/components/reports/web-document/reports-web-document-preview", () => ({
  ReportsWebDocumentPreview: mocks.preview,
}));

vi.mock("@/components/reports/web-document/reports-web-document-delivery", () => ({
  ReportsWebDocumentDelivery: mocks.delivery,
  ReportsWebDocumentDeliveryHistory: mocks.deliveryHistory,
}));

vi.mock("@/components/ui/pdf-export/use-pdf-export", () => ({
  usePdfExport: mocks.usePdfExport,
}));

vi.mock("@/components/reports/web-document/report-cover", () => ({
  ReportCover: () => null,
}));

vi.mock("@/components/ui/cmm-grid", () => ({
  CmmGrid: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  CmmGridItem: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

const scopeOptions = {
  accounts: [{ value: "account-1", label: "Compte 1" }],
  associations: [{ value: "association-1", label: "Association 1" }],
  arrondissements: [{ value: "75001", label: "1er arrondissement" }],
};

const preparationProps: ReportsWebDocumentPreparationProps = {
  period: "six_months",
  onPeriodChange: vi.fn(),
  historyCompletenessWarning: true,
  selectedScopeValue: "",
  scopeOptions,
  onScopeChange: vi.fn(),
  detailLevel: "default",
  onDetailLevelChange: vi.fn(),
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
  onModuleToggle: vi.fn(),
};

const reportModel = {
  scopeKind: "global",
  scopeValue: "",
  scopeOptions,
  setScopeKind: vi.fn(),
  setScopeValue: vi.fn(),
  activeScopeLabel: "Global",
  report: {
    executive: {
      summary: "Résumé contrôlé.",
      watchouts: [],
      budgetUseCases: [],
      readinessLabel: "Prêt",
      readinessScore: 92,
      evidence: [],
      headline: "Impact suivi",
    },
    totals: { actions: 1, kg: 4.5, volunteers: 2, butts: 1, hours: 1 },
    map: { geoCoverage: 80, traceCoverage: 75, points: 3 },
    terrain: { spotCount: 1 },
    climate: { co2AvoidedKg: 2.5, waterProtectedLiters: 10 },
    recycling: { triIndex: 70 },
    quality: { completenessScore: 95, coherenceScore: 90 },
    impactMethodology: {
      sources: { local: "fixture" },
      pollutionScoreAverage: 65,
      proxyVersion: "v1",
      qualityRulesVersion: "v1",
      formulas: [],
    },
    community: { totalEvents: 0, participationRate: 0, topLeaderboard: [] },
    areas: [],
    trendPercent: 4,
    moderation: { approved: 1, rejected: 0, delayDays: 1 },
    calendar: [],
  },
  dataAvailability: {},
  weatherAdvice: "Conditions stables.",
  wasteProfile: { dominantLabel: "Plastique", coveragePercent: 100, categories: [] },
  accountScopeCoverage: { coveragePercent: 100 },
  exportRows: [],
  isLoading: false,
  hasError: false,
};

type TestElementProps = {
  children?: React.ReactNode;
  type?: string;
  onChange?: (...args: unknown[]) => void;
};

function collectDomElements(node: React.ReactNode): React.ReactElement<TestElementProps>[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const element = node as React.ReactElement<TestElementProps>;

  if (typeof element.type === "function") {
    const component = element.type as (props: TestElementProps) => React.ReactNode;
    return collectDomElements(component(element.props));
  }

  return [
    element,
    ...React.Children.toArray(element.props.children).flatMap(collectDomElements),
  ];
}

describe("ReportsWebDocumentPreparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("relays period, scope, detail and module callbacks without owning state", () => {
    const props = {
      ...preparationProps,
      onPeriodChange: vi.fn(),
      onScopeChange: vi.fn(),
      onDetailLevelChange: vi.fn(),
      onModuleToggle: vi.fn(),
    };
    const elements = collectDomElements(
      React.createElement(ReportsWebDocumentPreparation, props),
    );
    const selects = elements.filter((element) => element.type === "select");
    const moduleInputs = elements.filter(
      (element) => element.type === "input" && element.props.type === "checkbox",
    );

    selects[0]?.props.onChange?.({ target: { value: "current_year" } });
    selects[1]?.props.onChange?.({ target: { value: "account:account-1" } });
    selects[2]?.props.onChange?.({ target: { value: "exhaustif" } });
    moduleInputs.forEach((input) => input.props.onChange?.());

    expect(props.onPeriodChange).toHaveBeenCalledWith("current_year");
    expect(props.onScopeChange).toHaveBeenCalledWith("account:account-1");
    expect(props.onDetailLevelChange).toHaveBeenCalledWith("exhaustif");
    expect(props.onModuleToggle).toHaveBeenCalledTimes(4);
    expect(props.onModuleToggle.mock.calls.map(([key]) => key)).toEqual([
      "dataAndCartography",
      "transparencyAndMethods",
      "rawData",
      "detailedFiles",
    ]);
  });

  it("keeps the historical warning and preparation wording stable", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentPreparation, preparationProps),
    );

    expect(markup).toContain("Préparer le rapport");
    expect(markup).toContain("Historique complet: la vue actuelle charge jusqu");
    expect(markup).toContain("1000 actions approuvées");
    expect(markup).toContain("Périmètre géographique");
    expect(markup).toContain("Modules optionnels");
    expect(markup).toContain("Le rapport est généré à partir des données");
  });

  it("propagates the final payload to history after a successful PDF generation", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "idle",
      message: null,
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });

    const approvedContract = {
      id: "approved-1",
      status: "approved",
      dates: { observedAt: "2026-08-01" },
    };
    const pendingContract = {
      id: "pending-1",
      status: "pending",
      dates: { observedAt: "2026-08-01" },
    };
    const props = {
      contracts: [approvedContract, pendingContract],
      isTruncated: true,
      communityEvents: [],
      weather: null,
    } as unknown as ReportsWebDocumentProps;

    const markup = renderToStaticMarkup(React.createElement(ReportsWebDocument, props));

    expect(mocks.useReportsWebDocumentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContracts: [approvedContract],
        initialIsTruncated: true,
        initialCommunityEvents: [],
        initialWeather: null,
      }),
    );
    const exportOptions = mocks.usePdfExport.mock.calls[0]?.[0];
    expect(exportOptions).toEqual(
      expect.objectContaining({
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        defaultTitle: "Rapport d'impact - Global - Par défaut",
      }),
    );
    expect(exportOptions.data.title).toBe("Rapport d'impact - Global - Par défaut");
    expect(exportOptions.data.chapters[0].lines).toContain(
      "Période: Six mois · Par défaut (12 à 16 pages).",
    );
    expect(exportOptions.data.summary).toContain(
      "Modules optionnels inclus: Données & cartographie, Transparence & méthodes, Fichiers détaillés.",
    );
    expect(markup).toContain("Générer le rapport");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        item: {
          id: "generation-1",
          report: "Rapport d'impact - Global - Par défaut",
          period: "Six mois",
          perimeter: "Global",
          detail: "Par défaut (12 à 16 pages)",
          generatedAt: "27/08/2026 12:30",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      exportOptions.onExportSuccess({
        title: "Rapport d'impact - Global - Par défaut",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/generations",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();

    const previewProps = (
      mocks.preview.mock.calls as unknown as Array<[{ onTogglePreview?: () => void; modules?: unknown }]>
    )[0]?.[0];
    expect(previewProps?.modules).toEqual(preparationProps.modules);
  });

  it("does not fail an already successful PDF when history persistence fails", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "success",
      message: "Rapport ouvert.",
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });

    renderToStaticMarkup(
      React.createElement(ReportsWebDocument, {
        contracts: [],
        communityEvents: [],
        weather: null,
      } as ReportsWebDocumentProps),
    );
    const exportOptions = mocks.usePdfExport.mock.calls[0]?.[0];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "unavailable" }) }),
    );

    await expect(
      exportOptions.onExportSuccess({
        title: "Rapport",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      }),
    ).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
