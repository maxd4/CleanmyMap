import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000012_action_cancellation.sql"),
  "utf8",
);
const discussionMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000013_action_cancellation_discussion_read_only.sql"),
  "utf8",
);
const tombstoneMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000015_action_cancellation_tombstone_immutability.sql"),
  "utf8",
);

describe("action cancellation SQL contract", () => {
  it("uses a terminal explicit status and preserves the audit fields", () => {
    expect(migration).toContain("'cancelled'");
    expect(migration).toContain("cancelled_at timestamptz");
    expect(migration).toContain("cancelled_by_clerk_id text");
    expect(migration).toContain("cancellation_reason text");
    expect(migration).toContain("cancelled_from_status text");
    expect(migration).toContain("old.status = 'cancelled' and new.status <> 'cancelled'");
    expect(migration.toLowerCase()).not.toContain("delete from public.actions");
  });

  it("keeps canceled discussions readable but rejects new action messages", () => {
    expect(discussionMigration).toContain("p_status = 'cancelled'");
    expect(discussionMigration).toContain("create or replace function public.can_post_action_conversation");
    expect(discussionMigration).toContain("a.status = 'cancelled'");
    expect(discussionMigration).toContain("public.can_post_action_conversation(conversation_id)");
  });

  it("keeps the post predicate non-public while retaining the RLS caller role", () => {
    expect(discussionMigration).toMatch(
      /create or replace function public\.can_post_action_conversation[\s\S]+?security definer/i,
    );
    expect(discussionMigration).toContain(
      "revoke all on function public.can_post_action_conversation(uuid) from public, anon;",
    );
    expect(discussionMigration).toContain(
      "grant execute on function public.can_post_action_conversation(uuid) to authenticated, service_role;",
    );
  });

  it("blocks every changed column on an existing cancelled tombstone", () => {
    expect(tombstoneMigration).toContain("old.status = 'cancelled'");
    expect(tombstoneMigration).toContain("to_jsonb(old) is distinct from to_jsonb(new)");
    expect(tombstoneMigration).toContain("trg_prevent_cancelled_action_mutation");
    expect(tombstoneMigration).toContain("Cancelled actions are immutable historical tombstones");
  });
});
