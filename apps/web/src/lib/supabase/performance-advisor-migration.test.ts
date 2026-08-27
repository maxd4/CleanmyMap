import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION =
  "../../../supabase/migrations/20260827120000_close_performance_advisor_rls_initplan_and_duplicate_indexes.sql";

const TARGET_POLICIES = [
  ["signalement_media", "signalement_media_owner_read"],
  ["chat_dm_read_states", "chat_dm_read_states_select_own"],
  ["chat_dm_read_states", "chat_dm_read_states_insert_own"],
  ["chat_dm_read_states", "chat_dm_read_states_update_own"],
  ["chat_poll_options", "chat_poll_options_select_visible"],
  ["chat_poll_options", "chat_poll_options_insert_own_poll"],
  ["quiz_pedagogical_metrics", "quiz_pedagogical_metrics_service_role"],
  ["public_surface_snapshots", "public_surface_snapshots_service_only"],
  ["report_generations", "report_generations_service_only"],
  ["forms", "forms_service_select"],
  ["legacy_spot_migrations", "legacy_spot_migrations_service_select"],
  ["spots", "spots_service_select"],
  [
    "action_pollution_prediction_evaluations",
    "action_pollution_prediction_evaluations_service_read",
  ],
  [
    "action_pollution_prediction_evaluations",
    "action_pollution_prediction_evaluations_service_insert",
  ],
] as const;

function readMigration(): string {
  return readFileSync(new URL(MIGRATION, import.meta.url), "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("PERF-01 Supabase performance corrective migration", () => {
  it("wraps every live init-plan policy finding without direct auth helper calls", () => {
    const migration = readMigration();

    expect((migration.match(/\balter policy\b/gi) ?? []).length).toBe(
      TARGET_POLICIES.length,
    );

    for (const [table, policy] of TARGET_POLICIES) {
      const block = migration.match(
        new RegExp(
          `alter policy ${escapeRegExp(policy)}\\s+on public\\.${escapeRegExp(table)}([\\s\\S]*?)(?=\\n(?:alter policy|drop index)|$)`,
          "i",
        ),
      )?.[1];

      expect(block, `${table}.${policy}`).toBeDefined();
      expect(block).toMatch(/\(select\s+auth\.(?:jwt|role)\(\)\)/i);
    }

    const withoutInitPlanCalls = migration.replace(
      /\(select\s+auth\.(?:jwt|role)\(\)\)/gi,
      "",
    );
    expect(withoutInitPlanCalls).not.toMatch(/auth\.(?:jwt|role)\(\)/i);
  });

  it("drops only the two reported duplicate indexes and preserves their canonical twins", () => {
    const migration = readMigration();
    const droppedIndexes = [
      ...migration.matchAll(/drop index if exists public\.([a-z0-9_]+);/gi),
    ].map((match) => match[1]);

    expect(droppedIndexes).toEqual([
      "idx_actions_status_action_date_desc",
      "idx_trash_spotter_spots_created_at_desc",
    ]);
    expect(migration).not.toMatch(
      /drop index if exists public\.idx_actions_status_date\s*;/i,
    );
    expect(migration).not.toMatch(
      /drop index if exists public\.trash_spotter_spots_created_at_idx\s*;/i,
    );
    expect(migration).not.toMatch(/unused_index|unindexed_foreign_keys/i);
  });

  it("retains the ownership and service-only predicates", () => {
    const migration = readMigration();

    expect(migration).toContain("created_by_clerk_id = coalesce");
    expect(migration).toContain("user_id <> peer_id");
    expect(migration).toContain("m.sender_id = coalesce");
    expect(migration).toContain("m.message_kind = 'poll'");
    expect(migration).toContain("m.channel_type = 'community'");
    expect((migration.match(/= 'service_role'/g) ?? []).length).toBeGreaterThanOrEqual(9);
  });
});
