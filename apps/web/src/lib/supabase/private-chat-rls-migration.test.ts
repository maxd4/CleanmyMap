import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260926122042_relocate_action_chat_rls_helpers.sql",
  import.meta.url,
);
const migration = readFileSync(migrationPath, "utf8");
const supabaseConfig = readFileSync(
  new URL("../../../supabase/config.toml", import.meta.url),
  "utf8",
);

function sliceBetween(start: string, end: string): string {
  const startIndex = migration.indexOf(start);
  const endIndex = migration.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return migration.slice(startIndex, endIndex);
}

describe("private action chat RLS migration contract", () => {
  it("keeps the helpers outside the exposed API and grants only authenticated policy access", () => {
    expect(migration).toContain("create schema if not exists private;");
    expect(migration).toContain(
      "revoke all on schema private from public, anon, authenticated;",
    );
    expect(migration).toContain("grant usage on schema private to authenticated;");
    expect(supabaseConfig).toContain('schemas = ["public", "graphql_public"]');

    for (const functionName of [
      "can_insert_action_message_reference",
      "can_view_action_conversation",
      "can_post_action_conversation",
    ]) {
      expect(migration).toContain(`create or replace function private.${functionName}`);
      expect(migration).toContain(`grant execute on function private.${functionName}(uuid)`);
      expect(migration).toContain(`drop function if exists public.${functionName}(uuid);`);
    }

    expect(migration).not.toMatch(
      /create or replace function public\.can_(?:insert_action_message_reference|view_action_conversation|post_action_conversation)/i,
    );
  });

  it("keeps cancelled discussions readable while refusing new action messages", () => {
    const viewFunction = sliceBetween(
      "create or replace function private.can_view_action_conversation",
      "create or replace function private.can_post_action_conversation",
    );
    const postFunction = sliceBetween(
      "create or replace function private.can_post_action_conversation",
      "revoke all on function private.can_insert_action_message_reference",
    );

    expect(viewFunction).toContain("public.is_action_discussion_available(");
    expect(postFunction).toContain(
      "private.can_view_action_conversation(p_conversation_id)",
    );
    expect(postFunction).toContain("a.status = 'cancelled'");
    expect(postFunction).toContain("not exists");
  });

  it("restores the action reference guard and the post capability in app_messages", () => {
    const insertPolicy = sliceBetween(
      "create policy app_messages_insert_channels",
      "-- Poll child rows remain authenticated-only",
    );

    expect(insertPolicy).toContain(
      "(action_id is null or private.can_insert_action_message_reference(action_id))",
    );
    expect(insertPolicy).toContain(
      "private.can_post_action_conversation(conversation_id)",
    );
    expect(insertPolicy).not.toContain(
      "private.can_view_action_conversation(conversation_id)",
    );

    const referenceFunction = sliceBetween(
      "create or replace function private.can_insert_action_message_reference",
      "create or replace function private.can_view_action_conversation",
    );
    expect(referenceFunction).toContain(
      "public.is_public_action_reference_available(",
    );
  });

  it("removes the anonymous app_messages DML path and preserves every chat channel", () => {
    expect(migration).toContain(
      "revoke all privileges on table public.app_messages\n  from public, anon, authenticated, service_role;",
    );
    expect(migration).toContain(
      "grant select, insert on table public.app_messages to authenticated;",
    );

    const selectPolicy = sliceBetween(
      "create policy app_messages_select_channels",
      "drop policy if exists app_messages_insert_channels",
    );
    const insertPolicy = sliceBetween(
      "create policy app_messages_insert_channels",
      "-- Poll child rows remain authenticated-only",
    );

    expect(selectPolicy).toContain("for select\nto authenticated");
    expect(insertPolicy).toContain("for insert\nto authenticated");
    for (const channel of [
      "community",
      "dm",
      "admin_elu",
      "territory",
      "bug_report",
      "action",
    ]) {
      expect(selectPolicy + insertPolicy).toContain(`channel_type = '${channel}'`);
    }
    for (const policyName of [
      "chat_poll_options_select_visible",
      "chat_poll_options_insert_own_poll",
      "chat_poll_votes_select_own",
      "chat_poll_votes_insert_own",
      "chat_poll_votes_update_own",
      "chat_poll_votes_delete_own",
    ]) {
      expect(migration).toMatch(
        new RegExp(`create policy ${policyName}[\\s\\S]+?to authenticated`, "i"),
      );
    }
  });
});
