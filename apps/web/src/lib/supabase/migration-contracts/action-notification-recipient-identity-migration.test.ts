import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261009000012_action_notification_recipient_identity.sql",
  ),
  "utf8",
);
const readerMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261009000004_action_registration_notifications.sql",
  ),
  "utf8",
);

function functionBody(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf("\nrevoke all on function", start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("action notification recipient identity migration STATIC_CONTRACT", () => {
  it("uses canonical creator and organizer identities without a profile delivery join", () => {
    const requestEmitter = functionBody("emit_action_registration_request_notifications");

    expect(requestEmitter).toContain("a.created_by_clerk_id as user_id");
    expect(requestEmitter).toContain("public.action_organizers ao");
    expect(requestEmitter).toContain("from public.profiles p");
    expect(requestEmitter).toContain("p.active_role_label in ('admin', 'max')");
    expect(requestEmitter).toContain("candidate.user_id <> ar.user_id");
    expect(requestEmitter).not.toContain("join public.profiles reviewer");
    expect(requestEmitter).not.toContain("join public.profiles");
    expect(requestEmitter).toContain("registration_source = 'group_form'");
    expect(requestEmitter).toContain("registration_status = 'pending'");
    expect(requestEmitter).toContain("on conflict do nothing");
  });

  it("delivers group_form decisions to the Clerk requester without requiring profiles", () => {
    const decisionNotifier = functionBody("notify_action_registration_decision");

    expect(decisionNotifier).toContain("old.registration_source = 'group_form'");
    expect(decisionNotifier).toContain("old.registration_status = 'pending'");
    expect(decisionNotifier).toContain("new.registration_status in ('confirmed', 'cancelled')");
    expect(decisionNotifier).toContain("new.user_id");
    expect(decisionNotifier).toContain("on conflict do nothing");
    expect(decisionNotifier).not.toContain("from public.profiles p where p.id = new.user_id");
  });

  it("keeps discussion membership canonical, confirmed-only and deduplicated", () => {
    const audience = functionBody("get_action_notification_audience");

    expect(audience).toContain("a.created_by_clerk_id as user_id");
    expect(audience).toContain("public.action_organizers ao");
    expect(audience).toContain("public.action_registrations ar");
    expect(audience).toContain("ar.registration_status = 'confirmed'");
    expect(audience).toContain("public.action_participants ap");
    expect(audience).toContain("ap.participation_status = 'confirmed'");
    expect(audience).toContain("select distinct on (ca.user_id)");
    expect(audience).not.toContain("join public.profiles");
    expect(audience).not.toContain("registration_status in ('pending', 'confirmed')");
    expect(audience).not.toContain("participation_status in ('pending', 'confirmed')");
  });

  it("retains reviewer read authorization and does not add an external volunteer audience", () => {
    const requestEmitter = functionBody("emit_action_registration_request_notifications");

    expect(requestEmitter).not.toContain("select ar.user_id");
    expect(readerMigration).toContain("a.created_by_clerk_id = p_reviewer_id");
    expect(readerMigration).toContain("ao.organizer_clerk_id = p_reviewer_id");
    expect(readerMigration).toContain("p.active_role_label in ('admin', 'max')");
    expect(readerMigration).toContain("n.user_id = p_reviewer_id");
  });
});
