import { describe, expect, it, vi } from "vitest";
import { awardPointsOnce } from "./system";

function createLedgerChain(existing: boolean) {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({
    data: existing ? { id: "existing" } : null,
    error: null,
  }));
  return chain;
}

describe("awardPointsOnce", () => {
  it("skips the insert when the same source already exists", async () => {
    const insert = vi.fn();
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "points_ledger") {
          return {
            select: () => createLedgerChain(true),
            insert,
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as any;

    const result = await awardPointsOnce(supabase, {
      userId: "user-1",
      xpEarned: 1,
      sourceEvent: "action_validated_form",
      sourceId: "action-1",
      reason: "test",
    });

    expect(result).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a ledger entry when no matching source exists", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "points_ledger") {
          return {
            select: () => createLedgerChain(false),
            insert,
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as any;

    const result = await awardPointsOnce(supabase, {
      userId: "user-1",
      xpEarned: 1,
      sourceEvent: "action_validated_form",
      sourceId: "action-1",
      reason: "test",
    });

    expect(result).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
