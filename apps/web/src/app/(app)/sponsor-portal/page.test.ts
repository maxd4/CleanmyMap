import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  loadPilotageOverview: vi.fn(),
  getServerLocale: vi.fn(),
}));
const events = vi.hoisted(() => [] as string[]);

const completeAccountState = {
  requirement: { requiresSetup: false, reason: null },
  currentProfile: "entreprise",
  role: "entreprise",
  clerkReachable: true,
  initialArrondissement: null,
  initialLocationType: null,
};

const overview = {
  generatedAt: "2026-10-01T10:00:00.000Z",
  periodDays: 730,
  dataAvailability: {
    isTruncated: false,
    sourceHealth: {
      partial: false,
      failedSources: [] as string[],
      availableSources: ["actions"],
      warnings: [],
    },
  },
  comparison: {
    current: {
      approvedActions: 12,
      impactVolumeKg: 120,
      mobilizationCount: 18,
      totalDurationMinutes: 600,
      wasteKnownActions: 12,
      wasteCoverageRate: 66.7,
    },
  },
  contracts: [{ id: "contract-1" }],
  zones: [
    {
      area: "Paris",
      normalizedScore: 8.5,
      urgency: "high",
      currentActions: 12,
      currentWasteCoverageRate: 66.7,
      currentKg: 120,
      justification: "Zone prioritaire",
      recommendedAction: "Prioriser la zone",
    },
  ],
  methods: [],
};

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: mocks.loadAccountCompletionGateState,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({
    children,
    isAuthenticated,
    authUnavailable,
    signInHref,
  }: {
    children: React.ReactNode;
    isAuthenticated: boolean;
    authUnavailable?: boolean;
    signInHref?: string;
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": isAuthenticated ? "authenticated-gate" : "signin-gate",
        "data-auth-unavailable": String(Boolean(authUnavailable)),
        "data-signin-href": signInHref ?? "",
      },
      children,
    ),
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement(href ? "a" : "button", { href }, children),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title),
}));

vi.mock("@/components/pilotage/pilotage-cluster-panels", () => ({
  PilotageInsightCard: () => React.createElement("div", { "data-testid": "insight" }),
  PilotageMetricGrid: ({ metrics }: { metrics: Array<{ value: string }> }) =>
    React.createElement("div", { "data-testid": "metrics" }, metrics.map((metric) => metric.value).join("|")),
}));

vi.mock("@/components/pilotage/decision-cluster-section", () => ({
  DecisionClusterSection: () => React.createElement("div", { "data-testid": "decision-cluster" }),
}));

vi.mock("@/lib/ui/page-families", () => ({
  getPageFamilyById: vi.fn(() => ({ id: "accueil-pilotage" })),
}));

import SponsorPortalPage, { dynamic } from "./page";

describe("/sponsor-portal access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getSafeAuthSession.mockImplementation(async () => {
      events.push("auth");
      return { userId: "user-1", clerkReachable: true };
    });
    mocks.loadAccountCompletionGateState.mockImplementation(async () => {
      events.push("profile");
      return completeAccountState;
    });
    mocks.loadPilotageOverview.mockImplementation(async () => {
      events.push("overview");
      return overview;
    });
  });

  it("is explicitly dynamic so the protected page is not pre-rendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("does not load pilotage data for an unauthenticated visitor", async () => {
    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: false });

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain('data-testid="signin-gate"');
    expect(mocks.loadAccountCompletionGateState).not.toHaveBeenCalled();
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("does not let incomplete profile data block the authenticated portal", async () => {
    mocks.loadAccountCompletionGateState.mockResolvedValueOnce({
      ...completeAccountState,
      requirement: { requiresSetup: true, reason: "missing_profile" },
    });

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain("Valorisation de voirie estimée");
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({ periodDays: 730, limit: 5000, publishedCompletedOnly: true });
    expect(mocks.loadAccountCompletionGateState).toHaveBeenCalledWith({
      userId: "user-1",
      clerkReachable: true,
    });
    expect(events).toEqual(["auth", "overview"]);
  });

  it("loads the sponsor overview only after authentication and profile validation", async () => {
    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain("123,1 à 180 €");
    expect(markup).toContain("66,7 % des actions renseignées.");
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({ periodDays: 730, limit: 5000, publishedCompletedOnly: true });
    expect(events).toEqual(["auth", "profile", "overview"]);
  });

  it("keeps the authorized page renderable with partial metrics if pilotage is unavailable", async () => {
    mocks.loadPilotageOverview.mockRejectedValueOnce(new Error("Supabase unavailable"));

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain("Données d’impact momentanément indisponibles.");
    expect(markup).toContain("Réessayer");
    expect(events).toEqual(["auth", "profile"]);
  });

  it("distinguishes clerk unavailability and preserves return query on signInHref", async () => {
    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: false });
    const unavailableMarkup = renderToStaticMarkup(
      await SponsorPortalPage({ searchParams: Promise.resolve({ tab: "zones" }) }),
    );
    expect(unavailableMarkup).toContain('data-auth-unavailable="true"');
    expect(unavailableMarkup).toContain('data-signin-href="/sign-in?redirect_url=%2Fsponsor-portal%3Ftab%3Dzones"');

    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: true });
    const anonMarkup = renderToStaticMarkup(
      await SponsorPortalPage({ searchParams: Promise.resolve({ tab: "zones" }) }),
    );
    expect(anonMarkup).toContain('data-auth-unavailable="false"');
    expect(anonMarkup).toContain('data-signin-href="/sign-in?redirect_url=%2Fsponsor-portal%3Ftab%3Dzones"');
  });

  it("does not display zero participations or zero actions when the actions source failed", async () => {
    mocks.loadPilotageOverview.mockResolvedValueOnce({
      ...overview,
      comparison: {
        current: {
          approvedActions: 0,
          impactVolumeKg: 0,
          mobilizationCount: 0,
          totalDurationMinutes: 0,
          wasteKnownActions: 0,
          wasteCoverageRate: 0,
        },
      },
      dataAvailability: {
        isTruncated: false,
        sourceHealth: {
          partial: true,
          failedSources: ["actions"],
          availableSources: [],
          warnings: ["actions failed"],
        },
      },
    });

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain("Données d’impact momentanément indisponibles.");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("Participations déclarées");
  });

  it("localizes headings and metrics in English when locale is en", async () => {
    mocks.getServerLocale.mockResolvedValueOnce("en");

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain("Decision portal");
    expect(markup).toContain("Estimated street cleaning value");
    expect(markup).toContain("Declared participations");
  });
});
