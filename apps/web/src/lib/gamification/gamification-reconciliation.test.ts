import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { reconcileUserGamification } from "./gamification-reconciliation";
import { facts, rules } from "./__tests__/reconciliation-fixtures";

function createSupabase(options: { conflictCount?: number; blockFirstRpc?: boolean } = {}) {
  const rows: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  let nextId = 1;
  let conflictsRemaining = options.conflictCount ?? 0;
  let rpcCalls = 0;
  let releaseFirstRpc!: () => void;
  const firstRpcStarted = new Promise<void>((resolve) => {
    releaseFirstRpc = resolve;
  });
  let signalFirstRpc!: () => void;
  const firstRpcReached = new Promise<void>((resolve) => {
    signalFirstRpc = resolve;
  });
  const supabase = {
    async rpc(name: string, args: Record<string, unknown>) {
      if (name !== "apply_gamification_reconciliation") throw new Error(`Unexpected RPC ${name}`);
      rpcCalls += 1;
      if (options.blockFirstRpc && rpcCalls === 1) {
        signalFirstRpc();
        await firstRpcStarted;
      }
      if (conflictsRemaining > 0) {
        conflictsRemaining -= 1;
        return { data: { status: "conflict" }, error: null };
      }
      const userId = String(args.p_user_id);
      const userRows = rows.filter((row) => row.user_id === userId);
      const snapshot = rows
        .filter((row) => row.user_id === userId)
        .sort((left, right) => Number(left.id) - Number(right.id))
        .map((row) => ({
          id: Number(row.id),
          event_type: row.event_type,
          source_table: row.source_table,
          source_id: row.source_id,
          status_phase: row.status_phase,
          weight: Number(row.weight),
          xp_base: Number(row.xp_base),
          xp_awarded: Number(row.xp_awarded),
          occurred_on: row.occurred_on,
          metadata: row.metadata ?? {},
        }));
      if (JSON.stringify(snapshot) !== JSON.stringify(args.p_expected_events)) {
        return { data: { status: "conflict" }, error: null };
      }
      for (const id of (args.p_events_to_remove as number[]) ?? []) {
        const index = rows.findIndex((row) => row.user_id === userId && row.id === id);
        if (index >= 0) rows.splice(index, 1);
      }
      for (const update of (args.p_events_to_update as Array<Record<string, unknown>>) ?? []) {
        const row = userRows.find((candidate) => candidate.id === update.id);
        if (row) {
          row.event_type = update.event_type;
          row.source_table = update.source_table;
          row.source_id = update.source_id;
          row.status_phase = update.status_phase;
          row.weight = update.weight;
          row.xp_base = update.xp_base;
          row.xp_awarded = update.xp_awarded;
          row.occurred_on = update.occurred_on;
          row.metadata = update.metadata;
        }
      }
      for (const event of (args.p_events_to_add as Array<Record<string, unknown>>) ?? []) {
        rows.push({ id: nextId++, user_id: args.p_user_id, ...event });
      }
      if (args.p_receipt && !notifications.some((row) => row.user_id === userId && (row.payload as Record<string, unknown>).reconciliationId === (args.p_receipt as Record<string, unknown>).reconciliationId)) {
        notifications.push({ user_id: userId, payload: args.p_receipt });
      }
      return { data: { status: "applied", inserted: ((args.p_events_to_add as unknown[]) ?? []).length, updated: ((args.p_events_to_update as unknown[]) ?? []).length, removed: ((args.p_events_to_remove as unknown[]) ?? []).length }, error: null };
    },
    from(table: string) {
      if (table === "app_notifications") {
        return {
          insert(row: Record<string, unknown>) {
            notifications.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table !== "progression_events") throw new Error(`Unexpected table ${table}`);
      return {
        select() {
          const query = {
            eq() { return query; },
            limit: async () => ({ data: rows, error: null }),
          };
          return query;
        },
        insert(row: Record<string, unknown>) {
          rows.push({ id: nextId++, ...row });
          return Promise.resolve({ error: null });
        },
        update(values: Record<string, unknown>) {
          return {
            eq: async (_column: string, value: unknown) => {
              const row = rows.find((candidate) => candidate.id === value);
              if (row) Object.assign(row, values);
              return { error: null };
            },
          };
        },
        delete() {
          return {
            eq: async (_column: string, value: unknown) => {
              const index = rows.findIndex((candidate) => candidate.id === value);
              if (index >= 0) rows.splice(index, 1);
              return { error: null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { supabase, rows, notifications, firstRpcReached, releaseFirstRpc };
}

describe("reconcileUserGamification", () => {
  it("does not credit XP twice when the same canonical facts are reconciled again", async () => {
    const fixture = createSupabase();
    const options = {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    } as const;

    await expect(reconcileUserGamification(fixture.supabase, "user-1", options)).resolves.toMatchObject({ inserted: 1, updated: 0, removed: 0 });
    await expect(reconcileUserGamification(fixture.supabase, "user-1", options)).resolves.toMatchObject({ inserted: 0, updated: 0, removed: 0 });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.rows[0]?.xp_awarded).toBe(1);
  });

  it("updates XP, removes it for BADGE_ONLY, then removes the CURRENT projection", async () => {
    const fixture = createSupabase();

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 1, updated: 0, removed: 0 });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.rows[0]?.xp_awarded).toBe(1);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v2", "XP_MILESTONE", 2, "mechanic-a"),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 0, updated: 1, removed: 0 });
    expect(fixture.rows[0]?.xp_awarded).toBe(2);
    expect(fixture.rows).toHaveLength(1);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v3", "BADGE_ONLY", 1, "mechanic-a"),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 0, updated: 1, removed: 0, expectedBadges: ["badge-a"] });
    expect(fixture.rows[0]?.xp_awarded).toBe(0);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v4", "NON_GAMIFIED", 1, "mechanic-a"),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 0, updated: 0, removed: 1, expectedEvents: 0 });
    expect(fixture.rows).toEqual([]);
  });

  it("preserves an unrelated LEGACY event while reconciling CURRENT", async () => {
    const fixture = createSupabase();
    fixture.rows.push({
      id: 99,
      user_id: "user-1",
      event_type: "sensitive_zone_milestone",
      source_table: "sensitive_zone_progression",
      source_id: "legacy-1",
      status_phase: "validated",
      weight: 1,
      xp_base: 4,
      xp_awarded: 4,
      occurred_on: "2025-01-01",
      metadata: {},
    });

    const result = await reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    });

    expect(result.preservedLegacy).toBe(1);
    expect(fixture.rows).toHaveLength(2);
    expect(fixture.rows.some((row) => row.id === 99)).toBe(true);
  });

  it("retries a stale commit without duplicating the ledger or receipt", async () => {
    const fixture = createSupabase({ conflictCount: 1 });

    const result = await reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    });

    expect(result.inserted).toBe(1);
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.notifications).toHaveLength(1);
  });

  it("converges when two same-user responses return in reverse order", async () => {
    const fixture = createSupabase({ blockFirstRpc: true });
    const first = reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    });
    await fixture.firstRpcReached;
    const second = reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"),
      refreshProfile: false,
    });
    const secondResult = await second;
    fixture.releaseFirstRpc();
    const firstResult = await first;

    expect(secondResult.inserted).toBe(1);
    expect(firstResult.inserted).toBe(0);
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.notifications).toHaveLength(1);
  });

  it("keeps independent users isolated while reconciling concurrently", async () => {
    const fixture = createSupabase();
    const [first, second] = await Promise.all([
      reconcileUserGamification(fixture.supabase, "user-1", { facts, rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"), refreshProfile: false }),
      reconcileUserGamification(fixture.supabase, "user-2", { facts: { ...facts, userId: "user-2" }, rules: rules("v1", "XP_MILESTONE", 1, "mechanic-a"), refreshProfile: false }),
    ]);

    expect(first.inserted).toBe(1);
    expect(second.inserted).toBe(1);
    expect(fixture.rows.map((row) => row.user_id).sort()).toEqual(["user-1", "user-2"]);
  });
});
