import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261016000004_feedback_needs_info_dm_target.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("feedback needs_info DM migration contract", () => {
  it("targets the max actor while retaining the feedback context", () => {
    expect(migration).toContain("when p_decision = 'needs_info' then v_actor");
    expect(migration).toContain("'feedbackId', v_feedback.id");
    expect(migration).toContain("when p_decision = 'needs_info' then null");
    expect(migration).not.toContain("when p_decision = 'needs_info' then '/sections/messagerie'");
  });

  it("preserves the transactional and service-only qualification contract", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("insert into public.admin_operations_audit");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("v_previous_status");
    expect(migration).toContain("feedbackQualificationOperationId");
    expect(migration).toMatch(/revoke all on function public\.qualify_community_bug_report[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.qualify_community_bug_report[\s\S]*to service_role/i);
  });

  it("keeps other decisions routed to the existing feedback history", () => {
    expect(migration).toContain("else '/sections/feedback#mes-retours'");
    expect(migration).toContain("else v_feedback.submitted_by_user_id");
  });
});
