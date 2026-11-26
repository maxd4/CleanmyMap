import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getServerLocale: vi.fn(),
  loadAccountCompletionGateState: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  loadAdminSources: vi.fn(),
  loadAdminInboxSource: vi.fn(),
  loadAdminAuditSource: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));
vi.mock("@/lib/server-preferences", () => ({
  getServerLocale: mocks.getServerLocale,
}));
vi.mock("@/lib/auth/account-completion-gate", () => ({
  loadAccountCompletionGateState: mocks.loadAccountCompletionGateState,
}));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));
vi.mock("@/lib/admin/admin-dashboard-contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/admin-dashboard-contract")>();
  return {
    ...actual,
    loadAdminSources: mocks.loadAdminSources,
    loadAdminInboxSource: mocks.loadAdminInboxSource,
    loadAdminAuditSource: mocks.loadAdminAuditSource,
  };
});
vi.mock("@/components/account/account-completion-gate", () => ({
  AccountCompletionGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock("@/components/ui/admin-access-state", () => ({
  AdminAccessState: ({ authUnavailable }: { authUnavailable?: boolean }) =>
    React.createElement("div", { "data-testid": authUnavailable ? "auth-unavailable" : "access-denied" }),
}));
vi.mock("@/components/admin/admin-max-tools", () => ({
  AdminMaxTools: () => React.createElement("div", { "data-testid": "admin-max-tools" }),
}));
vi.mock("@/components/admin/admin-cockpit-inbox", () => ({
  AdminCockpitInbox: () => React.createElement("div", { "data-testid": "admin-inbox" }),
}));
vi.mock("@/components/admin/admin-operations-audit-panel", () => ({
  AdminOperationsAuditPanel: () => React.createElement("div", { "data-testid": "admin-audit" }),
}));
vi.mock("@/components/reports/actions-report-panel", () => ({
  ActionsReportPanel: () => React.createElement("div", { "data-testid": "admin-moderation" }),
}));
vi.mock("@/components/admin/admin-cockpit-legacy-anchor", () => ({
  AdminCockpitLegacyAnchor: () => null,
}));

import AdminPage from "./page";

const emptySources = {
  actions: { status: "available", data: { items: [], count: 0 } },
  groupJoin: { status: "available", data: { count: 0 } },
  signalements: { status: "available", data: { items: [], count: 0 } },
  creatorInbox: { status: "available", data: { items: [], hasMore: false, nextCursor: null } },
  publishedEntries: { status: "available", data: [] },
  audit: { status: "available", data: [] },
};

describe("/admin selective loading and role boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({ userId: "u-1", clerkReachable: true });
    mocks.getServerLocale.mockResolvedValue("fr");
    mocks.loadAccountCompletionGateState.mockResolvedValue(null);
    mocks.getCurrentUserIdentity.mockResolvedValue({
      userId: "u-1",
      role: "admin",
      activeRole: "admin",
    });
    mocks.loadAdminSources.mockResolvedValue(emptySources);
    mocks.loadAdminInboxSource.mockResolvedValue(emptySources.creatorInbox);
    mocks.loadAdminAuditSource.mockResolvedValue(emptySources.audit);
  });

  it("executes no admin loader when unauthenticated or non-admin", async () => {
    mocks.getSafeAuthSession.mockResolvedValueOnce({ userId: null, clerkReachable: true });
    const anonMarkup = renderToStaticMarkup(await AdminPage({}));
    expect(anonMarkup).toContain('data-testid="access-denied"');

    mocks.getCurrentUserIdentity.mockResolvedValueOnce({
      userId: "u-1",
      role: "coordinateur",
      activeRole: "coordinateur",
    });
    const coordMarkup = renderToStaticMarkup(await AdminPage({}));
    expect(coordMarkup).toContain('data-testid="access-denied"');

    expect(mocks.loadAdminSources).not.toHaveBeenCalled();
    expect(mocks.loadAdminInboxSource).not.toHaveBeenCalled();
    expect(mocks.loadAdminAuditSource).not.toHaveBeenCalled();
  });

  it("loads only the selected tab source on /admin", async () => {
    await AdminPage({ searchParams: Promise.resolve({ tab: "summary" }) });
    expect(mocks.loadAdminSources).toHaveBeenCalledTimes(1);
    expect(mocks.loadAdminInboxSource).not.toHaveBeenCalled();
    expect(mocks.loadAdminAuditSource).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const inboxMarkup = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({ tab: "inbox" }) }),
    );
    expect(inboxMarkup).toContain('data-testid="admin-inbox"');
    expect(mocks.loadAdminInboxSource).toHaveBeenCalledTimes(1);
    expect(mocks.loadAdminSources).not.toHaveBeenCalled();
    expect(mocks.loadAdminAuditSource).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const auditMarkup = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({ tab: "audit" }) }),
    );
    expect(auditMarkup).toContain('data-testid="admin-audit"');
    expect(mocks.loadAdminAuditSource).toHaveBeenCalledTimes(1);
    expect(mocks.loadAdminSources).not.toHaveBeenCalled();
    expect(mocks.loadAdminInboxSource).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const modMarkup = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({ tab: "moderation" }) }),
    );
    expect(modMarkup).toContain('data-testid="admin-moderation"');
    expect(mocks.loadAdminSources).not.toHaveBeenCalled();
    expect(mocks.loadAdminInboxSource).not.toHaveBeenCalled();
    expect(mocks.loadAdminAuditSource).not.toHaveBeenCalled();
  });

  it("forbids advanced tab for admin and allows it only for max", async () => {
    const adminMarkup = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({ tab: "advanced" }) }),
    );
    expect(adminMarkup).not.toContain('data-testid="admin-max-tools"');
    expect(adminMarkup).not.toContain("Administration avancée");

    mocks.getCurrentUserIdentity.mockResolvedValueOnce({
      userId: "u-max",
      role: "max",
      activeRole: "max",
    });
    const maxMarkup = renderToStaticMarkup(
      await AdminPage({ searchParams: Promise.resolve({ tab: "advanced" }) }),
    );
    expect(maxMarkup).toContain('data-testid="admin-max-tools"');
    expect(maxMarkup).toContain("Administration avancée");
  });
});
