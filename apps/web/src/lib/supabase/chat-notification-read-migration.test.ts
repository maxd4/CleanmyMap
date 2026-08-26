import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826050000_chat_notification_topic_read_state.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("chat notification read migration", () => {
  it("carries topic and message kind without backfilling old notifications", () => {
    expect(migration).toContain("m.topic_id");
    expect(migration).toContain("m.message_kind");
    expect(migration).toContain("'topicId', v_message.topic_id");
    expect(migration).toContain("'messageKind', v_message.message_kind");
    expect(migration).toContain("jsonb_strip_nulls");
    expect(migration).not.toContain("set payload");
  });

  it("uses one secured batch read and one idempotent batch mark operation", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_unread_chat_notification_counts()",
    );
    expect(migration).toContain(
      "create or replace function public.mark_my_chat_notifications_read(",
    );
    expect(migration).toContain("n.read_at is null");
    expect(migration).toContain("revoke all on function public.get_my_unread_chat_notification_counts() from public, anon;");
    expect(migration).toContain("revoke all on function public.mark_my_chat_notifications_read(text, text, text) from public, anon;");
    expect(migration).toContain("grant execute on function public.get_my_unread_chat_notification_counts() to authenticated, service_role;");
    expect(migration).toContain("grant execute on function public.mark_my_chat_notifications_read(text, text, text) to authenticated, service_role;");
    expect(migration).toContain(
      "nullif(btrim(n.payload ->> 'topicId'), '') is not distinct from p_topic_id",
    );
  });
});
