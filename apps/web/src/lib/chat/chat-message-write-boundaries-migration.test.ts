import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261018000007_harden_chat_message_write_boundaries.sql", import.meta.url),
  "utf8",
);

describe("chat message write boundary migration", () => {
  it("removes direct message and poll-option writes while preserving service persistence and reads", () => {
    expect(migration).toContain("revoke insert on table public.app_messages from public, anon, authenticated");
    expect(migration).toContain("grant select on table public.app_messages to authenticated");
    expect(migration).toContain("revoke insert on table public.chat_poll_options from public, anon, authenticated");
    expect(migration).toContain("grant select, insert on table public.chat_poll_options to service_role");
  });

  it("closes the invoker RPC and exposes one explicit service-only all-channel RPC", () => {
    expect(migration).toContain("revoke all on function public.create_chat_poll_with_options(");
    expect(migration).toContain("text, text, text, jsonb, text, uuid, integer, text");
    expect(migration).toContain("create_chat_poll_with_options_for_server(");
    expect(migration).toContain("p_actor_user_id text");
    expect(migration).toContain("p_channel_type text");
    expect(migration).toContain("raise exception 'server authorization required'");
    expect(migration).toContain("grant execute on function public.create_chat_poll_with_options_for_server(");
    expect(migration).toContain(") to service_role;");
  });

  it("documents that quota and Clerk authorization stay outside the persistence primitive", () => {
    expect(migration).toContain("reserveDiscussionMessageSlot");
    expect(migration).toContain("not an authorization or quota implementation");
  });
});
