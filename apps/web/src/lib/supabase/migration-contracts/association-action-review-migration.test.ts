import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000008_association_action_review.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();
const securityMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000009_association_action_review_chat_security.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("association action review migration STATIC_CONTRACT", () => {
  it("separates review from moderation and preserves historical rows", () => {
    expect(migration).toContain("review_state text not null default 'not_required'");
    expect(migration).toContain("association");
    expect(migration).toContain("student_association");
    expect(migration).toContain("where review_state is null");
    expect(migration).toContain("review_state in ('not_required', 'draft', 'pending_review', 'approved', 'rejected')");
  });

  it("makes owner submission and admin decisions server-only and atomic", () => {
    expect(migration).toContain("submit_association_action_review");
    expect(migration).toContain("decide_association_action_review");
    expect(migration).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(migration).toContain("from public.actions where id = p_action_id for update");
    expect(migration).toContain("insert into public.admin_operations_audit");
    expect(migration).toContain("association_action_publish_approved");
    expect(migration).toContain("association_action_publish_rejected");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("closes public visibility and group access before approval", () => {
    expect(migration).toContain("coalesce(review_state, 'not_required') in ('not_required', 'approved')");
    expect(migration).toContain("is_public_future_pre_action_reviewed");
    expect(migration).toContain("published_at = null");
    expect(migration).toContain("review_state := 'draft'");
  });

  it("keeps the action-chat reference helper private and review-aware", () => {
    expect(securityMigration).toContain("revoke all on function public.can_insert_action_message_reference(uuid) from public, anon, authenticated");
    expect(securityMigration).toContain("create or replace function private.can_insert_action_message_reference");
    expect(securityMigration).toContain("is_public_future_pre_action_reviewed");
  });
});
