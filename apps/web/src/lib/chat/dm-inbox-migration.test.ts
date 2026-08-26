import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260825210000_chat_dm_inbox_read_state.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const permissionsMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260825230000_harden_chat_dm_inbox_rpc_permissions.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const topicsMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826000000_chat_message_topics.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const announcementsMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826010000_chat_announcements.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const pollsMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826020000_chat_polls.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

it("creates an isolated per-user, per-peer read cursor with RLS", () => {
  expect(migration).toContain("create table if not exists public.chat_dm_read_states");
  expect(migration).toContain("primary key (user_id, peer_id)");
  expect(migration).toContain("constraint chat_dm_read_states_distinct_users check (user_id <> peer_id)");
  expect(migration).toContain("alter table public.chat_dm_read_states enable row level security");
  expect(migration).toContain("for select\nusing (user_id = coalesce(auth.jwt() ->> 'sub', ''))");
  expect(migration).toContain("for update\nusing (user_id = coalesce(auth.jwt() ->> 'sub', ''))");
  expect(migration).toContain("grant select, insert, update on table public.chat_dm_read_states to authenticated, service_role");
  expect(migration).not.toContain("grant delete on table public.chat_dm_read_states");
});

it("counts only incoming DM messages after the own cursor", () => {
  expect(migration).toContain("m.channel_type = 'dm'");
  expect(migration).toContain("m.sender_id <> c.user_id");
  expect(migration).toContain("m.recipient_id = c.user_id");
  expect(migration).toContain("m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)");
  expect(migration).toContain("create or replace function public.list_my_dm_conversations()");
  expect(migration).toContain("security invoker");
});

it("keeps read marking monotone and rejects self or unknown peers", () => {
  expect(migration).toContain("create or replace function public.mark_my_dm_conversation_read(p_peer_id text)");
  expect(migration).toContain("v_user_id = v_peer_id");
  expect(migration).toContain("dm peer not found");
  expect(migration).toContain("greatest(");
  expect(migration).toContain("revoke all on function public.mark_my_dm_conversation_read(text) from public");
  expect(migration).toContain("grant execute on function public.mark_my_dm_conversation_read(text) to authenticated, service_role");
});

it("removes the default anon EXECUTE grant from both inbox RPCs", () => {
  expect(permissionsMigration).toContain(
    "revoke all on function public.list_my_dm_conversations() from public, anon",
  );
  expect(permissionsMigration).toContain(
    "revoke all on function public.mark_my_dm_conversation_read(text) from public, anon",
  );
  expect(permissionsMigration).toContain(
    "grant execute on function public.list_my_dm_conversations() to authenticated, service_role",
  );
  expect(permissionsMigration).toContain(
    "grant execute on function public.mark_my_dm_conversation_read(text) to authenticated, service_role",
  );
});

it("adds nullable topic storage with strict channel integrity and a filtered index", () => {
  expect(topicsMigration).toContain(
    "add column if not exists topic_id text",
  );
  expect(topicsMigration).toContain(
    "constraint app_messages_topic_channel_check",
  );
  expect(topicsMigration).toContain("topic_id is null");
  expect(topicsMigration).toContain("channel_type = 'community'");
  expect(topicsMigration).toContain("channel_type = 'territory'");
  expect(topicsMigration).toContain(
    "create index if not exists idx_app_messages_topic_created_at",
  );
  expect(topicsMigration).toContain("where topic_id is not null");
  expect(topicsMigration).not.toContain("update public.app_messages");
});

it("adds announcement kinds with a canonical event FK and channel constraints", () => {
  expect(announcementsMigration).toContain(
    "add column if not exists message_kind text not null default 'message'",
  );
  expect(announcementsMigration).toContain(
    "add column if not exists related_event_id uuid",
  );
  expect(announcementsMigration).toContain(
    "constraint app_messages_message_kind_check",
  );
  expect(announcementsMigration).toContain(
    "constraint app_messages_announcement_channel_check",
  );
  expect(announcementsMigration).toContain("channel_type = 'community'");
  expect(announcementsMigration).toContain(
    "constraint app_messages_related_event_kind_check",
  );
  expect(announcementsMigration).toContain(
    "references public.community_events(id)",
  );
  expect(announcementsMigration).toContain("on delete set null");
});

it("adds poll options with atomic RPC, ordering, cascade and RLS boundaries", () => {
  expect(pollsMigration).toContain("create table if not exists public.chat_poll_options");
  expect(pollsMigration).toContain("references public.app_messages(id) on delete cascade");
  expect(pollsMigration).toContain("chat_poll_options_position_check");
  expect(pollsMigration).toContain("chat_poll_options_label_check");
  expect(pollsMigration).toContain("unique (message_id, position)");
  expect(pollsMigration).toContain("idx_chat_poll_options_message_label_unique");
  expect(pollsMigration).toContain("enable row level security");
  expect(pollsMigration).toContain("chat_poll_options_insert_own_poll");
  expect(pollsMigration).toContain("validate_chat_poll_option_parent");
  expect(pollsMigration).toContain("create_chat_poll_with_options(text, text, jsonb)");
  expect(pollsMigration).toContain("grant execute on function public.create_chat_poll_with_options");
  expect(pollsMigration).toContain("message_kind in ('message', 'announcement', 'poll')");
  expect(pollsMigration).toContain("message_kind = 'poll'");
  expect(pollsMigration).toContain("message_kind <> 'poll'");
  expect(pollsMigration).toContain("related_event_id is null");
  expect(pollsMigration).toContain("attachment_url is null");
});
