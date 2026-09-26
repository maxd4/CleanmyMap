import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927000001_index_unindexed_foreign_keys.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

const indexes = [
  ["idx_action_share_contact_requests_action_id", "action_share_contact_requests", "action_id"],
  ["idx_app_messages_feedback_reply_feedback_id", "app_messages", "feedback_reply_feedback_id"],
  ["idx_badge_events_user_id", "badge_events", "user_id"],
  ["idx_chat_dm_read_states_peer_id", "chat_dm_read_states", "peer_id"],
  ["idx_missions_created_by", "missions", "created_by"],
  ["idx_missions_volunteer_id", "missions", "volunteer_id"],
] as const;

describe("unindexed foreign keys migration", () => {
  it("creates the six explicit btree indexes", () => {
    for (const [name, table, column] of indexes) {
      expect(migration).toContain(
        `create index if not exists ${name} on public.${table} using btree (${column});`,
      );
    }

    expect(migration.match(/create index if not exists/g)).toHaveLength(indexes.length);
  });

  it("does not change foreign keys or access contracts", () => {
    expect(migration).not.toMatch(/alter table|foreign key|on delete|on update|policy|grant|revoke/);
  });
});
