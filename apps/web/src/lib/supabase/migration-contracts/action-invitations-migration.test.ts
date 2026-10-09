import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000003_action_invitations.sql"),
  "utf8",
);

describe("action invitations migration STATIC_CONTRACT", () => {
  it("keeps draft preparation separate from publication fan-out", () => {
    expect(migration).toContain("registration_source = 'manual_add'");
    expect(migration).toContain("registration_status = 'pending'");
    expect(migration).toContain("a.published_at is not null");
    expect(migration).toContain("actions_action_invitations_on_publish");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("payload ->> 'subtype' = 'invitation'");
  });

  it("pins the notification and decision contracts", () => {
    expect(migration).toContain("'action_event'");
    expect(migration).toContain("'subtype', 'invitation'");
    expect(migration).toContain("list_pending_action_invitations_for_recipient");
    expect(migration).toContain("respond_to_action_invitation");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("registration_status = 'confirmed'");
    expect(migration).toContain("registration_status = 'cancelled'");
  });

  it("does not expose pending manual invitations as confirmed discussion audience", () => {
    const audience = migration.slice(
      migration.indexOf("create or replace function public.get_action_notification_audience("),
    );
    expect(audience).toContain("ar.registration_status = 'confirmed'");
    expect(audience).not.toContain("ar.registration_status in ('pending', 'confirmed')");
  });
});
