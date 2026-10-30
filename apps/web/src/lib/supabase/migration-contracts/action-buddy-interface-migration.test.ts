import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../../supabase/migrations/20261030000031_action_buddy_interface_notifications.sql",
  import.meta.url,
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("action buddy interface notification migration contract", () => {
  it("uses the canonical community inbox with replay-safe event keys", () => {
    expect(migration).toContain("app_notifications_action_buddy_event_unique_idx");
    expect(migration).toContain("'action_buddy_proposal_created'");
    expect(migration).toContain("'action_buddy_proposal_accepted'");
    expect(migration).toContain("'action_buddy_request_cancelled'");
    expect(migration).toContain("'community'");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(v_event_key, 0))");
    expect(migration).toContain("action_buddy_proposal_notifications");
    expect(migration).toContain("action_buddy_request_cancellation_notification");
    expect(migration).not.toContain("action_share_contact_requests");
  });

  it("keeps notification writes server-only", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("if coalesce((select auth.role()), '') <> 'service_role' then");
    expect(migration).toContain("revoke all on function public.emit_action_buddy_proposal_notification()");
    expect(migration).toContain("revoke all on function public.emit_action_buddy_request_cancellation_notification()");
  });
});
