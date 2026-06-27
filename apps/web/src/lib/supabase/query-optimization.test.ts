import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("supabase query optimization migrations", () => {
  it("adds a composite index for admin audit lookups by target", () => {
    const migration = readMigration("../../../supabase/migrations/20260627000002_admin_operations_audit_target_index.sql");

    expect(migration).toContain("idx_admin_operations_audit_target_at_desc");
    expect(migration).toContain("on public.admin_operations_audit(target_id, at desc);");
  });

  it("adds service email aggregates and supporting indexes", () => {
    const migration = readMigration("../../../supabase/migrations/20260627000001_service_email_events_query_indexes.sql");

    expect(migration).toContain("idx_service_email_events_actor_created_status");
    expect(migration).toContain("sum_service_email_recipients_for_actor_since");
    expect(migration).toContain("grant execute on function public.sum_service_email_recipients_for_actor_since");
  });

  it("adds composite action participant indexes for action and user scoped reads", () => {
    const migration = readMigration("../../../supabase/migrations/20260627000003_action_participants_query_indexes.sql");

    expect(migration).toContain("idx_action_participants_action_status_created_at");
    expect(migration).toContain("idx_action_participants_user_action");
  });

  it("adds bounded community summary RPCs for RSVP and participation reads", () => {
    const migration = readMigration("../../../supabase/migrations/20260627000005_community_participation_summary_rpcs.sql");

    expect(migration).toContain("create or replace function public.load_community_event_rsvp_summaries(");
    expect(migration).toContain("create or replace function public.load_action_participant_summaries(");
    expect(migration).toContain("from public.event_rsvps");
    expect(migration).toContain("from public.action_participants");
  });
});
