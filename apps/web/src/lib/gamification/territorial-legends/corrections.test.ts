import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { invalidateTerritorialLegendHistory } from "./corrections";

describe("territorial legend historical corrections", () => {
  it("keeps an empty correction a no-op without calling the database", async () => {
    const rpc = vi.fn();
    const result = await invalidateTerritorialLegendHistory({ rpc } as unknown as SupabaseClient, {
      invalidatedOn: "2026-11-03",
    });
    expect(result).toEqual({
      invalidatedOn: "2026-11-03",
      invalidatedHoldPeriods: 0,
      invalidatedAwardProofs: 0,
      affectedUserIds: [],
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the service correction RPC and preserves its applied counts", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "applied", invalidatedHoldPeriods: 1, invalidatedAwardProofs: 2, affectedUserIds: ["user-1"] },
      error: null,
    });
    const result = await invalidateTerritorialLegendHistory({ rpc } as unknown as SupabaseClient, {
      holdPeriodIds: [4, 0, Number.NaN],
      proofIds: ["proof-1", "", "proof-2"],
      invalidatedOn: "2026-11-03",
    });
    expect(rpc).toHaveBeenCalledWith("invalidate_territorial_legend_history", {
      p_hold_period_ids: [4],
      p_proof_ids: ["proof-1", "proof-2"],
      p_invalidated_on: "2026-11-03",
    });
    expect(result.invalidatedAwardProofs).toBe(2);
    expect(result.affectedUserIds).toEqual(["user-1"]);
  });

  it("fails closed on malformed dates or an unapplied response", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: { status: "conflict" }, error: null }) } as unknown as SupabaseClient;
    await expect(invalidateTerritorialLegendHistory(client, {
      proofIds: ["proof-1"],
      invalidatedOn: "not-a-date",
    })).rejects.toThrow("Date civile invalide");
    await expect(invalidateTerritorialLegendHistory(client, {
      proofIds: ["proof-1"],
      invalidatedOn: "2026-11-03",
    })).rejects.toThrow("réponse invalide");
  });
});
