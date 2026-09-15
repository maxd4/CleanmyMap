import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const shareMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000009_action_share_requests.sql"),
  "utf8",
);
const discussionMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260915000011_action_discussion_access_contract.sql"),
  "utf8",
);

describe("action sharing and discussion SQL contracts", () => {
  it("keeps the share reference predicate on the message-reference capability", () => {
    const messageReference = shareMigration.slice(
      shareMigration.indexOf("create or replace function public.can_insert_action_message_reference"),
      shareMigration.indexOf("create or replace function public.can_view_action_conversation"),
    );

    expect(messageReference).toContain("public.is_public_action_reference_available(");
  });

  it("uses only the dedicated discussion predicate for conversation access", () => {
    expect(discussionMigration).toContain("create or replace function public.is_action_discussion_available(");
    expect(discussionMigration).toContain("create or replace function public.can_view_action_conversation(");
    expect(discussionMigration).toContain("public.is_action_discussion_available(");
    expect(discussionMigration).toContain("p_published_at is not null");
    expect(discussionMigration).toContain("coalesce(p_moderation_visibility, 'visible') <> 'hidden'");
    expect(discussionMigration).toContain("public.is_public_future_pre_action(");
    expect(discussionMigration).toContain("p_status = 'approved'");
    expect(discussionMigration).toContain("coalesce(p_action_phase, 'post_action_complete') <> 'pre_action'");
    expect(discussionMigration).not.toContain("is_public_action_reference_available");
    expect(discussionMigration).not.toContain("action_participants");
    expect(discussionMigration).not.toContain("action_conversation_members");
    expect(discussionMigration).toContain("(select auth.role()) = 'service_role'");
    expect(discussionMigration).toContain("(select auth.role()) = 'authenticated'");
    expect(discussionMigration).toContain("action_conversation_exclusions e");
  });
});
