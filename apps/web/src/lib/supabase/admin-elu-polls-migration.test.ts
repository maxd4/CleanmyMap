import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260915000020_admin_elu_polls.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const notificationMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260915000017_action_notification_audience.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("admin_elu polls migration contract", () => {
  it("keeps the existing poll tables and widens only their channel guards", () => {
    expect(migration).toContain("chat_poll_options_select_visible");
    expect(migration).toContain("chat_poll_options_insert_own_poll");
    expect(migration).toContain("chat_poll_votes_select_own");
    expect(migration).toContain("chat_poll_votes_insert_own");
    expect(migration).toContain("chat_poll_votes_update_own");
    expect(migration).toContain("chat_poll_votes_delete_own");
    expect(migration).toContain("channel_type in ('community', 'admin_elu')");
    expect(migration).toContain("message_kind = 'poll'");
    expect(migration).toContain("current_profile_role_label() in ('admin', 'max', 'elu')");
    expect(migration).not.toContain("create table");
  });

  it("preserves atomic creation, bounded options, and poll exclusions", () => {
    expect(migration).toContain(
      "create or replace function public.create_chat_poll_with_options(",
    );
    expect(migration).toContain("p_channel_type text");
    expect(migration).toContain("jsonb_array_length(p_option_labels) < 2");
    expect(migration).toContain("jsonb_array_length(p_option_labels) > 6");
    expect(migration).toContain("insert into public.app_messages");
    expect(migration).toContain("insert into public.chat_poll_options");
    expect(migration).toContain("p_channel_type,");
    expect(migration).toContain("related_event_id is null");
    expect(migration).toContain("revoke all on function public.create_chat_poll_with_options");
  });

  it("returns only aggregate data through the existing service RPC and counts admin_elu unread notifications", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_chat_poll_vote_summaries(",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("vote_count bigint");
    expect(migration).toContain("total_votes bigint");
    expect(migration).toContain("selected_option_id uuid");
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "n.payload ->> 'channeltype' in ('community', 'territory', 'admin_elu', 'dm', 'action')",
    );
    expect(migration).not.toContain("voter_id");
    expect(migration).not.toContain("display_name");
  });

  it("preserves the existing admin_elu notification audience and payload", () => {
    expect(notificationMigration).toContain("if v_message.channel_type = 'admin_elu' then");
    expect(notificationMigration).toContain("p.id <> v_message.sender_id");
    expect(notificationMigration).toContain("p.role_label in ('admin', 'max', 'elu')");
    expect(notificationMigration).toContain("'channeltype', v_message.channel_type");
    expect(notificationMigration).toContain("'messageid', v_message.id");
    expect(notificationMigration).toContain("'topicid', v_message.topic_id");
  });
});
