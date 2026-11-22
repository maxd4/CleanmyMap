import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runActionRetentionJob } from "./action-retention-job";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

const getClient = vi.mocked(getSupabaseServerClient);

function row(outcome: "would_delete" | "deleted" | "blocked" | "conflict" | "failed", id: string) {
  return {
    action_id: id,
    outcome,
    reason: outcome === "blocked" ? "dependencies_present" : "eligible_after_recheck",
    last_activity_at: "2026-01-01T03:20:00.000Z",
  };
}

function accessibilityRetention(scannedCount: number, deletedCount: number) {
  return { data: [{ scanned_count: scannedCount, deleted_count: deletedCount }], error: null };
}

function missingAccessibilityRetentionRpc() {
  return {
    data: null,
    error: {
      code: "PGRST202",
      message: "Could not find the function public.purge_expired_action_accessibility_support_requests(p_as_of, p_dry_run, p_batch_size) in the schema cache",
    },
  };
}

describe("action retention job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conserve le dry-run agrégé et ne publie aucun résultat comme donnée réelle", async () => {
    const rpc = vi.fn((name: string) => name === "purge_expired_action_accessibility_support_requests"
      ? Promise.resolve(accessibilityRetention(3, 0))
      : Promise.resolve({ data: [row("would_delete", "draft-1"), row("blocked", "draft-2")], error: null }));
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob({
      now: new Date("2026-03-31T03:20:00.000Z"),
      dryRun: true,
      batchSize: 12,
    })).resolves.toMatchObject({
      status: "dry_run",
      scannedCount: 2,
      wouldDeleteCount: 1,
      deletedCount: 0,
      blockedCount: 1,
      expiredAccessibilityRequestsStatus: "available",
      expiredAccessibilityRequestsScanned: 3,
      expiredAccessibilityRequestsDeleted: 0,
      cutoff: "2026-02-28T03:20:00.000Z",
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("purge_inactive_action_records", expect.objectContaining({
      p_dry_run: true,
      p_batch_size: 12,
      p_expected_action_ids: null,
    }));
    expect(rpc).toHaveBeenCalledWith("purge_expired_action_accessibility_support_requests", expect.objectContaining({ p_dry_run: true }));
  });

  it("valide explicitement la liste dry-run avant la suppression et re-émet les conflits", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: [row("deleted", "draft-1"), row("conflict", "draft-2")], error: null })
      .mockResolvedValueOnce(accessibilityRetention(1, 0))
      .mockResolvedValueOnce(accessibilityRetention(1, 1));
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob({
      now: new Date("2026-02-15T03:20:00.000Z"),
      batchSize: 4,
    })).resolves.toMatchObject({
      status: "completed",
      wouldDeleteCount: 1,
      deletedCount: 1,
      conflictCount: 1,
      expiredAccessibilityRequestsScanned: 1,
      expiredAccessibilityRequestsDeleted: 1,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "purge_inactive_action_records", expect.objectContaining({
      p_dry_run: false,
      p_expected_action_ids: ["draft-1"],
    }));
    expect(rpc).toHaveBeenNthCalledWith(4, "purge_expired_action_accessibility_support_requests", expect.objectContaining({ p_dry_run: false }));
  });

  it("préserve la purge historique quand le schéma lié ne possède pas encore la RPC privée", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: [row("deleted", "draft-1")], error: null })
      .mockResolvedValueOnce(missingAccessibilityRetentionRpc());
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob({ now: new Date("2026-02-15T03:20:00.000Z") })).resolves.toMatchObject({
      status: "completed",
      deletedCount: 1,
      expiredAccessibilityRequestsStatus: "rpc_unavailable",
      expiredAccessibilityRequestsScanned: 0,
      expiredAccessibilityRequestsDeleted: 0,
    });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "purge_inactive_action_records",
      "purge_inactive_action_records",
      "purge_expired_action_accessibility_support_requests",
    ]);
  });

  it("expose l'absence pendant un dry-run sans inventer un compte nul disponible", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce(missingAccessibilityRetentionRpc());
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob({ dryRun: true })).resolves.toMatchObject({
      status: "dry_run",
      deletedCount: 0,
      expiredAccessibilityRequestsStatus: "rpc_unavailable",
      expiredAccessibilityRequestsScanned: 0,
      expiredAccessibilityRequestsDeleted: 0,
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).not.toHaveBeenCalledWith("purge_inactive_action_records", expect.objectContaining({ p_dry_run: false }));
  });

  it.each([
    {
      label: "permission SQLSTATE",
      error: { code: "42501", message: "action_accessibility_support_server_only" },
      code: "42501",
    },
    {
      label: "parameter SQLSTATE",
      error: { code: "22023", message: "action_accessibility_support_invalid_purge_parameters" },
      code: "22023",
    },
    {
      label: "missing unrelated RPC",
      error: { code: "PGRST202", message: "Could not find the function public.other_rpc() in the schema cache" },
      code: "PGRST202",
    },
    {
      label: "same RPC without missing-function evidence",
      error: { code: "PGRST202", message: "The schema cache is stale for public.purge_expired_action_accessibility_support_requests" },
      code: "PGRST202",
    },
    {
      label: "PostgreSQL undefined-function error",
      error: { code: "42883", message: "function public.purge_expired_action_accessibility_support_requests does not exist" },
      code: "42883",
    },
  ])("ne masque pas une erreur $label", async ({ error, code }) => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: [row("deleted", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: null, error });
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob()).rejects.toMatchObject({ code });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "purge_inactive_action_records",
      "purge_inactive_action_records",
      "purge_expired_action_accessibility_support_requests",
    ]);
  });

  it("ne masque pas une erreur SQL de la purge historique", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { code: "42501", message: "historical_retention_permission_denied" },
    });
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob()).rejects.toMatchObject({ code: "42501" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("purge_inactive_action_records", expect.objectContaining({ p_dry_run: true }));
  });

  it.each([
    { label: "RPC privée sans ligne", data: null },
    { label: "compteurs privés non numériques", data: [{ scanned_count: "2", deleted_count: 0 }] },
  ])("refuse une réponse invalide de $label", async ({ data }) => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data, error: null });
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob()).rejects.toThrow("La réponse de purge des demandes privées est invalide.");
  });

  it("refuse les lignes invalides de la RPC historique", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({
      data: [{ action_id: "draft-1", outcome: "unknown", reason: "x", last_activity_at: "2026-01-01" }],
      error: null,
    });
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob()).rejects.toThrow("La réponse de rétention est invalide.");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("purge les demandes privées après migration et conserve les résultats disponibles", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: [row("deleted", "draft-1")], error: null })
      .mockResolvedValueOnce(accessibilityRetention(2, 0))
      .mockResolvedValueOnce(accessibilityRetention(2, 2));
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob()).resolves.toMatchObject({
      status: "completed",
      deletedCount: 1,
      expiredAccessibilityRequestsStatus: "available",
      expiredAccessibilityRequestsScanned: 2,
      expiredAccessibilityRequestsDeleted: 2,
    });
    expect(rpc).toHaveBeenNthCalledWith(4, "purge_expired_action_accessibility_support_requests", expect.objectContaining({
      p_dry_run: false,
      p_batch_size: 100,
    }));
  });
});
