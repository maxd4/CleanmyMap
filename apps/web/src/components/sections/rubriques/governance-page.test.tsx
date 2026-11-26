import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  loadPilotageOverview: vi.fn(),
  getServerLocale: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({
    isAuthenticated,
    authUnavailable,
    signInHref,
  }: {
    isAuthenticated: boolean;
    authUnavailable?: boolean;
    signInHref?: string;
  }) =>
    React.createElement("div", {
      "data-testid": isAuthenticated ? "auth-ok" : "signin-gate",
      "data-auth-unavailable": String(Boolean(authUnavailable)),
      "data-signin-href": signInHref ?? "",
    }),
}));

vi.mock("@/components/account/role-profile-switcher", () => ({
  RoleProfileSwitcher: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "role-switcher" }, title),
}));

vi.mock("@/components/pilotage/thirty-seconds-summary", () => ({
  ThirtySecondsSummary: ({ locale }: { locale: string }) =>
    React.createElement("div", { "data-testid": "thirty-seconds", "data-locale": locale }),
}));

import { GovernancePage } from "./governance-page";

const validOverview = {
  generatedAt: "2026-10-01T10:00:00.000Z",
  periodDays: 30,
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
      approvedActions: 5,
    },
  },
  zones: [
    {
      area: "Paris 10e",
      normalizedScore: 7.4,
      urgency: "medium",
      currentActions: 5,
      currentWasteCoverageRate: 80,
      currentKg: 42,
      justification: "Suivi actif",
      recommendedAction: "Maintenir",
    },
  ],
  methods: [],
  summary: {
    kpis: [],
    alert: { severity: "low", title: "RAS", detail: "Ras" },
    recommendedAction: {
      href: "/actions/map",
      label: "Maintenir la couverture",
      reason: "Actions régulières",
    },
  },
};

describe("GovernancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    mocks.getCurrentUserIdentity.mockResolvedValue({ role: "elu", activeRole: "elu" });
    mocks.loadPilotageOverview.mockResolvedValue(validOverview);
  });

  it("distinguishes clerk unavailability and preserves query params on sign-in redirect", async () => {
    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: false });
    const unavailableMarkup = renderToStaticMarkup(
      await GovernancePage({ searchParams: { tab: "zones" } }),
    );
    expect(unavailableMarkup).toContain('data-auth-unavailable="true"');
    expect(unavailableMarkup).toContain('data-signin-href="/sign-in?redirect_url=%2Fsections%2Felus%3Ftab%3Dzones"');

    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: true });
    const anonMarkup = renderToStaticMarkup(
      await GovernancePage({ searchParams: { tab: "zones" } }),
    );
    expect(anonMarkup).toContain('data-auth-unavailable="false"');
    expect(anonMarkup).toContain('data-signin-href="/sign-in?redirect_url=%2Fsections%2Felus%3Ftab%3Dzones"');
  });

  it("hides 0 actions and renders retry when actions source failed", async () => {
    mocks.loadPilotageOverview.mockResolvedValueOnce({
      ...validOverview,
      comparison: { current: { approvedActions: 0 } },
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

    const markup = renderToStaticMarkup(await GovernancePage({ searchParams: {} }));

    expect(markup).toContain("Données momentanément indisponibles.");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("0 actions publiques terminées");
    expect(markup).not.toContain('data-testid="thirty-seconds"');
  });

  it("blocks institutional overview for benevole and localizes EN when authorized", async () => {
    mocks.getCurrentUserIdentity.mockResolvedValueOnce({ role: "benevole", activeRole: "benevole" });
    const deniedMarkup = renderToStaticMarkup(await GovernancePage({ searchParams: {} }));
    expect(deniedMarkup).toContain("Accès selon votre rôle");
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();

    mocks.getServerLocale.mockResolvedValueOnce("en");
    const enMarkup = renderToStaticMarkup(await GovernancePage({ searchParams: {} }));
    expect(enMarkup).toContain("Governance");
    expect(enMarkup).toContain("Decision support on completed public actions.");
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({
      periodDays: 30,
      limit: 1500,
      publishedCompletedOnly: true,
    });
  });
});
