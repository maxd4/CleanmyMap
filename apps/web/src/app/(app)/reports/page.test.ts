import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  loadCachedReportCommunityEvents: vi.fn(),
  loadPilotageOverview: vi.fn(),
  getCurrentUserRoleLabel: vi.fn(),
  isAdminLikeProfile: vi.fn(),
  toProfile: vi.fn(),
  fetchCachedUnifiedActionContracts: vi.fn(),
  computeReportModel: vi.fn(),
  aggregateMonthlyAnalytics: vi.fn(),
  listReportGenerationHistory: vi.fn(),
  listReportGenerationHistoryPage: vi.fn(),
  getReportGenerationSnapshotById: vi.fn(),
  loadLandingSummary: vi.fn(),
  getReportExportAvailability: vi.fn(),
  resolveSingleActionReportContract: vi.fn(),
  getSingleActionReportScopeLabel: vi.fn(),
  SingleActionReportTargetUnavailableError: class SingleActionReportTargetUnavailableError extends Error {},
}));

const profileAction = {
  href: "/actions/new",
  label: { fr: "Déclarer une action", en: "Declare an action" },
  description: { fr: "Créer une déclaration", en: "Create a declaration" },
};

const completeAccountState = {
  requirement: { requiresSetup: false, reason: null },
  currentProfile: "benevole",
  role: "benevole",
  clerkReachable: true,
  initialArrondissement: null,
  initialLocationType: null,
};

const contract = {
  id: "action-1",
  dates: { observedAt: "2026-06-01" },
  location: { label: "Paris" },
  metadata: { wasteKg: 12, cigaretteButts: 4 },
  type: "cleanup",
  source: "test",
};

vi.mock("@/components/reports/reports-analysis-dashboard", () => ({
  ReportsAnalysisDashboard: ({
    summaryKpis,
    primaryAction,
    secondaryAction,
    report,
  }: {
    summaryKpis: unknown;
    primaryAction: { href: string };
    secondaryAction?: { href: string } | null;
    report?: { totals?: { actions?: number } };
  }) =>
    React.createElement(
      "div",
      { "data-testid": "reports-analysis-dashboard" },
      React.createElement("div", { "data-testid": "summary-kpis" }, JSON.stringify(summaryKpis)),
      React.createElement("div", { "data-testid": "report-actions" }, report?.totals?.actions),
      React.createElement("a", { href: primaryAction.href }),
      secondaryAction ? React.createElement("a", { href: secondaryAction.href }) : null,
    ),
}));

vi.mock("@/components/reports/deferred-reports-web-document", () => ({
  DeferredReportsWebDocument: ({
    isTruncated,
    initialHistoryAvailability,
    resumeConfig,
    resumeStatus,
    singleAction,
    contracts,
  }: {
    isTruncated?: boolean;
    initialHistoryAvailability?: string;
    resumeConfig?: { period?: { id?: string }; theme?: string | null };
    resumeStatus?: string;
    singleAction?: { actionId: string; scopeLabel: string };
    contracts?: unknown[];
  }) =>
    React.createElement(
      "section",
      {
        "data-testid": "report-generation",
        "data-truncated": isTruncated ? "true" : "false",
        "data-history-availability": initialHistoryAvailability,
        "data-resume-period": resumeConfig?.period?.id,
        "data-resume-theme": resumeConfig?.theme ?? undefined,
        "data-resume-status": resumeStatus ?? undefined,
        "data-single-action-id": singleAction?.actionId,
        "data-single-action-scope": singleAction?.scopeLabel,
        "data-single-action-contract": singleAction ? JSON.stringify(contracts?.[0] ?? null) : undefined,
      },
      "Génération",
    ),
}));

vi.mock("@/components/reports/page-sections/reports-page-v2-layout", () => ({
  ReportsPageV2Layout: ({ activeTab, generationContent, analysisContent, filesContent }: {
    activeTab: string;
    generationContent?: React.ReactNode;
    analysisContent?: React.ReactNode;
    filesContent?: React.ReactNode;
  }) =>
    React.createElement(
      "main",
      { "data-testid": "reports-layout", "data-active-tab": activeTab },
      activeTab === "generation" ? generationContent : activeTab === "analysis" ? analysisContent : filesContent,
    ),
}));

vi.mock("@/components/ui/rubrique-excel-export-button", () => ({
  RubriqueExcelExportButton: ({ data }: { data?: unknown[] }) =>
    React.createElement("button", { "data-testid": "csv-export", "data-row-count": data?.length ?? 0 }, "Exporter CSV"),
}));

vi.mock("@/components/ui/page-structure", () => ({
  CTAGroup: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  SectionHeader: ({ title }: { title: string }) => React.createElement("h2", null, title),
}));

vi.mock("@/components/pilotage/kpi-method-block", () => ({
  KpiMethodBlock: () => React.createElement("div", { "data-testid": "kpi-method" }),
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({ children, isAuthenticated, authUnavailable }: { children: React.ReactNode; isAuthenticated: boolean; authUnavailable?: boolean }) =>
    React.createElement(
      "div",
      { "data-testid": authUnavailable ? "clerk-unavailable-gate" : isAuthenticated ? "authenticated-gate" : "signin-gate" },
      authUnavailable ? "Authentification temporairement indisponible" : children,
    ),
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/actions/data-contract", () => ({
  getActionOperationalContext: vi.fn(() => ({
    volunteersCount: 3,
    durationMinutes: 30,
    engagementMinutes: 90,
    placeTypeLabel: "Rue",
    routeStyleLabel: "À pied",
    routeAdjustmentMessage: null,
  })),
  toActionListItem: vi.fn((item: unknown) => item),
  toActionMapItem: vi.fn((item: unknown) => item),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: mocks.loadAccountCompletionGateState,
}));

vi.mock("@/lib/community/report-events", () => ({
  loadCachedReportCommunityEvents: mocks.loadCachedReportCommunityEvents,
  loadCachedReportCommunityEventsWithAvailability: mocks.loadCachedReportCommunityEvents,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: mocks.getCurrentUserRoleLabel,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/lib/profiles", () => ({
  getProfileLabel: vi.fn((profile: string) => profile),
  getProfilePrimaryAction: vi.fn(() => profileAction),
  getProfileSecondaryAction: vi.fn(() => ({
    href: "/actions/history",
    label: { fr: "Historique", en: "History" },
  })),
  isAdminLikeProfile: mocks.isAdminLikeProfile,
  toProfile: mocks.toProfile,
}));

vi.mock("@/lib/pilotage/analytics-data-utils", () => ({
  aggregateMonthlyAnalytics: mocks.aggregateMonthlyAnalytics,
}));

vi.mock("@/lib/reports/report-model", () => ({
  computeReportModel: mocks.computeReportModel,
}));

vi.mock("@/lib/actions/action-media/action-media-report", () => ({
  loadActionMediaReportReadiness: vi.fn().mockResolvedValue({
    readyCountByActionId: new Map(),
    availability: "available",
  }),
}));

vi.mock("@/lib/actions/unified-source/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: mocks.fetchCachedUnifiedActionContracts,
}));

vi.mock("@/lib/reports/report-generation-history-store", () => ({
  listReportGenerationHistory: mocks.listReportGenerationHistory,
  listReportGenerationHistoryPage: mocks.listReportGenerationHistoryPage,
  getReportGenerationSnapshotById: mocks.getReportGenerationSnapshotById,
}));

vi.mock("@/lib/accueil/data", () => ({
  loadLandingSummary: mocks.loadLandingSummary,
}));

vi.mock("@/lib/reports/report-export-quota", () => ({
  getReportExportAvailability: mocks.getReportExportAvailability,
}));

vi.mock("@/lib/reports/single-action-report", () => ({
  resolveSingleActionReportContract: mocks.resolveSingleActionReportContract,
  getSingleActionReportScopeLabel: mocks.getSingleActionReportScopeLabel,
  SingleActionReportTargetUnavailableError: mocks.SingleActionReportTargetUnavailableError,
}));

import ReportsPage from "./page";

describe("/reports page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    mocks.loadAccountCompletionGateState.mockResolvedValue(completeAccountState);
    mocks.getCurrentUserRoleLabel.mockResolvedValue("benevole");
    mocks.toProfile.mockImplementation((role: string) => role);
    mocks.isAdminLikeProfile.mockImplementation((profile: string) => profile === "admin" || profile === "max");
    mocks.loadCachedReportCommunityEvents.mockResolvedValue({ items: [], availability: "available" });
    mocks.loadPilotageOverview.mockResolvedValue({ contracts: [contract], summary: { kpis: [] }, methods: [] });
    mocks.computeReportModel.mockReturnValue({
      totals: { kg: 12, hours: 2, actions: 1 },
      map: { geoCoverage: 80, traceCoverage: 75 },
      climate: { co2AvoidedKg: 4, waterProtectedLiters: 10 },
      quality: { coherenceScore: 90, completenessScore: 95, freshnessDays: 2 },
      recycling: { triIndex: 70 },
      community: { sourceBuckets: {} },
      impactMethodology: { sources: {}, proxyVersion: "v1", qualityRulesVersion: "v1" },
      areas: [],
    });
    mocks.aggregateMonthlyAnalytics.mockReturnValue([]);
    mocks.listReportGenerationHistory.mockResolvedValue([]);
    mocks.listReportGenerationHistoryPage.mockResolvedValue({ rows: [], page: 1, pageSize: 12, total: 0, hasNextPage: false, hasPreviousPage: false });
    mocks.getReportGenerationSnapshotById.mockResolvedValue(null);
    mocks.loadLandingSummary.mockResolvedValue({
      counters: { wasteKg: 12, butts: 4, volunteers: 3 },
      activity: { visibleActions: 1, distinctLocations: 1, items: [] },
    });
    mocks.getReportExportAvailability.mockResolvedValue("available");
    mocks.resolveSingleActionReportContract.mockResolvedValue(contract);
    mocks.getSingleActionReportScopeLabel.mockReturnValue("Action canonique");
  });

  it("renders a public summary without loading authenticated reports", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "analysis" }) }));

    expect(markup).toContain('data-testid="reports-layout"');
    expect(markup).toContain('data-testid="reports-public-summary"');
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
  });

  it("keeps Clerk unavailability distinct from an anonymous visitor", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: false });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "generation" }) }));

    expect(markup).toContain('data-testid="clerk-unavailable-gate"');
    expect(markup).not.toContain('data-testid="signin-gate"');
    expect(markup).toContain("Authentification temporairement indisponible");
  });

  it("keeps reports available for an incomplete profile", async () => {
    mocks.loadAccountCompletionGateState.mockResolvedValue({
      ...completeAccountState,
      requirement: { requiresSetup: true, reason: "missing_profile" },
    });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "analysis" }) }));

    expect(markup).toContain('data-testid="reports-layout"');
    expect(markup).not.toContain('data-testid="profile-completion-required"');
  });

  it("renders the light authenticated summary without loading detailed analysis", async () => {
    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "analysis" }) }));

    expect(markup).toContain('data-testid="reports-public-summary"');
    expect(markup).toContain("Afficher les analyses détaillées");
    expect(markup).toContain('href="?tab=analysis&amp;detail=1"');
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
    expect(mocks.computeReportModel).not.toHaveBeenCalled();
  });

  it("loads the 90-day analysis window only after an explicit detail request", async () => {
    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "pilotage", detail: "1" }) }));

    expect(markup).toContain('data-active-tab="analysis"');
    expect(markup).toContain('data-testid="reports-analysis-dashboard"');
    expect(markup).toContain('data-testid="summary-kpis"');
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({ periodDays: 90, limit: 2200 });
    expect(markup).not.toContain("Objectifs et repères");
    expect(markup).not.toContain("78%");
    expect(markup).not.toContain("45%");
    expect(markup).not.toContain("92%");
    expect(markup).not.toContain("65%");
    expect(markup).toContain('href="/actions/new"');
    expect(markup).toContain('href="/actions/history"');
  });

  it("defaults authenticated visitors to the generation view", async () => {
    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('data-active-tab="generation"');
    expect(markup).not.toContain('data-testid="reports-analysis-dashboard"');
  });

  it("keeps a real zero visible after a successful analysis load", async () => {
    mocks.computeReportModel.mockReturnValueOnce({
      totals: { kg: 0, hours: 0, actions: 0 },
      map: { geoCoverage: 0, traceCoverage: 0 },
      climate: { co2AvoidedKg: 0, waterProtectedLiters: 0 },
      quality: { coherenceScore: 0, completenessScore: 0, freshnessDays: 0 },
      recycling: { triIndex: 0 },
      community: { sourceBuckets: {} },
      impactMethodology: { sources: {}, proxyVersion: "v1", qualityRulesVersion: "v1" },
      areas: [],
    });

    const markup = renderToStaticMarkup(
      await ReportsPage({ searchParams: Promise.resolve({ tab: "analysis", detail: "1" }) }),
    );

    expect(markup).toContain('data-testid="reports-analysis-dashboard"');
    expect(markup).toContain('data-testid="report-actions">0</div>');
  });

  it("makes the generation tab available to any authenticated profile", async () => {
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValue({
      items: [contract],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "generation" }) }));

    expect(markup).toContain('data-active-tab="generation"');
    expect(markup).toContain('data-testid="report-generation"');
    expect(markup).not.toContain("Génération réservée");
    expect(markup).not.toContain('data-testid="csv-export"');
    expect(mocks.listReportGenerationHistory).not.toHaveBeenCalled();
  });

  it("resolves an action-specific generation page from the canonical action id", async () => {
    const markup = renderToStaticMarkup(
      await ReportsPage({
        searchParams: Promise.resolve({
          tab: "generation",
          actionId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(mocks.resolveSingleActionReportContract).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mocks.fetchCachedUnifiedActionContracts).not.toHaveBeenCalled();
    expect(markup).toContain('data-testid="report-generation"');
    expect(markup).toContain('data-single-action-id="11111111-1111-4111-8111-111111111111"');
    expect(markup).toContain('data-single-action-scope="Action canonique"');
  });

  it("passes only the public action projection to the browser document", async () => {
    mocks.resolveSingleActionReportContract.mockResolvedValueOnce({
      ...contract,
      createdByClerkId: "private-owner",
      metadata: {
        ...contract.metadata,
        preparationData: {
          actionTitle: "Action canonique",
          logisticsNotes: "NOTE LOGISTIQUE INTERNE",
          formalitiesContext: { publicSpace: "private-context" },
          routeTargetDistanceKm: 3,
        },
      },
    });

    const markup = renderToStaticMarkup(
      await ReportsPage({
        searchParams: Promise.resolve({
          tab: "generation",
          actionId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(markup).toContain("Action canonique");
    expect(markup).toContain("routeTargetDistanceKm");
    expect(markup).not.toContain("private-owner");
    expect(markup).not.toContain("NOTE LOGISTIQUE INTERNE");
    expect(markup).not.toContain("private-context");
  });

  it("shows a non-admissible state without falling back to the global report", async () => {
    mocks.resolveSingleActionReportContract.mockRejectedValueOnce(
      new mocks.SingleActionReportTargetUnavailableError("not eligible"),
    );

    const markup = renderToStaticMarkup(
      await ReportsPage({
        searchParams: Promise.resolve({
          tab: "generation",
          actionId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(markup).toContain('data-testid="single-action-report-unavailable"');
    expect(markup).toContain("Action non admissible");
    expect(mocks.fetchCachedUnifiedActionContracts).not.toHaveBeenCalled();
  });

  it("propagates a truncated generation dataset to the report document", async () => {
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.toProfile.mockReturnValue("admin");
    mocks.isAdminLikeProfile.mockReturnValue(true);
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValue({
      items: [contract],
      isTruncated: true,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    try {
      const markup = renderToStaticMarkup(
        await ReportsPage({ searchParams: Promise.resolve({ tab: "generation" }) }),
      );

      expect(markup).toContain('data-testid="report-generation"');
      expect(markup).toContain('data-truncated="true"');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("shows a real analysis outage instead of an empty zero model", async () => {
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.toProfile.mockReturnValue("admin");
    mocks.isAdminLikeProfile.mockReturnValue(true);
    mocks.loadPilotageOverview.mockRejectedValue(new Error("Supabase unavailable"));

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "pilotage", detail: "1" }) }));

    expect(markup).toContain('data-active-tab="analysis"');
    expect(markup).toContain("Analyse temporairement indisponible");
    expect(markup).not.toContain('data-testid="reports-analysis-dashboard"');
    expect(markup).not.toContain('data-testid="csv-export"');
    expect(mocks.computeReportModel).not.toHaveBeenCalled();
  });

  it("renders all authenticated history in the files tab", async () => {
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.toProfile.mockReturnValue("admin");
    mocks.isAdminLikeProfile.mockReturnValue(true);
    mocks.listReportGenerationHistoryPage.mockResolvedValueOnce({
      rows: [{ id: "generation-1", report: "Rapport Paris", period: "Six mois", perimeter: "Global", detail: "Par défaut", generatedAt: "27/08/2026 12:30", theme: "scientific" }],
      page: 1,
      pageSize: 12,
      total: 13,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    const markup = renderToStaticMarkup(
      await ReportsPage({ searchParams: Promise.resolve({ tab: "files" }) }),
    );

    expect(markup).toContain('data-testid="reports-files"');
    expect(markup).toContain("Rapport Paris");
    expect(markup).toContain("Mes fichiers");
    expect(mocks.listReportGenerationHistoryPage).toHaveBeenCalledWith("user-1", { page: 1, pageSize: 12 });
  });

  it("loads an owner-scoped historical configuration before rendering generation", async () => {
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValue({
      items: [contract],
      isTruncated: false,
      sourceHealth: { partial: false, failedSources: [], availableSources: ["actions"], warnings: [] },
    });
    mocks.getReportGenerationSnapshotById.mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      filename: "rapport_reporting_six_months.pdf",
      generatedAt: "2026-08-27T10:30:00.000Z",
      scopeKind: "global",
      scopeValue: "",
      scopeLabel: "Global",
      detailLevel: "default",
      modules: { dataAndCartography: true, transparencyAndMethods: false, rawData: true, detailedFiles: false },
      theme: "scientific",
      snapshot: {
        title: "Rapport repris",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "Global",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      },
    });

    const markup = renderToStaticMarkup(await ReportsPage({
      searchParams: Promise.resolve({
        tab: "generation",
        resumeId: "11111111-1111-4111-8111-111111111111",
      }),
    }));

    expect(markup).toContain('data-testid="report-generation"');
    expect(markup).toContain('data-resume-period="six_months"');
    expect(markup).toContain('data-resume-theme="scientific"');
    expect(mocks.getReportGenerationSnapshotById).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "user-1",
    );
  });

  it("reuses the public historical single-action contract without loading the global corpus", async () => {
    const actionId = "22222222-2222-4222-8222-222222222222";
    mocks.getReportGenerationSnapshotById.mockResolvedValueOnce({
      id: "33333333-3333-4333-8333-333333333333",
      filename: "rapport_action.pdf",
      generatedAt: "2026-08-27T10:30:00.000Z",
      scopeKind: "single_action",
      scopeValue: actionId,
      scopeLabel: "Action historique",
      detailLevel: "default",
      modules: { dataAndCartography: true, transparencyAndMethods: false, rawData: true, detailedFiles: false },
      theme: "scientific",
      snapshot: {
        title: "Rapport mono-action repris",
        rubrique: "reporting",
        periode: "six_months",
        organizationType: "single_action",
        data: { generatedAt: "2026-08-27T10:30:00.000Z" },
      },
    });
    mocks.resolveSingleActionReportContract.mockResolvedValueOnce({
      ...contract,
      id: actionId,
      createdByClerkId: "private-owner",
      metadata: {
        ...contract.metadata,
        preparationData: {
          actionTitle: "Action historique",
          logisticsNotes: "NOTE LOGISTIQUE INTERNE",
          formalitiesContext: { publicSpace: "private-context" },
          routeTargetDistanceKm: 3,
        },
      },
    });
    mocks.getSingleActionReportScopeLabel.mockReturnValueOnce("Action historique");
    mocks.fetchCachedUnifiedActionContracts.mockRejectedValueOnce(new Error("global corpus unavailable"));

    const markup = renderToStaticMarkup(await ReportsPage({
      searchParams: Promise.resolve({
        tab: "generation",
        resumeId: "33333333-3333-4333-8333-333333333333",
      }),
    }));

    expect(markup).toContain('data-testid="report-generation"');
    expect(markup).toContain(`data-single-action-id="${actionId}"`);
    expect(markup).toContain('data-single-action-scope="Action historique"');
    expect(markup).toContain("routeTargetDistanceKm");
    expect(markup).not.toContain("private-owner");
    expect(markup).not.toContain("NOTE LOGISTIQUE INTERNE");
    expect(markup).not.toContain("private-context");
    expect(mocks.fetchCachedUnifiedActionContracts).not.toHaveBeenCalled();
    expect(mocks.resolveSingleActionReportContract).toHaveBeenCalledWith(actionId);
  });

  it("blocks an unavailable historical single action without substituting the global report", async () => {
    const actionId = "44444444-4444-4444-8444-444444444444";
    mocks.getReportGenerationSnapshotById.mockResolvedValueOnce({
      id: "55555555-5555-4555-8555-555555555555",
      filename: "rapport_action.pdf",
      generatedAt: "2026-08-27T10:30:00.000Z",
      scopeKind: "single_action",
      scopeValue: actionId,
      scopeLabel: "Action historique",
      detailLevel: "default",
      modules: {},
      theme: "impact",
      snapshot: { title: "Rapport mono-action", rubrique: "reporting", periode: "six_months", data: {} },
    });
    mocks.resolveSingleActionReportContract.mockRejectedValueOnce(
      new mocks.SingleActionReportTargetUnavailableError("no longer admissible"),
    );

    const markup = renderToStaticMarkup(await ReportsPage({
      searchParams: Promise.resolve({
        tab: "generation",
        resumeId: "55555555-5555-4555-8555-555555555555",
      }),
    }));

    expect(markup).toContain("Génération indisponible");
    expect(markup).not.toContain(`data-single-action-id="${actionId}"`);
    expect(mocks.fetchCachedUnifiedActionContracts).not.toHaveBeenCalled();
  });
});
