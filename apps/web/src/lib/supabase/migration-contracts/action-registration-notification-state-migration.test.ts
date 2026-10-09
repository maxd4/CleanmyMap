import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000006_action_registration_notification_state.sql"),
  "utf8",
);

describe("action registration notification state migration STATIC_CONTRACT", () => {
  it("persists the reviewer decision on the existing notification event", () => {
    expect(migration).toContain("sync_action_registration_review_notification_state");
    expect(migration).toContain("old.registration_source = 'group_form'");
    expect(migration).toContain("old.registration_status = 'pending'");
    expect(migration).toContain("new.registration_status in ('confirmed', 'cancelled')");
    expect(migration).toContain("n.payload ->> 'requestKind' = 'registration_request'");
    expect(migration).toContain("'{decisionState}'");
    expect(migration).toContain("'\"treated\"'::jsonb");
    expect(migration).toContain("grant execute on function public.sync_action_registration_review_notification_state()");
  });
});
