import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { facts, rules } from "./__tests__/reconciliation-fixtures";

const factsMock = vi.hoisted(() => vi.fn());
const persistedMock = vi.hoisted(() => vi.fn());
const profileMock = vi.hoisted(() => vi.fn());
const statsMock = vi.hoisted(() => vi.fn());
const broadcastMock = vi.hoisted(() => vi.fn());

vi.mock("./gamification-facts-loader", () => ({ loadCurrentGamificationFacts: factsMock }));
vi.mock("./progression-data", () => ({ loadUserProgressionStats: statsMock }));
vi.mock("./gamification-reconciliation-profile", () => ({ loadReconciliationProfile: profileMock }));
vi.mock("./announcements", () => ({ broadcastGamificationAnnouncement: broadcastMock }));
vi.mock("./gamification-reconciliation-plan", async () => {
  const actual = await vi.importActual<typeof import("./gamification-reconciliation-plan")>("./gamification-reconciliation-plan");
  return { ...actual, loadPersistedGamificationEvents: persistedMock };
});

import { reconcileUserGamification } from "./gamification-reconciliation";

beforeEach(() => {
  vi.clearAllMocks();
  factsMock.mockResolvedValue(facts);
  persistedMock.mockResolvedValue([]);
  profileMock.mockResolvedValue({
    xp_total: 0,
    xp_validated: 0,
    current_level: 0,
    potential_level: 1,
    current_applied_rules_revision: 0,
    updated_at: "2026-10-01T00:00:00.000Z",
  });
  statsMock.mockResolvedValue({});
});

function createRpcSupabase() {
  const rpc = vi.fn().mockResolvedValue({
    data: { status: "applied", inserted: 1, updated: 0, removed: 0 },
    error: null,
  });
  return { rpc } as unknown as SupabaseClient & { rpc: typeof rpc };
}

describe("gamification reconciliation profile refresh boundary", () => {
  it("loads canonical facts and profile CAS inputs when refresh is enabled", async () => {
    const supabase = createRpcSupabase();
    const result = await reconcileUserGamification(supabase, "user-1", {
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      reasonCategory: "migration",
    });

    expect(factsMock).toHaveBeenCalledWith(supabase, "user-1");
    expect(profileMock).toHaveBeenCalledWith(supabase, "user-1");
    expect(statsMock).toHaveBeenCalledWith(supabase, "user-1");
    expect(supabase.rpc).toHaveBeenCalledWith("apply_gamification_reconciliation", expect.objectContaining({
      p_expected_profile_updated_at: "2026-10-01T00:00:00.000Z",
      p_profile_update: expect.objectContaining({ current_level: 2 }),
      p_level_up: expect.objectContaining({ oldLevel: 0, newLevel: 2 }),
    }));
    expect(result.receipt).toEqual(expect.objectContaining({ reasonCategory: "migration" }));
    expect(broadcastMock).toHaveBeenCalledWith(supabase, expect.objectContaining({
      type: "level_up",
      previousLevel: 0,
      newLevel: 2,
    }));
  });

  it("accepts explicit facts and an existing reconciliation id without reloading facts", async () => {
    const supabase = createRpcSupabase();
    const result = await reconcileUserGamification(supabase, "user-1", {
      facts,
      rules: rules("v1", "NON_GAMIFIED", 0, "mechanic-a"),
      refreshProfile: false,
      persistReceipt: false,
    });

    expect(factsMock).not.toHaveBeenCalled();
    expect(profileMock).not.toHaveBeenCalled();
    expect(result.receipt).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith("apply_gamification_reconciliation", expect.objectContaining({
      p_expected_profile_updated_at: null,
      p_profile_update: null,
      p_level_up: null,
    }));
  });

  it("does not announce a stable profile and keeps pending legacy XP in the atomic profile payload", async () => {
    const supabase = createRpcSupabase();
    profileMock.mockResolvedValue({
      xp_total: 3,
      xp_validated: 3,
      current_level: 2,
      potential_level: 2,
      current_applied_rules_revision: 1,
      updated_at: "2026-10-02T00:00:00.000Z",
    });
    persistedMock.mockResolvedValue([{
      id: 99,
      event_type: "sensitive_zone_milestone",
      source_table: "sensitive_zone_progression",
      source_id: "legacy-1",
      status_phase: "pending",
      weight: 1,
      xp_base: 3,
      xp_awarded: 3,
      occurred_on: "2026-01-01",
      metadata: {},
    }]);

    await reconcileUserGamification(supabase, "user-1", {
      rules: rules("v1", "NON_GAMIFIED", 0, "mechanic-a"),
      reasonCategory: "account_rebuild",
    });
    expect(broadcastMock).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("apply_gamification_reconciliation", expect.objectContaining({
      p_profile_update: expect.objectContaining({ xp_pending: 3, xp_validated: 0 }),
      p_level_up: null,
    }));
  });
});
