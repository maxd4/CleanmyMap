import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  isLocalHost: true,
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

vi.mock("@/components/reports/AnimatedImpactMetrics", () => ({
  AnimatedImpactMetrics: ({ kpis }: { kpis: unknown }) =>
    React.createElement("div", { "data-testid": "summary-kpis" }, JSON.stringify(kpis)),
}));

vi.mock("@/components/reports/deferred-reports-web-document", () => ({
  DeferredReportsWebDocument: ({ isTruncated }: { isTruncated?: boolean }) =>
    React.createElement(
      "section",
      { "data-testid": "report-generation", "data-truncated": isTruncated ? "true" : "false" },
      "Génération",
    ),
}));

vi.mock("@/components/reports/page-sections/reports-page-v2-layout", () => ({
  ReportsPageV2Layout: ({ activeTab, generationContent, pilotageContent }: {
    activeTab: string;
    generationContent?: React.ReactNode;
    pilotageContent?: React.ReactNode;
  }) =>
    React.createElement(
      "main",
      { "data-testid": "reports-layout", "data-active-tab": activeTab },
      activeTab === "generation" ? generationContent : pilotageContent,
    ),
}));

vi.mock("@/components/reports/analytics-cockpit", () => ({
  AnalyticsCockpit: () => React.createElement("div", { "data-testid": "analytics-cockpit" }),
}));

vi.mock("@/components/reports/reports-impact-readings-section", () => ({
  ReportsImpactReadingsSection: () => React.createElement("div", { "data-testid": "impact-readings" }),
}));

vi.mock("@/components/ui/navigation-grid", () => ({
  NavigationGrid: ({ items }: { items: Array<{ href: string; icon: string }> }) =>
    React.createElement(
      "nav",
      { "data-testid": "reports-navigation" },
      items.map((item) =>
        React.createElement("a", { key: item.href, href: item.href, "data-icon": item.icon }, item.href),
      ),
    ),
}));

vi.mock("@/components/ui/page-reading-template", () => ({
  PageReadingTemplate: ({ summary, primaryAction, secondaryAction, analysis }: {
    summary?: React.ReactNode;
    primaryAction: { href: string; label: string };
    secondaryAction?: { href: string; label: string };
    analysis: React.ReactNode;
  }) =>
    React.createElement(
      "section",
      { "data-testid": "reading-template" },
      React.createElement("a", { href: primaryAction.href }, primaryAction.label),
      secondaryAction ? React.createElement("a", { href: secondaryAction.href }, secondaryAction.label) : null,
      summary,
      analysis,
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
  AccountCompletionGate: ({ state, children }: { state: typeof completeAccountState; children: React.ReactNode }) =>
    state?.requirement?.requiresSetup
      ? React.createElement("div", { "data-testid": "profile-completion-required" }, "Profil incomplet")
      : children,
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

vi.mock("@/lib/actions/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: mocks.fetchCachedUnifiedActionContracts,
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
    mocks.loadCachedReportCommunityEvents.mockResolvedValue([]);
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
  });

  it("covers the non-connected state without loading reports", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: true });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('data-testid="signin-gate"');
    expect(markup).not.toContain('data-testid="reports-layout"');
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
  });

  it("keeps Clerk unavailability distinct from an anonymous visitor", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: false });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('data-testid="clerk-unavailable-gate"');
    expect(markup).not.toContain('data-testid="signin-gate"');
    expect(markup).toContain("Authentification temporairement indisponible");
  });

  it("covers incomplete profile before exposing reports content", async () => {
    mocks.loadAccountCompletionGateState.mockResolvedValue({
      ...completeAccountState,
      requirement: { requiresSetup: true, reason: "missing_profile" },
    });

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain('data-testid="profile-completion-required"');
    expect(markup).toContain("Profil incomplet");
  });

  it("loads the 90-day pilotage window and renders primary KPIs", async () => {
    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "pilotage" }) }));

    expect(markup).toContain('data-active-tab="pilotage"');
    expect(markup).toContain('data-testid="summary-kpis"');
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({ periodDays: 90, limit: 2200 });
    expect(markup).toContain("Objectifs et repères");
    expect(markup).toContain(
      "Ces valeurs de référence ne sont pas calculées à partir de la fenêtre du rapport.",
    );
    expect(markup).toContain("Objectif réduction déchets");
    expect(markup).toContain("Repère mobilisation");
    expect(markup).toContain("Repère précision GPS");
    expect(markup).toContain("Repère émissions évitées");
    expect(markup).toContain('href="/actions/new"');
    expect(markup).toContain('href="/actions/history"');
    expect(markup).toContain('data-icon="BarChart3"');
    expect(markup).toContain('data-icon="Info"');
    expect(markup).toContain('data-icon="Layers"');
    expect(markup).toContain('data-icon="DownloadCloud"');
  });

  it("keeps the generation tab permission-gated for a non-admin profile", async () => {
    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "generation" }) }));

    expect(markup).toContain('data-active-tab="generation"');
    expect(markup).toContain("Génération réservée");
    expect(markup).not.toContain('data-testid="csv-export"');
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

  it("exposes CSV export for an admin and preserves the empty-data fallback", async () => {
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");
    mocks.toProfile.mockReturnValue("admin");
    mocks.isAdminLikeProfile.mockReturnValue(true);
    mocks.loadPilotageOverview.mockRejectedValue(new Error("Supabase unavailable"));

    const markup = renderToStaticMarkup(await ReportsPage({ searchParams: Promise.resolve({ tab: "pilotage" }) }));

    expect(markup).toContain('data-testid="csv-export"');
    expect(markup).toContain('data-row-count="0"');
    expect(markup).toContain('data-testid="summary-kpis"');
    expect(markup).toContain("n/a");
  });
});
