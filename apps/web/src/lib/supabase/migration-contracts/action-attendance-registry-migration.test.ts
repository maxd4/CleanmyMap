import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261122000014_private_action_attendance_registry.sql", import.meta.url),
  "utf8",
);

describe("private action attendance registry migration", () => {
  it("keeps identities private and unique only for linked Clerk accounts", () => {
    expect(migration).toContain("alter table public.action_attendance_entries enable row level security");
    expect(migration).toContain("revoke all on public.action_attendance_entries, public.action_attendance_entry_audit from public, anon, authenticated");
    expect(migration).toContain("where clerk_user_id is not null");
    expect(migration).not.toMatch(/unique\s*\(\s*action_id\s*,\s*display_label/i);
    expect(migration).toContain("grant execute on function public.mutate_action_attendance_entry");
  });

  it("syncs only confirmed registrations and preserves independent attendance", () => {
    expect(migration).toContain("if new.registration_status <> 'confirmed' then");
    expect(migration).toContain("'confirmed_registration', 'unknown'");
    expect(migration).toContain("on conflict (action_id, clerk_user_id) where clerk_user_id is not null do nothing");
    expect(migration).not.toMatch(/update\s+public\.action_attendance_entries\s+set\s+attendance_status\s*=\s*'absent'/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.action_participants/i);
  });

  it("uses locked revisions, idempotency, audit snapshots and the effective start", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("v_entry.revision <> p_expected_revision");
    expect(migration).toContain("unique (action_id, request_id)");
    expect(migration).toContain("before_value, after_value");
    expect(migration).toContain("now() < v_start_at");
  });
});
