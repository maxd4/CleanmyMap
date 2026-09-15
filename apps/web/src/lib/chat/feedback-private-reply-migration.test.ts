import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260915000016_feedback_private_reply_atomic.sql",
  import.meta.url,
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("feedback private reply RPC contract", () => {
  it("is append-only, service-role-only, and idempotent at the database boundary", () => {
    const sql = readMigration();

    expect(sql).toContain("add column if not exists feedback_reply_operation_id text");
    expect(sql).toContain("app_messages_feedback_reply_operation_idx");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("where feedback_reply_operation_id = btrim(p_operation_id)");
    expect(sql).toContain("already_processed");
    expect(sql).toMatch(/auth\.role\(\)[\s\S]*<>\s*'service_role'/i);
    expect(sql).toMatch(/revoke all on function public\.send_feedback_private_reply[\s\S]*from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.send_feedback_private_reply[\s\S]*to service_role/i);
  });

  it("keeps feedback, message, and audit writes in one transaction without audit content", () => {
    const sql = readMigration();
    const insertPosition = sql.indexOf("insert into public.app_messages");
    const updatePosition = sql.indexOf("update public.community_bug_reports");
    const auditPosition = sql.indexOf("insert into public.admin_operations_audit");
    const auditSection = sql.slice(auditPosition, sql.indexOf("select to_jsonb", auditPosition));

    expect(insertPosition).toBeGreaterThan(-1);
    expect(updatePosition).toBeGreaterThan(insertPosition);
    expect(auditPosition).toBeGreaterThan(updatePosition);
    expect(sql).toContain("feedback_reply_feedback_id is distinct from v_feedback.id");
    expect(auditSection).not.toContain("p_content");
    expect(auditSection).not.toMatch(/['\"]content['\"]/i);
    expect(sql).toContain("target_user_id");
  });
});
