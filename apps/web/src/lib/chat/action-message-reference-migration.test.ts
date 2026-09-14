import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(new URL("../../../supabase/migrations/20260915000002_action_message_references.sql", import.meta.url));

describe("action message reference migration", () => {
  it("keeps external shares lightweight and constrained", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("add column if not exists action_id uuid");
    expect(sql).toContain("app_messages_action_message_reference_check");
    expect(sql).toContain("message_kind = 'message'");
    expect(sql).toContain("channel_type in ('community', 'territory', 'dm')");
    expect(sql).toContain("attachment_type is null");
    expect(sql).toContain("can_insert_action_message_reference");
    expect(sql).toContain("a.action_phase = 'pre_action'");
    expect(sql).toContain("action_id, created_at desc, id desc");
    expect(sql).toContain("coalesce(v_message.action_id, v_message.conversation_action_id)");
  });
});
