import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { GamificationRulesV1 } from "./gamification-rules";
import { reconcileUserGamification } from "./gamification-reconciliation";
import type { GamificationFacts } from "./gamification-reconstruction";

function rules(version: string, category: "XP_MILESTONE" | "BADGE_ONLY" | "NON_GAMIFIED", amount = 1): GamificationRulesV1 {
  return {
    version,
    mechanics: [{
      mechanicId: "mechanic-a",
      category,
      eventType: category === "NON_GAMIFIED" ? null : "action_declare_validation",
      progressionId: null,
      milestoneId: category === "NON_GAMIFIED" ? null : "mechanic-a",
      badgeId: category === "NON_GAMIFIED" ? null : "badge-a",
      sourceDomain: "actions",
      xpPolicy: category === "BADGE_ONLY" || category === "NON_GAMIFIED"
        ? { kind: "none", reason: "test" }
        : { kind: "fixed_one_shot", amount },
      awardPolicy: category === "XP_MILESTONE"
        ? { kind: "fixed", amount }
        : { kind: "none" },
      eligibility: category === "NON_GAMIFIED"
        ? { kind: "never", reason: "test" }
        : { kind: "canonical_fact", factKey: "action" },
    }],
  };
}

const facts: GamificationFacts = {
  userId: "user-1",
  sourceFacts: [{
    mechanicId: "mechanic-a",
    eventType: "action_declare_validation",
    sourceTable: "actions",
    sourceId: "action-1",
    occurredOn: "2026-09-28",
    xpAwarded: 1,
  }],
};

function createSupabase() {
  const rows: Array<Record<string, unknown>> = [];
  let nextId = 1;
  const supabase = {
    from(table: string) {
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
  return { supabase, rows };
}

describe("reconcileUserGamification", () => {
  it("updates XP, removes it for BADGE_ONLY, then removes the CURRENT projection", async () => {
    const fixture = createSupabase();

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v1", "XP_MILESTONE", 1),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 1, updated: 0, removed: 0 });
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.rows[0]?.xp_awarded).toBe(1);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v2", "XP_MILESTONE", 2),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 0, updated: 1, removed: 0 });
    expect(fixture.rows[0]?.xp_awarded).toBe(2);
    expect(fixture.rows).toHaveLength(1);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v3", "BADGE_ONLY"),
      refreshProfile: false,
    })).resolves.toMatchObject({ inserted: 0, updated: 1, removed: 0, expectedBadges: ["badge-a"] });
    expect(fixture.rows[0]?.xp_awarded).toBe(0);

    await expect(reconcileUserGamification(fixture.supabase, "user-1", {
      facts,
      rules: rules("v4", "NON_GAMIFIED"),
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
      rules: rules("v1", "XP_MILESTONE", 1),
      refreshProfile: false,
    });

    expect(result.preservedLegacy).toBe(1);
    expect(fixture.rows).toHaveLength(2);
    expect(fixture.rows.some((row) => row.id === 99)).toBe(true);
  });
});
