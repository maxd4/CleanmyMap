import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000004_action_registration_notifications.sql"),
  "utf8",
);

describe("action registration notifications migration STATIC_CONTRACT", () => {
  it("notifies only published pending group_form requests and deduplicates events", () => {
    expect(migration).toContain("registration_source = 'group_form'");
    expect(migration).toContain("registration_status = 'pending'");
    expect(migration).toContain("a.published_at is not null");
    expect(migration).toContain("actions_action_registration_requests_on_publish");
    expect(migration).toContain("action_organizers_registration_requests");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("app_notifications_action_registration_event_unique_idx");
    expect(migration).toContain("candidate.user_id <> ar.user_id");
    expect(migration).toContain("registration_request:' || ar.id::text");
    expect(migration).not.toContain("ar.id::text || ':' || ar.updated_at::text");
  });

  it("keeps decisions atomic and separate from organizer invitations", () => {
    expect(migration).toContain("subtype', 'registration_request'");
    expect(migration).toContain("subtype', 'registration_decision'");
    expect(migration).toContain("old.registration_status = 'pending'");
    expect(migration).toContain("new.registration_status in ('confirmed', 'cancelled')");
    expect(migration).toContain("list_pending_action_registration_requests_for_reviewer");
    expect(migration).toContain("active_role_label in ('admin', 'max')");
    expect(migration).toContain("registration_decision:' || new.id::text || ':' || new.registration_status");
    expect(migration).toContain("coalesce((select auth.role()), '') <> 'service_role'");
  });

  it("does not create a second request queue", () => {
    expect(migration).toContain("from public.app_notifications n");
    expect(migration).toContain("n.payload ->> 'subtype' = 'registration_request'");
  });
});
