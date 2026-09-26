import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927000006_chat_notification_service_actor.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("chat notification service actor migration", () => {
  it("replaces the legacy signature with a service-only actor-bound RPC", () => {
    expect(migration).toContain(
      "drop function if exists public.create_chat_notifications_for_message(uuid);",
    );
    expect(migration).toMatch(
      /create or replace function public\.create_chat_notifications_for_message\(\s*p_message_id uuid,\s*p_actor_user_id text\s*\)/i,
    );
    expect(migration).toContain("if coalesce((select auth.role()), '') <> 'service_role'");
    expect(migration).toContain("if p_actor_user_id is null or v_message.sender_id <> p_actor_user_id");
    expect(migration).not.toContain("auth.jwt()");
    expect(migration).toContain(
      "revoke all on function public.create_chat_notifications_for_message(uuid, text)",
    );
    expect(migration).toContain(
      "grant execute on function public.create_chat_notifications_for_message(uuid, text)",
    );
    expect(migration).toContain("to service_role;");
  });

  it("preserves every audience branch, sender exclusion, and idempotence guard", () => {
    for (const channelType of ["action", "dm", "community", "bug_report", "admin_elu", "territory"]) {
      expect(migration).toContain(`v_message.channel_type = '${channelType}'`);
    }
    expect(migration).toContain("audience.user_id <> v_message.sender_id");
    expect(migration).toContain("p.id <> v_message.sender_id");
    expect(migration).toContain("not exists");
    expect(migration).toContain("coalesce(n.payload ->> 'messageId', '') = v_message.id::text");
  });

  it("targets one DM recipient, never the sender, and remains idempotent", () => {
    const dmBranch = migration.slice(
      migration.indexOf("if v_message.channel_type = 'dm'"),
      migration.indexOf("if v_message.channel_type = 'bug_report'"),
    );

    expect(dmBranch).toContain("select v_message.recipient_id");
    expect(dmBranch).not.toContain("select v_message.sender_id");
    expect(dmBranch).toContain("v_message.recipient_id <> v_message.sender_id");
    expect(dmBranch).toContain("not exists");
    expect(dmBranch).toContain("coalesce(n.payload ->> 'channelType', '') = 'dm'");
  });
});
