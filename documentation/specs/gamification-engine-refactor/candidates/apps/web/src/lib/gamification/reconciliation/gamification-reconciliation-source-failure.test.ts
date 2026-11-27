import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadCurrentGamificationFacts: vi.fn() }));
vi.mock("../progression/gamification-facts-loader", () => ({
  loadCurrentGamificationFacts: mocks.loadCurrentGamificationFacts,
}));

import { reconcileUserGamification } from "./gamification-reconciliation";

describe("reconciliation evidence boundary", () => {
  it("does not read or write a ledger projection after an evidence failure", async () => {
    mocks.loadCurrentGamificationFacts.mockRejectedValueOnce(new Error("canonical evidence unavailable"));
    const supabase = { from: vi.fn(), rpc: vi.fn() };
    await expect(reconcileUserGamification(supabase as never, "user-1", {
      reconcileTerritorialLegends: false,
    })).rejects.toThrow("canonical evidence unavailable");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
