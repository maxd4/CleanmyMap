import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { awardPointsOnce } from "./system";

type LedgerChain = {
  select: (columns: string) => LedgerChain;
  eq: (field: string, value: string) => LedgerChain;
  maybeSingle: () => Promise<{ data: { id: string } | null; error: null }>;
  insert?: (values: Record<string, unknown>) => Promise<{ error: null }>;
};

function createLedgerChain(existing: boolean): LedgerChain {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: existing ? { id: "existing" } : null,
      error: null,
    })),
  } as LedgerChain;
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
    } as unknown as SupabaseClient;

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
    } as unknown as SupabaseClient;

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
