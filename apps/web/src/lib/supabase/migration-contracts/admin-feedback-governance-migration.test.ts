import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000007_admin_feedback_governance.sql", import.meta.url),
  "utf8",
);
const statusReasonMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000015_feedback_status_audit_reason.sql", import.meta.url),
  "utf8",
);

describe("admin feedback governance migration contract", () => {
  it("persists priority and logical removal metadata without a second feedback table", () => {
    expect(migration).toContain("add column if not exists priority text not null default 'normal'");
    expect(migration).toContain("add column if not exists removed_at timestamptz");
    expect(migration).toContain("community_bug_reports_priority_check");
    expect(migration).toContain("idx_community_bug_reports_active_priority_created");
    expect(migration).not.toContain("create table public.community_bug_reports");
  });

  it("keeps the audit append-only and exposes only server-side RPC execution", () => {
    expect(migration).toContain("revoke update, delete on table public.admin_operations_audit");
    expect(migration).toContain("prevent_admin_operations_audit_mutation");
    expect(migration).toContain("create policy admin_operations_audit_service_read_insert");
    expect(migration).toContain("grant execute on function public.change_community_bug_report_priority");
    expect(migration).toContain("grant execute on function public.remove_community_bug_report_from_active_queue");
  });

  it("uses row locks, expected state checks and one audit operation per mutation", () => {
    expect(migration.match(/for update/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration).toContain("p_expected_priority");
    expect(migration).toContain("p_expected_creator_state");
    expect(migration).toContain("feedback_priority_changed");
    expect(migration).toContain("feedback_state_changed");
    expect(migration).toContain("feedback_removed_from_active_queue");
  });

  it("requires and persists the administrative reason in the transactional status RPC", () => {
    expect(statusReasonMigration).toContain("p_reason text");
    expect(statusReasonMigration).toContain("char_length(v_reason) < 5");
    expect(statusReasonMigration).toContain("char_length(v_reason) > 500");
    expect(statusReasonMigration).toContain("'reason', v_reason");
    expect(statusReasonMigration).toContain("'previousValue'");
    expect(statusReasonMigration).toContain("'newValue'");
    expect(statusReasonMigration).toContain("revoke all on function public.update_community_bug_report_status(uuid, text, text, text, text, text)");
    expect(statusReasonMigration).toContain("from public, anon, authenticated, service_role");
    expect(statusReasonMigration).toContain("grant execute on function public.update_community_bug_report_status(uuid, text, text, text, text, text, text)");
    expect(statusReasonMigration).toContain("to service_role");
  });
});
