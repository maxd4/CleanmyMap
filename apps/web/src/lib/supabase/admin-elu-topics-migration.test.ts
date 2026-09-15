import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260915000019_admin_elu_topics.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("admin_elu topics migration contract", () => {
  it("extends the existing channel constraint without changing legacy storage", () => {
    expect(migration).toContain(
      "drop constraint if exists app_messages_topic_channel_check",
    );
    expect(migration).toContain(
      "add constraint app_messages_topic_channel_check",
    );
    expect(migration).toContain("topic_id is null");
    expect(migration).toContain("channel_type = 'admin_elu'");
    for (const topicId of [
      "arbitrages",
      "priorites",
      "suivi_decisions",
      "coordination_institutionnelle",
    ]) {
      expect(migration).toContain(`'${topicId}'`);
    }
    expect(migration).not.toContain("create table");
    expect(migration).not.toContain("delete from public.app_messages");
  });

  it("keeps the notification read RPC scoped and executable by its existing roles", () => {
    expect(migration).toContain(
      "create or replace function public.mark_my_chat_notifications_read(",
    );
    expect(migration).toContain(
      "p_channel_type not in ('community', 'territory', 'admin_elu', 'dm', 'action')",
    );
    expect(migration).toContain(
      "revoke all on function public.mark_my_chat_notifications_read(text, text, text, uuid) from public, anon;",
    );
    expect(migration).toContain(
      "grant execute on function public.mark_my_chat_notifications_read(text, text, text, uuid) to authenticated, service_role;",
    );
  });
});
