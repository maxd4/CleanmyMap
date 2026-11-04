import { beforeEach, describe, expect, it, vi } from "vitest";

const snapshotMock = vi.hoisted(() => vi.fn());
const reconcileUserMock = vi.hoisted(() => vi.fn());

vi.mock("./reconciliation", () => ({ reconcileTerritorialLegendSnapshot: snapshotMock }));
vi.mock("../reconciliation/gamification-reconciliation", () => ({ reconcileUserGamification: reconcileUserMock }));

import { runTerritorialLegendDailyReconciliation } from "./daily-reconciliation-job";

describe("territorial legend daily reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotMock.mockResolvedValue({
      effectiveOn: "2026-11-03",
      affectedUserIds: ["user-1", "user-2"],
      winners: [],
      insertedProofs: 1,
      extendedPeriods: 1,
      closedPeriods: 1,
    });
    reconcileUserMock.mockResolvedValue({});
  });

  it("projects every changed holder without recursively re-running the snapshot", async () => {
    const result = await runTerritorialLegendDailyReconciliation({
      now: new Date("2026-11-03T12:00:00.000Z"),
      supabase: {} as never,
    });

    expect(result).toMatchObject({
      effectiveOn: "2026-11-03",
      affectedUserIds: ["user-1", "user-2"],
      projectedUsers: 2,
    });
    expect(snapshotMock).toHaveBeenCalledWith(
      expect.anything(),
      new Date("2026-11-03T12:00:00.000Z"),
      { refreshMissingAttributions: true },
    );
    expect(reconcileUserMock).toHaveBeenNthCalledWith(1, expect.anything(), "user-1", {
      reasonCategory: "other",
      reconcileTerritorialLegends: false,
    });
    expect(reconcileUserMock).toHaveBeenNthCalledWith(2, expect.anything(), "user-2", {
      reasonCategory: "other",
      reconcileTerritorialLegends: false,
    });
  });
});
