import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const runExternalActionSyncMock = vi.hoisted(() => vi.fn());
const storeMock = vi.hoisted(() => ({
  listSubscriptions: vi.fn(),
  listSyncedActions: vi.fn(),
  listProposals: vi.fn(),
  suppressAction: vi.fn(),
  resolveProposal: vi.fn(),
}));

vi.mock("@/lib/authz", async () =>
  (await import("@/app/api/test-helpers")).createAdminAuthzModule(requireAdminAccessMock),
);
vi.mock("@/lib/http/auth-responses", async () =>
  (await import("@/app/api/test-helpers")).createAdminAuthResponseModule(),
);
vi.mock("@/lib/admin/audit/operation-audit", async () =>
  (await import("@/app/api/test-helpers")).createAdminAuditModule(appendAdminOperationAuditMock),
);
vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({})),
}));
vi.mock("@/lib/actions/external-sync/store", () => ({
  createSupabaseExternalActionSyncStore: vi.fn(() => storeMock),
}));
vi.mock("@/lib/actions/external-sync/engine", () => ({
  runExternalActionSync: runExternalActionSyncMock,
}));

import { GET, POST } from "./route";

describe("/api/admin/external-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    storeMock.listSubscriptions.mockResolvedValue([]);
    storeMock.listSyncedActions.mockResolvedValue([]);
    storeMock.listProposals.mockResolvedValue([]);
    runExternalActionSyncMock.mockResolvedValue({
      mode: "admin_sync_now",
      executedAt: "2026-11-26T12:00:00.000Z",
      created: 0,
      createdAndPublished: 1,
      updated: 0,
      published: 0,
      pendingReview: 0,
      unchanged: 0,
      suppressed: 0,
      proposals: 0,
      conflicts: 0,
      skippedPast: 0,
      disabledSources: 0,
      errors: 0,
      outcomes: [],
    });
  });

  it("rejects non-admin access on GET and POST with zero mutations", async () => {
    requireAdminAccessMock.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });

    const getRes = await GET();
    const postRes = await POST(
      new Request("http://localhost/api/admin/external-sync", {
        method: "POST",
        body: JSON.stringify({ action: "sync_now" }),
      }),
    );

    expect(getRes.status).toBe(403);
    expect(postRes.status).toBe(403);
    expect(runExternalActionSyncMock).not.toHaveBeenCalled();
    expect(storeMock.suppressAction).not.toHaveBeenCalled();
  });

  it("enforces rate limiting on POST", async () => {
    enforceRateLimitMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await POST(
      new Request("http://localhost/api/admin/external-sync", {
        method: "POST",
        body: JSON.stringify({ action: "sync_now" }),
      }),
    );

    expect(res.status).toBe(429);
    expect(runExternalActionSyncMock).not.toHaveBeenCalled();
  });

  it("runs admin_sync_now and records admin operation audit", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/external-sync", {
        method: "POST",
        body: JSON.stringify({ action: "sync_now" }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.createdAndPublished).toBe(1);
    expect(runExternalActionSyncMock).toHaveBeenCalledWith(
      { store: storeMock },
      expect.objectContaining({ mode: "admin_sync_now" }),
    );
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "external_action_sync",
        outcome: "success",
      }),
    );
  });

  it("handles administrative suppression and operation_conflict (409)", async () => {
    storeMock.suppressAction.mockResolvedValueOnce("operation_conflict");

    const res = await POST(
      new Request("http://localhost/api/admin/external-sync", {
        method: "POST",
        body: JSON.stringify({
          action: "suppress",
          actionId: "11111111-1111-4111-8111-111111111111",
          operationId: "op-dup",
          reason: "Suppression administrative",
        }),
      }),
    );

    expect(res.status).toBe(409);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "external_action_sync",
        outcome: "error",
      }),
    );
  });
});
