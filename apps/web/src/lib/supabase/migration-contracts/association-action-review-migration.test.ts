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
const revalidationMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000012_association_action_review_geography_revalidation.sql", import.meta.url),
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

  it("invalidates review for the persisted geographic and route owners", () => {
    expect(revalidationMigration).toContain("old.latitude is distinct from new.latitude");
    expect(revalidationMigration).toContain("old.longitude is distinct from new.longitude");
    expect(revalidationMigration).toContain("old.department_code is distinct from new.department_code");
    expect(revalidationMigration).toContain("old.derived_geometry_geojson is distinct from new.derived_geometry_geojson");
    expect(revalidationMigration).toContain("old.geometry_source is distinct from new.geometry_source");
    expect(revalidationMigration).toContain("association_action_review_material_preparation(old.preparation_data)");
    expect(revalidationMigration).toContain("formalitiescontext");
    expect(revalidationMigration).toContain("formalitiesworkflow");
    expect(revalidationMigration).toContain("review_state := 'draft'");
    expect(revalidationMigration).toContain("published_at := null");
  });

  it("keeps technical metadata outside the material preparation projection and preserves the admin bypass", () => {
    expect(revalidationMigration).toContain("'formalitiescontext', p_preparation_data -> 'formalitiescontext'");
    expect(revalidationMigration).toContain("'operationalroute', p_preparation_data -> 'operationalroute'");
    expect(revalidationMigration).not.toContain("'administrativerequirements', p_preparation_data -> 'administrativerequirements'");
    expect(revalidationMigration).not.toContain("'routeversioning', p_preparation_data -> 'routeversioning'");
    expect(revalidationMigration).toContain("current_setting('cleanmymap.association_review_transition', true) = 'on'");
    expect(revalidationMigration).toContain("if not v_transition and v_material_change then");
  });

  it("requires current persisted formalities evidence before an approval can publish", () => {
    expect(revalidationMigration).toContain("is_association_action_formalities_ready");
    expect(revalidationMigration).toContain("action-formalities-workflow-v1");
    expect(revalidationMigration).toContain("userstatus' = 'sent'");
    expect(revalidationMigration).toContain("validforqualification' = 'true'");
    expect(revalidationMigration).toContain("'stage', 'formalities'");
    expect(revalidationMigration).toContain("'status', 'formalities_not_ready'");
    expect(revalidationMigration).toContain("not_required");
  });

  it("keeps the trigger and decision RPC server-only and forward-only", () => {
    expect(revalidationMigration).toContain("create or replace function public.enforce_association_action_review_contract()");
    expect(revalidationMigration).toContain("create or replace function public.decide_association_action_review(");
    expect(revalidationMigration).toContain("revoke all on function public.decide_association_action_review");
    expect(revalidationMigration).toContain("grant execute on function public.decide_association_action_review");
    expect(revalidationMigration).toContain("set search_path = pg_catalog, public");
  });
});
