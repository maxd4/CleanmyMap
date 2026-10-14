import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261014000004_bug_report_server_only_insert.sql",
    import.meta.url,
  ),
  "utf8",
);

function insertPolicy(): string {
  const start = migration.indexOf("create policy app_messages_insert_channels");
  expect(start).toBeGreaterThanOrEqual(0);
  return migration.slice(start);
}

describe("SECURITY-03 bug_report server-only insert migration", () => {
  it("removes only the direct authenticated bug_report branch", () => {
    expect(migration).toContain(
      "drop policy if exists app_messages_insert_channels on public.app_messages;",
    );
    expect(migration).toContain("create policy app_messages_insert_channels");

    const policy = insertPolicy();
    expect(policy).not.toContain("channel_type = 'bug_report'");
    for (const channel of ["community", "dm", "territory", "action"]) {
      expect(policy).toContain(`channel_type = '${channel}'`);
    }
    expect(policy).toContain(
      "private.can_insert_action_message_reference(action_id)",
    );
    expect(policy).toContain("private.can_post_action_conversation(conversation_id)");
  });

  it("does not grant a new SQL capability or alter the read contract", () => {
    expect(migration).not.toMatch(/grant\s+.*app_messages/i);
    expect(migration).not.toMatch(/security\s+definer/i);
    expect(migration).not.toMatch(/drop policy if exists app_messages_select_channels/i);
  });
});
