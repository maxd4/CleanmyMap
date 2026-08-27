import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260827110000_chat_poll_vote_summary_invoker.sql",
  import.meta.url,
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("chat poll vote summary hardening", () => {
  it("aggregates only the authorized poll list for the requested Clerk user", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /create or replace function public\.get_my_chat_poll_vote_summaries\(\s*p_message_ids uuid\[\],\s*p_user_id text\s*\)[\s\S]+?returns table \([\s\S]+?message_id uuid[\s\S]+?option_id uuid[\s\S]+?vote_count bigint[\s\S]+?total_votes bigint[\s\S]+?selected_option_id uuid/i,
    );
    expect(sql).toMatch(/language sql[\s\S]+?security invoker[\s\S]+?set search_path = pg_catalog/i);
    expect(sql).toMatch(/p_message_ids[\s\S]+?m\.id = any\(coalesce\(p_message_ids/i);
    expect(sql).toMatch(/v\.user_id = p_user_id/i);
    const returnsTable = sql.match(/returns table \(([\s\S]+?)\)\s*language/i)?.[1] ?? "";
    expect(returnsTable).not.toMatch(/user_id/i);
    expect(sql).not.toMatch(/security definer/i);
  });

  it("removes the old signature and exposes the replacement only to service_role", () => {
    const sql = readMigration();

    expect(sql).toMatch(/drop function if exists public\.get_my_chat_poll_vote_summaries\(uuid\[\]\);/i);
    expect(sql).toMatch(
      /revoke all on function public\.get_my_chat_poll_vote_summaries\(uuid\[\],\s*text\)\s+from public, anon, authenticated;/i,
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_chat_poll_vote_summaries\(uuid\[\],\s*text\)\s+to service_role;/i,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.get_my_chat_poll_vote_summaries\([^)]*\) to authenticated/i,
    );
  });
});
