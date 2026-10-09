import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261009000010_moderation_and_administrative_notifications.sql",
  ),
  "utf8",
);

describe("moderation and administrative notifications migration STATIC_CONTRACT", () => {
  it("deduplicates moderation decisions without rewriting notification history", () => {
    expect(migration).toContain("app_notifications_moderation_event_unique_idx");
    expect(migration).toContain("type = 'validation'");
    expect(migration).toContain("payload ->> 'eventKey'");
    expect(migration).not.toContain("delete from public.app_notifications");
  });

  it("only emits grouped organizer reminders for published future pending requirements", () => {
    expect(migration).toContain(
      "emit_action_administrative_requirement_notifications",
    );
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain(
      "administrativeRequirements,status}', 'pending",
    );
    expect(migration).toContain("from public.action_organizers ao");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("subtype', 'administrative_requirements'");
    expect(migration).toContain("grant execute on function public.emit_action_administrative_requirement_notifications(uuid)");
    expect(migration).not.toContain("admin_clerk_id");
  });
});
