import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261012000018_spogomi_community_topic.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("SPOGOMI community topic migration contract", () => {
  it("extends the existing app_messages check without rewriting legacy messages", () => {
    expect(migration).toContain("drop constraint if exists app_messages_topic_channel_check");
    expect(migration).toContain("channel_type = 'community'");
    expect(migration).toContain("'spogomi'");
    expect(migration).toContain("topic_id is null");
    expect(migration).not.toMatch(/delete\s+from\s+public\.app_messages/i);
    expect(migration).not.toMatch(/update\s+public\.app_messages/i);
  });

  it("keeps notification read marking scoped to the existing channels and topics", () => {
    expect(migration).toContain("mark_my_chat_notifications_read");
    expect(migration).toContain("p_channel_type not in ('community', 'territory', 'admin_elu', 'dm', 'action')");
    expect(migration).toContain("p_topic_id in (");
    expect(migration).toContain("'spogomi'");
    expect(migration).toContain("nullif(btrim(n.payload ->> 'topicid'), '') is not distinct from p_topic_id");
  });
});
