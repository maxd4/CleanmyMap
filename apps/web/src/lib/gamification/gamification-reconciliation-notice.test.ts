import { describe, expect, it, vi } from "vitest";
import { loadPendingGamificationReconciliation } from "./gamification-reconciliation-notice";

function createSupabase(data: unknown, error: { message: string } | null = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: data ? [data] : [], error })),
  };
  return { supabase: { from: vi.fn(() => chain) }, chain };
}

const receipt = {
  kind: "gamification_reconciliation_receipt",
  receipt: {
    reconciliationId: "reconciliation-1",
    userId: "user-1",
    occurredAt: "2026-09-30T10:00:00.000Z",
    currentRulesVersion: "v2",
    xp: { before: 10, after: 12, delta: 2 },
    level: { before: 1, after: 1 },
    progressions: { added: [], removed: [], changed: [] },
    badges: { unlocked: [], removed: [], upgraded: [], downgraded: [] },
    milestones: { unlocked: [], removed: [] },
    hasUserVisibleChanges: true,
  },
};

describe("loadPendingGamificationReconciliation", () => {
  it("reads only the current user's unacknowledged reconciliation receipt", async () => {
    const { supabase, chain } = createSupabase({
      id: "notification-1",
      created_at: "2026-09-30T10:00:00.000Z",
      acknowledged_at: null,
      payload: receipt,
    });

    const pending = await loadPendingGamificationReconciliation(supabase as never, "user-1");

    expect(pending?.notificationId).toBe("notification-1");
    expect(pending?.receipt.reconciliationId).toBe("reconciliation-1");
    expect(supabase.from).toHaveBeenCalledWith("app_notifications");
    expect(chain.select).toHaveBeenCalledWith("id, created_at, acknowledged_at, payload");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("type", "gamification_reconciliation");
    expect(chain.is).toHaveBeenCalledWith("acknowledged_at", null);
  });

  it("does not expose an acknowledged or malformed notification", async () => {
    const acknowledged = createSupabase({
      id: "notification-1",
      created_at: "2026-09-30T10:00:00.000Z",
      acknowledged_at: "2026-09-30T10:01:00.000Z",
      payload: receipt,
    });
    const malformed = createSupabase({
      id: "notification-2",
      created_at: "2026-09-30T10:00:00.000Z",
      acknowledged_at: null,
      payload: { kind: "other" },
    });

    expect(await loadPendingGamificationReconciliation(acknowledged.supabase as never, "user-1")).toBeNull();
    expect(await loadPendingGamificationReconciliation(malformed.supabase as never, "user-1")).toBeNull();
  });
});
