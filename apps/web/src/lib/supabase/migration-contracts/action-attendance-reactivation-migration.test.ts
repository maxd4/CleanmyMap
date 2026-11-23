import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261123000006_action_attendance_explicit_reactivation.sql", import.meta.url),
  "utf8",
);
const registryMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261122000014_private_action_attendance_registry.sql", import.meta.url),
  "utf8",
);

describe("private attendance explicit reactivation migration", () => {
  it("uses an active-row partial unique index without changing the published P1 migration", () => {
    expect(migration).toContain("drop index public.action_attendance_entries_action_clerk_unique");
    expect(migration).toMatch(/on public\.action_attendance_entries\(action_id, clerk_user_id\)\s+where clerk_user_id is not null and deleted_at is null/i);
    expect(registryMigration).toContain("on public.action_attendance_entries(action_id, clerk_user_id)");
    expect(migration).not.toMatch(/drop\s+(?:table|column)\s+public\.action_attendance_entries/i);
  });

  it("restores only through explicit add and preserves an unknown, audited stable identity", () => {
    expect(migration).toMatch(/if v_entry\.deleted_at is null then\s+raise exception 'entry_already_linked'/i);
    expect(migration).toContain("v_before := to_jsonb(v_entry)");
    expect(migration).toContain("provenance = 'organizer_link'");
    expect(migration).toContain("attendance_status = 'unknown'");
    expect(migration).toContain("observed_at = null");
    expect(migration).toContain("deleted_at = null");
    expect(migration).toContain("revision = revision + 1");
    expect(migration).toMatch(/before_value, after_value/);
  });

  it("prevents confirmed-registration sync from creating or reviving a deleted identity", () => {
    expect(migration).toMatch(/e\.clerk_user_id = new\.user_id\s+and e\.deleted_at is not null[\s\S]*?return new/i);
    expect(migration).toContain("where clerk_user_id is not null and deleted_at is null");
    expect(migration).not.toMatch(/insert\s+into\s+public\.action_participants|progression_events|xp_audit/i);
  });

  it("keeps the mutation RPC restricted to the server role", () => {
    expect(migration).toMatch(/revoke all on function public\.mutate_action_attendance_entry\([^;]+from public, anon, authenticated/i);
    expect(migration).toContain("grant execute on function public.mutate_action_attendance_entry");
    expect(migration).toContain("to service_role");
  });
});
