import { describe, expect, it, vi } from "vitest";
import {
  loadGamificationReconciliationInbox,
  loadGamificationReconciliationHistory,
  loadPendingGamificationReconciliation,
} from "./gamification-reconciliation-notice";

type MockQueryChain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

function createSupabase(
  data: unknown,
  error: { message: string } | null = null,
  pendingData: unknown = data,
) {
  const chains: MockQueryChain[] = [];
  function createChain(): MockQueryChain {
    let pendingQuery = false;
    const getResult = () => {
      const selectedData = pendingQuery ? pendingData : data;
      return {
        data: Array.isArray(selectedData) ? selectedData : selectedData ? [selectedData] : [],
        error,
      };
    };
    const chain: MockQueryChain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => {
        pendingQuery = true;
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => getResult()),
      then: (resolve, reject) => Promise.resolve(getResult()).then(resolve, reject),
    };
    chains.push(chain);
    return chain;
  }

  const firstChain = createChain();
  let fromCalls = 0;
  return {
    supabase: {
      from: vi.fn(() => {
        fromCalls += 1;
        return fromCalls === 1 ? firstChain : createChain();
      }),
    },
    chain: firstChain,
    chains,
  };
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
    expect(chain.select).toHaveBeenCalledWith("id, created_at, seen_at, acknowledged_at, payload");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("type", "gamification_reconciliation");
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
    const wrongOwner = createSupabase({
      id: "notification-3",
      created_at: "2026-09-30T10:00:00.000Z",
      acknowledged_at: null,
      payload: { ...receipt, receipt: { ...receipt.receipt, userId: "user-2" } },
    });

    expect(await loadPendingGamificationReconciliation(acknowledged.supabase as never, "user-1")).toBeNull();
    expect(await loadPendingGamificationReconciliation(malformed.supabase as never, "user-1")).toBeNull();
    expect(await loadPendingGamificationReconciliation(wrongOwner.supabase as never, "user-1")).toBeNull();
  });

  it("returns the current user's receipt history newest first without exposing other users", async () => {
    const { supabase } = createSupabase([
      {
        id: "notification-2",
        created_at: "2026-09-30T11:00:00.000Z",
        seen_at: "2026-09-30T11:01:00.000Z",
        acknowledged_at: "2026-09-30T11:02:00.000Z",
        payload: receipt,
      },
      {
        id: "notification-1",
        created_at: "2026-09-30T10:00:00.000Z",
        seen_at: null,
        acknowledged_at: null,
        payload: { ...receipt, receipt: { ...receipt.receipt, reconciliationId: "reconciliation-0" } },
      },
      {
        id: "notification-other",
        created_at: "2026-09-30T09:00:00.000Z",
        seen_at: null,
        acknowledged_at: null,
        payload: { ...receipt, receipt: { ...receipt.receipt, userId: "user-2" } },
      },
    ]);

    const history = await loadGamificationReconciliationHistory(supabase as never, "user-1");

    expect(history.map((entry) => entry.notificationId)).toEqual(["notification-2", "notification-1"]);
    expect(history[0]?.acknowledgedAt).toBe("2026-09-30T11:02:00.000Z");
  });

  it("keeps pending state and counters independent from the 50-entry history window", async () => {
    const historyRows = Array.from({ length: 50 }, (_, index) => ({
      id: `notification-${index + 2}`,
      created_at: `2026-09-30T${String(23 - Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}:00.000Z`,
      seen_at: "2026-09-30T23:59:00.000Z",
      acknowledged_at: "2026-09-30T23:59:30.000Z",
      payload: {
        ...receipt,
        receipt: { ...receipt.receipt, reconciliationId: `reconciliation-${index + 2}` },
      },
    }));
    const oldestPending = {
      id: "notification-1",
      created_at: "2026-09-01T10:00:00.000Z",
      seen_at: null,
      acknowledged_at: null,
      payload: { ...receipt, receipt: { ...receipt.receipt, reconciliationId: "reconciliation-1" } },
    };
    const { supabase, chains } = createSupabase(historyRows, null, [oldestPending]);

    const inbox = await loadGamificationReconciliationInbox(supabase as never, "user-1");

    expect(inbox.history).toHaveLength(50);
    expect(inbox.history.some((entry) => entry.notificationId === "notification-1")).toBe(false);
    expect(inbox.pending?.notificationId).toBe("notification-1");
    expect(inbox.pending?.unacknowledgedCount).toBe(1);
    expect(inbox.pending?.unseenCount).toBe(1);
    expect(chains.some((chain) => chain.limit.mock.calls.some(([limit]) => limit === 50))).toBe(true);
    const pendingChain = chains.find((chain) => chain.is.mock.calls.length > 0);
    expect(pendingChain).toBeDefined();
    expect(pendingChain?.limit).not.toHaveBeenCalled();
    expect(pendingChain?.eq.mock.calls).toEqual(
      expect.arrayContaining([
        ["user_id", "user-1"],
        ["type", "gamification_reconciliation"],
      ]),
    );
    expect(pendingChain?.is).toHaveBeenCalledWith("acknowledged_at", null);
  });
});
