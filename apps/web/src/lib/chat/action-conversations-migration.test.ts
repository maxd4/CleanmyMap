import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260915000001_action_conversations.sql"), "utf8");

describe("action conversation migration contract", () => {
  it("keeps one canonical conversation per action and separates chat access from participation", () => {
    expect(migration).toContain("action_id uuid not null unique references public.actions");
    expect(migration).toContain("primary key (conversation_id, user_id)");
    expect(migration).toContain("create trigger actions_action_conversation_on_publish");
    expect(migration).toContain("ensure_action_conversation_member");
    expect(migration).toContain("on conflict (conversation_id, user_id) do nothing");
    expect(migration).toContain("channel_type = 'action'");
  });

  it("does not expose drafts and preserves the notification RPC path", () => {
    expect(migration).toContain("a.published_at is not null");
    expect(migration).toContain("create or replace function public.create_chat_notifications_for_message");
    expect(migration).toContain("p_action_id uuid default null");
    expect(migration).toContain("grant execute on function public.ensure_action_conversation_member(uuid, text) to service_role");
  });
});
