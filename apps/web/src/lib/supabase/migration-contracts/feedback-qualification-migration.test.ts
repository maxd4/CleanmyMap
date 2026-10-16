import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261016000003_feedback_relevance_qualification.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("feedback qualification migration contract", () => {
  it("stores qualification separately from technical processing status", () => {
    expect(migration).toContain("qualification_status text not null default 'pending'");
    expect(migration).toContain("qualification_reason text");
    expect(migration).toContain("qualification_decided_at timestamptz");
    expect(migration).toContain("qualification_decided_by_user_id text");
    expect(migration).toContain("qualification_duplicate_feedback_id uuid");
    expect(migration).toContain(
      "qualification_status in ('pending', 'needs_info', 'accepted', 'duplicate', 'rejected')",
    );
    expect(migration).toContain("on delete set null");
  });

  it("keeps the decision, audit and notification in one service-only transaction", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("insert into public.admin_operations_audit");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("feedbackQualificationOperationId");
    expect(migration).toContain("'channelType', case when p_decision = 'needs_info' then 'dm'");
    expect(migration).toContain("'recipientId', v_feedback.submitted_by_user_id");
    expect(migration).toMatch(/revoke all on function public\.qualify_community_bug_report[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.qualify_community_bug_report[\s\S]*to service_role/i);
    expect(migration).not.toMatch(/insert into public\.[a-z_]*xp/i);
    expect(migration).not.toMatch(/update public\.[a-z_]*xp/i);
  });

  it("validates reasons and duplicate references before mutating the row", () => {
    expect(migration).toContain("Qualification reason is required");
    expect(migration).toContain("Duplicate feedback reference is required");
    expect(migration).toContain("status', 'duplicate_not_found'");
    expect(migration).toContain("v_previous_status");
    expect(migration).toContain("v_previous_duplicate");
  });
});
