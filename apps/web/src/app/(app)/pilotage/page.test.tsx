import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  getCurrentUserActiveRole: vi.fn(),
  getCurrentUserEffectiveAccess: vi.fn(),
  toProfile: vi.fn(),
  loadPilotageOverview: vi.fn(),
  loadPilotageCommunityOperations: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserActiveRole: mocks.getCurrentUserActiveRole,
  getCurrentUserEffectiveAccess: mocks.getCurrentUserEffectiveAccess,
}));

vi.mock("@/lib/profiles", () => ({
  toProfile: mocks.toProfile,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  loadPilotageOverview: mocks.loadPilotageOverview,
}));

vi.mock("@/lib/pilotage/community-operations", () => ({
  loadPilotageCommunityOperations: mocks.loadPilotageCommunityOperations,
}));

vi.mock("@/components/pilotage/pilotage-access-screen", () => ({
  PilotageLockedPage: () => React.createElement("div", null, "locked"),
  PilotageRestrictedPage: () => React.createElement("div", null, "restricted"),
  PilotageOverviewPage: ({
    communityOperations,
    communityOperationsState,
    communityOperationsRetryHref,
  }: {
    communityOperations: unknown;
    communityOperationsState: string;
    communityOperationsRetryHref: string;
  }) =>
    React.createElement(
      "div",
      {
        "data-community-operations": communityOperations ? "loaded" : "not-loaded",
        "data-community-operations-state": communityOperationsState,
        "data-community-operations-retry": communityOperationsRetryHref,
      },
      "overview",
    ),
}));

import PilotageAccessPage from "./page";

const contract = { id: "organized-action-1" };
const overview = { contracts: [contract] };

describe("/pilotage detail loading contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "user-1", clerkReachable: true });
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.getCurrentUserActiveRole.mockResolvedValue("coordinateur");
    mocks.getCurrentUserEffectiveAccess.mockResolvedValue({ canAccessPilotage: true });
    mocks.toProfile.mockReturnValue("coordinateur");
    mocks.loadPilotageOverview.mockResolvedValue(overview);
    mocks.loadPilotageCommunityOperations.mockResolvedValue({
      availability: "available",
      staffingPlan: {},
      reminders: [],
      postEventLoop: {},
    });
  });

  it("keeps detailed community operations unloaded on the initial overview", async () => {
    const markup = renderToStaticMarkup(
      await PilotageAccessPage({ searchParams: Promise.resolve({}) }),
    );

    expect(markup).toContain('data-community-operations="not-loaded"');
    expect(markup).toContain('data-community-operations-state="NOT_REQUESTED"');
    expect(mocks.loadPilotageOverview).toHaveBeenCalledWith({
      periodDays: 30,
      limit: 1800,
      scope: { kind: "organized", userId: "user-1" },
    });
    expect(mocks.loadPilotageCommunityOperations).not.toHaveBeenCalled();
  });

  it("loads detailed operations only for the explicit URL state", async () => {
    const markup = renderToStaticMarkup(
      await PilotageAccessPage({ searchParams: Promise.resolve({ operations: "1" }) }),
    );

    expect(markup).toContain('data-community-operations="loaded"');
    expect(mocks.loadPilotageCommunityOperations).toHaveBeenCalledWith([contract], "user-1");
    expect(markup).toContain('data-community-operations-state="AVAILABLE"');
  });

  it("exposes an unavailable state and a changing retry URL after a detail failure", async () => {
    mocks.loadPilotageCommunityOperations.mockRejectedValueOnce(new Error("temporary failure"));

    const markup = renderToStaticMarkup(
      await PilotageAccessPage({ searchParams: Promise.resolve({ operations: "1", retry: "4" }) }),
    );

    expect(markup).toContain('data-community-operations-state="UNAVAILABLE"');
    expect(markup).toContain('data-community-operations-retry="/pilotage?operations=1&amp;retry=5"');
  });

  it("does not read overview or operations for an unauthorized visitor", async () => {
    mocks.getCurrentUserEffectiveAccess.mockResolvedValue({ canAccessPilotage: false });

    const markup = renderToStaticMarkup(
      await PilotageAccessPage({ searchParams: Promise.resolve({ operations: "1" }) }),
    );

    expect(markup).toContain("restricted");
    expect(mocks.loadPilotageOverview).not.toHaveBeenCalled();
    expect(mocks.loadPilotageCommunityOperations).not.toHaveBeenCalled();
  });
});
