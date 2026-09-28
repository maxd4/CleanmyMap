import { describe, expect, it } from "vitest";
import type { GamificationReconciliationPlan } from "./gamification-reconciliation-plan";
import {
  emptyGamificationReconcileAggregate,
  parseGamificationReconcileArgs,
  runGamificationReconcile,
} from "./gamification-reconcile-runner";

function plan(userId: string, xpDelta = 0): GamificationReconciliationPlan {
  return {
    userId,
    rulesVersionBefore: "v2",
    rulesVersionAfter: "v2",
    rulesRevisionBefore: 2,
    rulesRevisionAfter: 2,
    xpBefore: Math.max(0, 1 - xpDelta),
    xpExpected: Math.max(0, 1),
    xpDelta,
    levelBefore: 1,
    levelAfter: 1,
    eventsToAdd: xpDelta > 0 ? [{ logicalId: `${userId}:add`, sourceTable: "actions", sourceId: "a", eventType: "x", xpAwarded: xpDelta }] : [],
    eventsToUpdate: [],
    eventsToRemove: xpDelta < 0 ? [{ id: 1, logicalId: `${userId}:remove`, sourceTable: "actions", sourceId: "a", eventType: "x", xpAwarded: Math.abs(xpDelta) }] : [],
    badgesAdded: [],
    badgesRemoved: [],
    milestonesAdded: [],
    milestonesRemoved: [],
    currentEventCountBefore: 0,
    legacyEventCountPreserved: 0,
    expected: {} as GamificationReconciliationPlan["expected"],
    currentPersisted: [],
  };
}

function dependencies(overrides: Partial<Parameters<typeof runGamificationReconcile>[1]> = {}) {
  return {
    rulesVersion: "v2",
    previewUser: async (userId: string) => plan(userId),
    applyUser: async (userId: string) => ({ plan: plan(userId, 1) }),
    listUsers: async ({ afterUserId }: { afterUserId: string | null }) =>
      afterUserId ? [] : ["user-1"],
    writeCheckpoint: async () => undefined,
    auditApply: async () => undefined,
    ...overrides,
  };
}

describe("gamification reconcile runner", () => {
  it("keeps dry-run read-only and reports no-data users as zero diff", async () => {
    let applied = 0;
    let checkpoints = 0;
    let audits = 0;
    const result = await runGamificationReconcile(
      parseGamificationReconcileArgs(["--user", "empty-user", "--dry-run"]),
      dependencies({
        applyUser: async () => {
          applied += 1;
          return { plan: plan("empty-user", 1) };
        },
        writeCheckpoint: async () => { checkpoints += 1; },
        auditApply: async () => { audits += 1; },
      }),
    );

    expect(result.aggregate).toMatchObject({ accountsInspected: 1, accountsModified: 0, xpAddedTotal: 0 });
    expect(applied).toBe(0);
    expect(checkpoints).toBe(0);
    expect(audits).toBe(0);
  });

  it("applies the exact diff and is zero-delta on the second apply", async () => {
    let calls = 0;
    let audits = 0;
    const deps = dependencies({
      applyUser: async (userId: string) => {
        calls += 1;
        return { plan: plan(userId, calls === 1 ? 1 : 0) };
      },
      auditApply: async () => { audits += 1; },
    });
    const args = parseGamificationReconcileArgs(["--user", "user-1", "--apply"]);
    const first = await runGamificationReconcile(args, deps);
    const second = await runGamificationReconcile(args, deps);

    expect(first.aggregate.xpAddedTotal).toBe(1);
    expect(second.aggregate.xpAddedTotal).toBe(0);
    expect(second.aggregate.accountsModified).toBe(0);
    expect(calls).toBe(2);
    expect(audits).toBe(2);
  });

  it("preserves the last successful cursor and resumes after an error", async () => {
    const checkpoints: Array<{ lastUserId: string | null; status: string }> = [];
    const applied: string[] = [];
    let failUser2 = true;
    const deps = dependencies({
      listUsers: async ({ afterUserId, limit }: { afterUserId: string | null; limit: number }) => {
        const users = afterUserId === null ? ["user-1", "user-2"] : afterUserId === "user-1" ? ["user-2", "user-3"] : [];
        return users.slice(0, limit);
      },
      applyUser: async (userId: string) => {
        applied.push(userId);
        if (userId === "user-2" && failUser2) {
          failUser2 = false;
          throw new Error("temporary failure");
        }
        return { plan: plan(userId, 0) };
      },
      writeCheckpoint: async (checkpoint: { lastUserId: string | null; status: string }) => {
        checkpoints.push({ lastUserId: checkpoint.lastUserId, status: checkpoint.status });
      },
    });
    const args = parseGamificationReconcileArgs(["--all", "--apply", "--batch-size", "2"]);

    await expect(runGamificationReconcile(args, deps)).rejects.toThrow("user-2");
    expect(checkpoints.at(-1)).toEqual({ lastUserId: "user-1", status: "paused" });
    await runGamificationReconcile(args, deps, {
      runId: "resume-1",
      lastUserId: "user-1",
      aggregate: emptyGamificationReconcileAggregate(),
    });

    expect(applied).toEqual(["user-1", "user-2", "user-2", "user-3"]);
    expect(checkpoints.at(-1)?.status).toBe("completed");
  });
});
