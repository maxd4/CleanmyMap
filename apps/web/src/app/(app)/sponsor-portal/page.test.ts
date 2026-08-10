import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  loadPilotageOverview: vi.fn(),
}));
const events = vi.hoisted(() => [] as string[]);

const completeAccountState = {
  requirement: { requiresSetup: false, reason: null },
  currentProfile: "entreprise",
  role: "entreprise",
  clerkReachable: true,
  isLocalHost: false,
  initialArrondissement: null,
  initialLocationType: null,
};

const overview = {
  comparison: {
    current: {
      impactVolumeKg: 120,
      mobilizationCount: 18,
    },
  },
  contracts: [{ id: "contract-1" }],
  zones: [
    {
      area: "Paris",
      normalizedScore: 8.5,
      urgency: "high",
      recommendedAction: "Prioriser la zone",
    },
  ],
};

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
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
  }: {
    children: React.ReactNode;
    isAuthenticated: boolean;
  }) =>
    React.createElement(
      "div",
      { "data-testid": isAuthenticated ? "authenticated-gate" : "signin-gate" },
      children,
    ),
}));

vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({
    state,
    children,
  }: {
    state: typeof completeAccountState | null;
    children: React.ReactNode;
  }) =>
    state?.requirement.requiresSetup
      ? React.createElement("div", { "data-testid": "profile-completion-required" }, "Profil incomplet")
      : children,
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ href, children }: { href?: string; children: React.ReactNode }) =>
    React.createElement(href ? "a" : "button", { href }, children),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => React.createElement("h1", null, title),
  PageHeaderBadge: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
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

  it("stops at the profile gate before loading privileged data", async () => {
    mocks.loadAccountCompletionGateState.mockResolvedValueOnce({
      ...completeAccountState,
      requirement: { requiresSetup: true, reason: "missing_profile" },
    });

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain('data-testid="profile-completion-required"');
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
    expect(events).toEqual(["auth"]);
  });

  it("loads the sponsor overview only after authentication and profile validation", async () => {
    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain('data-testid="metrics"');
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({ periodDays: 730, limit: 5000 });
    expect(events).toEqual(["auth", "profile", "overview"]);
  });

  it("keeps the authorized page renderable with partial metrics if pilotage is unavailable", async () => {
    mocks.loadPilotageOverview.mockRejectedValueOnce(new Error("Supabase unavailable"));

    const markup = renderToStaticMarkup(await SponsorPortalPage());

    expect(markup).toContain('data-testid="metrics"');
    expect(markup).toContain("n/a");
    expect(events).toEqual(["auth", "profile"]);
  });
});
