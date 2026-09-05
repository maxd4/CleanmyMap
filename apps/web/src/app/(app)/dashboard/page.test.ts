import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  getServerDisplayMode: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  getCurrentUserRoleLabel: vi.fn(),
  loadPilotageOverview: vi.fn(),
  fetchCachedReferralSummary: vi.fn(),
  loadUserLevelRankingSummary: vi.fn(),
  isAdminLikeProfile: vi.fn(),
  getTranslation: vi.fn(),
}));

const completeAccountState = {
  requirement: { requiresSetup: false, reason: null },
  currentProfile: "benevole",
  role: "benevole",
  clerkReachable: true,
  isLocalHost: true,
  initialArrondissement: null,
  initialLocationType: null,
};

const profileAction = {
  href: "/actions/new",
  label: { fr: "Déclarer une action", en: "Declare an action" },
  description: { fr: "Créer une déclaration", en: "Create a declaration" },
};

vi.mock("@/components/dashboard/dashboard-overview-section", () => ({
  DashboardOverviewSection: () =>
    React.createElement("div", { "data-testid": "dashboard-overview" }, "KPI"),
}));

vi.mock("@/components/dashboard/dashboard-entrance", () => ({
  DashboardEntrance: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dashboard-entrance" }, children),
}));

vi.mock("@/components/account/account-settings-section", () => ({
  AccountSettingsSection: () => React.createElement("div"),
}));


vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) =>
    React.createElement(
      "div",
      { "data-testid": isAuthenticated ? "authenticated-gate" : "signin-gate" },
      children,
    ),
}));

vi.mock("@/components/ui/family-rubrique-card", () => ({
  FamilyRubriqueCard: ({ children }: { children: React.ReactNode }) =>
    React.createElement("section", null, children),
}));

vi.mock("@/components/ui/identity-profile-banner", () => ({
  IdentityProfileBanner: ({ profile }: { profile: string }) =>
    React.createElement("div", { "data-testid": "profile-banner", "data-profile": profile }),
}));

vi.mock("@/components/navigation/role-primary-actions", () => ({
  RolePrimaryActions: () =>
    React.createElement(
      "nav",
      { "data-testid": "core-navigation" },
      React.createElement("a", { href: "/actions/new" }, "Déclarer"),
      React.createElement("a", { href: "/actions/history" }, "Historique"),
      React.createElement("a", { href: "/reports" }, "Rapports"),
    ),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement(href ? "a" : "button", { href }, children),
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ state, children }: { state: typeof completeAccountState; children: React.ReactNode }) =>
    state?.requirement?.requiresSetup
      ? React.createElement(
          "div",
          { "data-testid": "profile-completion-required" },
          "Profil incomplet",
        )
      : children,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) =>
    React.createElement("h1", null, title),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserRoleLabel: mocks.getCurrentUserRoleLabel,
}));

vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: mocks.loadAccountCompletionGateState,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerDisplayMode: mocks.getServerDisplayMode,
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/lib/i18n/server-translation", () => ({
  getTranslation: mocks.getTranslation,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/lib/gamification/referrals-cache", () => ({
  fetchCachedReferralSummary: mocks.fetchCachedReferralSummary,
}));

vi.mock("@/lib/gamification/progression-data", () => ({
  loadUserLevelRankingSummary: mocks.loadUserLevelRankingSummary,
}));

vi.mock("@/lib/profiles", () => ({
  getProfileLabel: vi.fn((profile: string) => profile),
  getProfilePrimaryAction: vi.fn(() => profileAction),
  getSwitchableProfiles: vi.fn(() => ["admin", "benevole"]),
  isAdminLikeProfile: mocks.isAdminLikeProfile,
  toProfile: vi.fn((role: string) => role),
}));

vi.mock("@/lib/ui/page-families", () => ({
  resolvePageFamily: vi.fn(() => ({ id: "accueil-pilotage" })),
}));

import DashboardPage from "./page";

describe("/dashboard page contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getServerDisplayMode.mockResolvedValue("sobre");
    mocks.getTranslation.mockReturnValue({ t: (key: string) => key });
    mocks.getCurrentUserRoleLabel.mockResolvedValue("benevole");
    mocks.loadAccountCompletionGateState.mockResolvedValue(completeAccountState);
    mocks.loadPilotageOverview.mockResolvedValue({
      summary: { kpis: [], recommendedAction: profileAction, alert: null },
    });
    mocks.fetchCachedReferralSummary.mockResolvedValue({
      invitedUsersCount: 2,
      badgeUnlocked: false,
      inviteUrl: "/invite/test",
    });
    mocks.loadUserLevelRankingSummary.mockResolvedValue({
      topRows: [],
      currentUserRow: null,
    });
    mocks.isAdminLikeProfile.mockImplementation((profile: string) => profile === "admin" || profile === "max");
  });

  it("covers the non-connected state without loading account data", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: null, clerkReachable: false });

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain('data-testid="signin-gate"');
    expect(markup).not.toContain('data-testid="dashboard-overview"');
    expect(mocks.loadAccountCompletionGateState).not.toHaveBeenCalled();
  });

  it("covers the incomplete profile state before exposing the dashboard", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    mocks.loadAccountCompletionGateState.mockResolvedValue({
      ...completeAccountState,
      requirement: { requiresSetup: true, reason: "missing_profile" },
    });

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain('data-testid="profile-completion-required"');
    expect(markup).toContain("Profil incomplet");
  });

  it("keeps declaration, history and reports navigation visible", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).toContain('href="/actions/new"');
    expect(markup).toContain('href="/actions/history"');
    expect(markup).toContain('href="/reports"');
  });

  it("keeps reporting and moderation workflows out of the dashboard", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "admin-1", clerkReachable: true });
    mocks.loadAccountCompletionGateState.mockResolvedValue({
      ...completeAccountState,
      currentProfile: "admin",
      role: "admin",
    });
    mocks.getCurrentUserRoleLabel.mockResolvedValue("admin");

    const markup = renderToStaticMarkup(await DashboardPage());

    expect(markup).not.toContain("admin-export-workflow");
    expect(markup).not.toContain("/api/reports/actions.csv");
    expect(markup).not.toContain("/api/reports/actions.json");
    expect(markup).not.toContain("territory-map");
  });
});
