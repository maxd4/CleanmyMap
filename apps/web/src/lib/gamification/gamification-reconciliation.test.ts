import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { reconcileUserGamification } from "./gamification-reconciliation";
import { facts, rules } from "./__tests__/reconciliation-fixtures";

function createSupabase() {
  const rows: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  let nextId = 1;
  const supabase = {
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
  return { supabase, rows, notifications };
}

describe("reconcileUserGamification", () => {
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
});
