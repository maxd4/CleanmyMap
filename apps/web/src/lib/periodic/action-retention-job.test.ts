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

describe("action retention job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("conserve le dry-run agrégé et ne publie aucun résultat comme donnée réelle", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [row("would_delete", "draft-1"), row("blocked", "draft-2")],
      error: null,
    });
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
      cutoff: "2026-02-28T03:20:00.000Z",
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("purge_inactive_action_records", expect.objectContaining({
      p_dry_run: true,
      p_batch_size: 12,
      p_expected_action_ids: null,
    }));
  });

  it("valide explicitement la liste dry-run avant la suppression et re-émet les conflits", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [row("would_delete", "draft-1")], error: null })
      .mockResolvedValueOnce({ data: [row("deleted", "draft-1"), row("conflict", "draft-2")], error: null });
    getClient.mockReturnValue({ rpc } as never);

    await expect(runActionRetentionJob({
      now: new Date("2026-02-15T03:20:00.000Z"),
      batchSize: 4,
    })).resolves.toMatchObject({
      status: "completed",
      wouldDeleteCount: 1,
      deletedCount: 1,
      conflictCount: 1,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "purge_inactive_action_records", expect.objectContaining({
      p_dry_run: false,
      p_expected_action_ids: ["draft-1"],
    }));
  });
});
