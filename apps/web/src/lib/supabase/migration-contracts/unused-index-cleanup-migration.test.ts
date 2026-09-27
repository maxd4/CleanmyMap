import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(new URL(`../../../../supabase/migrations/${name}`, import.meta.url), "utf8")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const cleanupMigration = readMigration("20260927000003_remove_redundant_unused_indexes.sql");
const retainedIndexSources = [
  ["idx_messages_dm", "create index if not exists idx_messages_dm on public.app_messages(sender_id, recipient_id) where channel_type = 'dm';"],
  ["idx_user_points", "create index if not exists idx_user_points on public.points_ledger (user_id);"],
  ["idx_progression_events_user_type", "create index if not exists idx_progression_events_user_type on public.progression_events(user_id, event_type);"],
] as const;

const removals = [
  ["idx_actions_status", "idx_actions_status_date"],
  ["idx_spots_status", "idx_spots_status_created_at"],
  ["idx_forms_action_id", "idx_forms_action_group_status"],
  ["idx_service_email_events_actor_user_id", "idx_service_email_events_actor_created_status"],
] as const;

describe("unused index cleanup migration", () => {
  it("drops only the four verified redundant prefix indexes", () => {
    expect(cleanupMigration.match(/drop index if exists/g)).toHaveLength(removals.length);

    for (const [shortIndex] of removals) {
      expect(cleanupMigration).toContain(`drop index if exists public.${shortIndex};`);
    }

    for (const [shortIndex] of retainedIndexSources) {
      expect(cleanupMigration).not.toContain(`drop index if exists public.${shortIndex};`);
    }
  });

  it("keeps the three zero-scan index pairs pending workload proof", () => {
    const chatMigration = readMigration("20260420000015_advanced_chat_core.sql");
    const pointsMigration = readMigration("20260615000000_add_points_system.sql");
    const progressionMigration = readMigration("20260418000003_gamification_progression.sql");

    expect(chatMigration).toContain(retainedIndexSources[0][1]);
    expect(pointsMigration).toContain(retainedIndexSources[1][1]);
    expect(progressionMigration).toContain(retainedIndexSources[2][1]);
    expect(cleanupMigration).toContain("three zero-scan pairs");
  });

  it("does not alter constraints or other schema/access contracts", () => {
    expect(cleanupMigration).not.toMatch(/alter table|drop constraint|grant|revoke|policy|foreign key/);
  });
});
