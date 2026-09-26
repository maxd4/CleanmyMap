import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260926000002_chat_polls_all_channels.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("all-channel chat polls migration contract", () => {
  it("reuses the existing tables and widens their channel guards", () => {
    expect(migration).toContain(
      "channel_type in ('community', 'admin_elu', 'territory', 'action', 'dm')",
    );
    expect(migration).toContain("chat_poll_options_select_visible");
    expect(migration).toContain("chat_poll_votes_select_own");
    expect(migration).toContain("chat_poll_votes_delete_own");
    expect(migration).not.toContain("create table");
  });

  it("keeps creation atomic, attachment-free, bounded, and channel-contextual", () => {
    expect(migration).toContain(
      "create or replace function public.create_chat_poll_with_options(",
    );
    expect(migration).toContain("p_recipient_id text");
    expect(migration).toContain("p_conversation_id uuid");
    expect(migration).toContain("p_arrondissement_id integer");
    expect(migration).toContain("p_zone_name text");
    expect(migration).toContain("jsonb_array_length(p_option_labels) < 2");
    expect(migration).toContain("jsonb_array_length(p_option_labels) > 6");
    expect(migration).toContain("attachment_url");
    expect(migration).toContain("attachment_url,");
    expect(migration).toContain("attachment_type,");
    expect(migration).toContain("attachment_expires_at");
    expect(migration).toContain("insert into public.chat_poll_options");
    expect(migration).toContain("poll direct-message context is invalid");
    expect(migration).toContain("poll action context is invalid");
    expect(migration).toContain("poll territory context is invalid");
    expect(migration).toContain(
      "revoke all on function public.create_chat_poll_with_options(",
    );
  });

  it("keeps aggregate reads service-only and anonymous", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_chat_poll_vote_summaries(",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("grant execute on function public.get_my_chat_poll_vote_summaries");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("voter_id");
    expect(migration).not.toContain("display_name");
  });
});
