import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261009000011_action_reminders_and_notification_preferences.sql"),
  "utf8",
);

describe("action reminders and notification preferences migration STATIC_CONTRACT", () => {
  it("uses the single maintenance path, Paris J-1 and confirmed registrations only", () => {
    expect(migration).toContain("emit_action_j1_reminders");
    expect(migration).toContain("at time zone 'Europe/Paris'");
    expect(migration).toContain("a.action_date = v_reminder_date");
    expect(migration).toContain("ar.registration_status = 'confirmed'");
    expect(migration).toContain("coalesce(np.action_reminders_enabled, true)");
    expect(migration).toContain("a.status in ('pending', 'approved')");
    expect(migration).not.toContain("registration_status = 'pending'");
    expect(migration).not.toContain("registration_status = 'cancelled'");
  });

  it("is idempotent and does not derive a new key from an edited action date", () => {
    expect(migration).toContain("app_notifications_action_reminder_unique_idx");
    expect(migration).toContain("'action_reminder:j-1:' || a.id::text");
    expect(migration).toContain("on conflict do nothing");
    expect(migration).toContain("'timezone', 'Europe/Paris'");
  });

  it("keeps preference and mute data user-scoped and service-role delivery server-only", () => {
    expect(migration).toContain("alter table public.notification_preferences enable row level security");
    expect(migration).toContain("user_id = coalesce((select auth.jwt()) ->> 'sub', '')");
    expect(migration).toContain("notification_information_mutes");
    expect(migration).toContain("coalesce((select auth.role()), '') <> 'service_role'");
    expect(migration).toContain("grant execute on function public.emit_action_j1_reminders(timestamptz)");
  });
});
