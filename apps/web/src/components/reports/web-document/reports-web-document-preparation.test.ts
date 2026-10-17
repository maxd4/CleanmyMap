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
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./reports-web-document.shared";
import { collectDomElements } from "./__tests__/reports-web-document.test-support";

const mocks = vi.hoisted(() => ({
  useReportsWebDocumentModel: vi.fn(),
  usePdfExport: vi.fn(),
  preview: vi.fn(() => null),
  delivery: vi.fn(() => "Générer le rapport"),
  deliveryHistory: vi.fn(() => null),
  renderReportWindow: vi.fn(),
  prepareReportWindow: vi.fn(),
  openPrintableReport: vi.fn(),
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

vi.mock("@/lib/pdf-export/browser-report", () => ({
  renderReportWindow: mocks.renderReportWindow,
  openPrintableReport: mocks.openPrintableReport,
  prepareReportWindow: mocks.prepareReportWindow,
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
  detailLevel: "default",
  onDetailLevelChange: vi.fn(),
  theme: "impact",
  onThemeChange: vi.fn(),
  selectedScopeValue: "global",
  scopeOptions,
  onScopeChange: vi.fn(),
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
  onModuleToggle: vi.fn(),
  advancedFilters: REPORT_ADVANCED_FILTER_DEFAULTS,
  onAdvancedFiltersChange: vi.fn(),
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
  dataAvailability: { isTruncated: true },
  wasteProfile: { dominantLabel: "Plastique", coveragePercent: 100, categories: [] },
  accountScopeCoverage: { coveragePercent: 100 },
  exportRows: [],
  isLoading: false,
  hasError: false,
};

describe("ReportsWebDocumentPreparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("relays period, scope and module callbacks without owning state", () => {
    const props = {
      ...preparationProps,
      onPeriodChange: vi.fn(),
      onDetailLevelChange: vi.fn(),
      onThemeChange: vi.fn(),
      onScopeChange: vi.fn(),
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
    selects[1]?.props.onChange?.({ target: { value: "exhaustif" } });
    selects[2]?.props.onChange?.({ target: { value: "scientific" } });
    selects[3]?.props.onChange?.({ target: { value: "account:account-1" } });
    moduleInputs.forEach((input) => input.props.onChange?.());

    expect(props.onPeriodChange).toHaveBeenCalledWith("current_year");
    expect(props.onDetailLevelChange).toHaveBeenCalledWith("exhaustif");
    expect(props.onThemeChange).toHaveBeenCalledWith("scientific");
    expect(props.onScopeChange).toHaveBeenCalledWith("account:account-1");
    expect(selects).toHaveLength(4);
    expect(props.onModuleToggle).toHaveBeenCalledTimes(4);
    expect(props.onModuleToggle.mock.calls.map(([key]) => key)).toEqual([
      "dataAndCartography",
      "transparencyAndMethods",
      "rawData",
      "detailedFiles",
    ]);
  });

  it("does not advertise a retired history cap", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentPreparation, preparationProps),
    );

    expect(markup).toContain("Configuration");
    expect(markup).not.toContain("plafonné à");
    expect(markup).not.toContain("1000 actions approuvées");
    expect(markup).toContain("Périmètre du rapport");
    expect(markup).toContain("Niveau de détail");
    expect(markup).toContain("Composition de référence");
    const detailSelect = collectDomElements(
      React.createElement(ReportsWebDocumentPreparation, preparationProps),
    ).find(
      (element) =>
        (element.props as { id?: string }).id === "reports-web-document-detail-level",
    );
    expect(
      (detailSelect?.props as { [key: string]: unknown } | undefined)?.[
        "aria-describedby"
      ],
    ).toBe(
      "reports-web-document-detail-level-description",
    );
    expect(markup).toContain('id="reports-web-document-detail-level-description"');
    expect(markup).not.toMatch(/6 à 8 pages|12 à 16 pages|20 à 28 pages/);
    expect(markup).toContain("Modules optionnels");
    expect(markup).toContain('for="reports-web-document-period"');
    expect(markup).toContain('id="reports-web-document-period"');
    expect(markup).toContain('for="reports-web-document-scope"');
    expect(markup).toContain('id="reports-web-document-scope"');
    expect(markup).toContain("Thème PDF");
    expect(markup).toContain("Habillage éditorial et institutionnel");
    expect(markup).toContain('id="reports-web-document-theme-description"');
    expect(markup).toContain('id="reports-web-document-module-dataAndCartography"');
    expect(markup).not.toContain("Étape 1");
  });

  it("keeps advanced filters closed until explicitly opened", () => {
    const onAdvancedFiltersToggle = vi.fn();
    const props = { ...preparationProps, onAdvancedFiltersToggle };
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentPreparation, props),
    );
    const elements = collectDomElements(
      React.createElement(ReportsWebDocumentPreparation, props),
    );
    const toggle = elements.find((element) => element.type === "button" && (element.props as Record<string, unknown>)["aria-controls"] === "reports-advanced-filters");

    expect(markup).toContain("Filtres avancés");
    expect(markup).not.toContain("Sans anomalie bloquante");
    expect((toggle?.props as Record<string, unknown> | undefined)?.["aria-expanded"]).toBe(false);
    toggle?.props.onClick?.();
    expect(onAdvancedFiltersToggle).toHaveBeenCalledTimes(1);
  });

  it("locks the period and scope to the server-resolved action", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsWebDocumentPreparation, {
        ...preparationProps,
        period: "full_history",
        singleAction: { actionId: "action-1", scopeLabel: "Action terrain canonique" },
      }),
    );

    const elements = collectDomElements(
      React.createElement(ReportsWebDocumentPreparation, {
        ...preparationProps,
        period: "full_history",
        singleAction: { actionId: "action-1", scopeLabel: "Action terrain canonique" },
      }),
    );

    expect(markup).toContain("Historique complet · action sélectionnée");
    expect(markup).toContain("Action terrain canonique");
    expect(markup).toContain("Action sélectionnée · résolution serveur à la génération");
    expect(markup).not.toContain("action-1");
    expect(elements.filter((element) => element.type === "select")).toHaveLength(2);
    expect(elements.filter((element) => element.type === "input" && element.props.type === "checkbox")).toHaveLength(4);
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
    } as unknown as ReportsWebDocumentProps;

    const markup = renderToStaticMarkup(React.createElement(ReportsWebDocument, props));

    expect(mocks.useReportsWebDocumentModel).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContracts: [approvedContract],
        initialIsTruncated: true,
        initialCommunityEvents: [],
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
      "Période: Six mois · Par défaut.",
    );
    expect(exportOptions.data.summary).toContain(
      "Modules optionnels inclus: Données & cartographie, Transparence & méthodes, Fichiers détaillés.",
    );
    expect(exportOptions.data).not.toHaveProperty("weather");
    expect(JSON.stringify(exportOptions.data)).not.toMatch(/weather|météo/i);
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
        payload: {
          title: "Rapport d'impact - Global - Par défaut",
          rubrique: "reporting",
          periode: "six_months",
          organizationType: "multi_action",
          data: { generatedAt: "2026-08-27T10:30:00.000Z" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      exportOptions.onGenerate({
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
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      input: {
        type: "multi_action",
        period: { id: "six_months" },
        scope: { kind: "global", value: null },
        filters: {
          dataQuality: "all",
          qualityGradeAtLeast: "any",
          measureProvenance: "any",
          validCoordinates: "any",
          geometryProvenance: "any",
          declarationOrigin: "any",
          wasteKgMin: null,
          wasteKgMax: null,
          cigaretteButtsMin: null,
          cigaretteButtsMax: null,
          wasteCategory: "any",
          exploitableGeometry: "any",
          photographicEvidence: "any",
        },
      },
      detailLevel: "default",
      modules: {
        dataAndCartography: true,
        transparencyAndMethods: true,
        rawData: false,
        detailedFiles: true,
      },
    });
    expect(String(request.body)).not.toContain("Masse_Kg");
    expect(mocks.openPrintableReport.mock.calls.at(-1)?.[4]).toEqual({ theme: "impact" });
    vi.unstubAllGlobals();

    const previewProps = (
    mocks.preview.mock.calls as unknown as Array<[
      {
        onTogglePreview?: () => void;
        modules?: unknown;
        modulesLabel?: string;
        isTruncated?: boolean;
      },
    ]>
    )[0]?.[0];
    expect(previewProps?.modulesLabel).toBe(
      "Données & cartographie, Transparence & méthodes, Fichiers détaillés",
    );
    expect(previewProps?.isTruncated).toBe(true);
  });

  it("sends only the typed single-action request and opens the server snapshot", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "idle",
      message: null,
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });

    renderToStaticMarkup(
      React.createElement(ReportsWebDocument, {
        contracts: [{ id: "action-1", status: "approved", dates: { observedAt: "2026-08-01" } }],
        communityEvents: [],
        singleAction: { actionId: "11111111-1111-4111-8111-111111111111", scopeLabel: "Action canonique" },
      } as unknown as ReportsWebDocumentProps),
    );

    const exportOptions = mocks.usePdfExport.mock.calls[0]?.[0];
    const serverPayload = {
      title: "Rapport d'impact - Action canonique - Par défaut",
      rubrique: "reporting",
      periode: "full_history",
      organizationType: "single_action",
      provenance: {
        type: "single_action",
        actionId: "11111111-1111-4111-8111-111111111111",
        source: "public.actions",
        resolvedAt: "2026-08-27T10:30:00.000Z",
      },
      data: { generatedAt: "2026-08-27T10:30:00.000Z" },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        item: {
          id: "generation-single",
          report: serverPayload.title,
          period: "Historique complet",
          perimeter: "Action canonique",
          detail: "Par défaut",
          generatedAt: "27/08/2026 12:30",
        },
        payload: serverPayload,
        filename: "rapport_reporting_full_history.pdf",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      exportOptions.onGenerate({
        title: "Valeur navigateur ignorée",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      }),
    ).resolves.toBeUndefined();

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      input: { type: "single_action", actionId: "11111111-1111-4111-8111-111111111111" },
      detailLevel: "default",
      modules: {
        dataAndCartography: true,
        transparencyAndMethods: true,
        rawData: false,
        detailedFiles: true,
      },
    });
    expect(String(request.body)).not.toContain("Valeur navigateur ignorée");
    expect(mocks.openPrintableReport.mock.calls.at(-1)?.[4]).toEqual({ theme: "impact" });
    vi.unstubAllGlobals();
  });

  it("replays a historical snapshot with the selected theme without a new generation", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "idle",
      message: null,
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });
    const reportWindow = { closed: false } as Window;
    mocks.prepareReportWindow.mockReturnValue(reportWindow);
    const snapshot = {
      title: "Rapport historique",
      rubrique: "reporting",
      periode: "six_months",
      organizationType: "Global",
      data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Historique"] },
    };
    const historyRow = {
      id: "generation-theme",
      report: "Rapport historique",
      period: "Six mois",
      perimeter: "Global",
      detail: "Par défaut",
      generatedAt: "27/08/2026 12:30",
    };
    const props = {
      contracts: [],
      communityEvents: [],
      initialRecentRows: [historyRow],
    } as unknown as ReportsWebDocumentProps;
    renderToStaticMarkup(React.createElement(ReportsWebDocument, props));
    const historyCall = mocks.deliveryHistory.mock.calls.at(-1) as unknown as [
      { onView: (id: string) => void },
    ] | undefined;
    const historyProps = historyCall?.[0] as {
      onView: (id: string) => void;
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        generation: {
          id: "generation-theme",
          filename: "rapport_historique.pdf",
          generatedAt: "2026-08-27T10:30:00.000Z",
          scopeLabel: "Global",
          detailLevel: "default",
          snapshot,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    historyProps.onView("generation-theme");
    await vi.waitFor(() => expect(mocks.renderReportWindow).toHaveBeenCalledWith(
      reportWindow,
      snapshot,
      { theme: "impact" },
    ));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/generations/generation-theme",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/reports/generations",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();
  });

  it("does not fail an already successful PDF when history persistence fails", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "success",
      message: "Rapport imprimable ouvert.",
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });

    renderToStaticMarkup(
      React.createElement(ReportsWebDocument, {
        contracts: [],
        communityEvents: [],
      } as ReportsWebDocumentProps),
    );
    const exportOptions = mocks.usePdfExport.mock.calls[0]?.[0];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "unavailable" }) }),
    );

    await expect(
      exportOptions.onGenerate({
        title: "Rapport",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      }),
    ).rejects.toThrow("unavailable");
    vi.unstubAllGlobals();
  });

  it("surfaces a render failure after persistence without pretending the report opened", async () => {
    mocks.useReportsWebDocumentModel.mockReturnValue(reportModel);
    mocks.usePdfExport.mockReturnValue({
      state: "idle",
      message: null,
      copy: { pendingLabel: "Génération en cours" },
      hasData: true,
      isDisabled: false,
      exportRubriquePdf: vi.fn(),
    });
    mocks.openPrintableReport.mockReturnValue("blocked");

    renderToStaticMarkup(
      React.createElement(ReportsWebDocument, {
        contracts: [],
        communityEvents: [],
      } as ReportsWebDocumentProps),
    );
    const exportOptions = mocks.usePdfExport.mock.calls[0]?.[0];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          item: {
            id: "generation-after-persistence",
            report: "Rapport",
            period: "Six mois",
            perimeter: "Global",
            detail: "Par défaut",
            generatedAt: "27/08/2026 12:30",
          },
          payload: {
            title: "Rapport",
            rubrique: "reporting",
            periode: "six_months",
            organizationType: "multi_action",
            data: { generatedAt: "2026-08-27T10:30:00.000Z" },
          },
        }),
      }),
    );

    await expect(
      exportOptions.onGenerate(
        {
          title: "Rapport",
          rubrique: "reporting",
          periode: "six_months",
          organizationType: "Global",
          data: { generatedAt: "2026-08-27T10:30:00.000Z" },
        },
        {} as Window,
      ),
    ).rejects.toThrow("fenêtre du rapport a été bloquée");
    expect(mocks.openPrintableReport).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
