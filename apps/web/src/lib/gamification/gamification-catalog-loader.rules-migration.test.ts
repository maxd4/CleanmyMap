import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadGamificationRulesMigrationState } from "./gamification-catalog-loader";

function createSupabaseProfileReader(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  return {
    from: vi.fn(() => chain),
  } as unknown as SupabaseClient;
}

describe("gamification rules migration state", () => {
  it("preserves an unapplied revision at zero", async () => {
    const supabase = createSupabaseProfileReader({
      current_applied_rules_revision: 0,
      last_acknowledged_rules_revision: 0,
    });

    await expect(loadGamificationRulesMigrationState(supabase, "user-1")).resolves.toEqual({
      currentAppliedRulesRevision: 0,
      lastAcknowledgedRulesRevision: 0,
    });
  });

  it("defaults a missing profile to no applied revision", async () => {
    const supabase = createSupabaseProfileReader(null);

    await expect(loadGamificationRulesMigrationState(supabase, "user-1")).resolves.toEqual({
      currentAppliedRulesRevision: 0,
      lastAcknowledgedRulesRevision: 0,
    });
  });

  it("keeps the acknowledged revision bounded by the applied revision", async () => {
    const supabase = createSupabaseProfileReader({
      current_applied_rules_revision: 3,
      last_acknowledged_rules_revision: 12,
    });

    await expect(loadGamificationRulesMigrationState(supabase, "user-1")).resolves.toEqual({
      currentAppliedRulesRevision: 3,
      lastAcknowledgedRulesRevision: 3,
    });
  });
});
