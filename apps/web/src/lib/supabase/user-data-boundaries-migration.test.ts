import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261018000005_harden_user_data_rls_boundaries.sql", import.meta.url),
  "utf8",
);
const residualPrivilegesMigration = readFileSync(
  new URL("../../../supabase/migrations/20261018000010_revoke_residual_user_data_privileges.sql", import.meta.url),
  "utf8",
);

describe("user data RLS boundary migration", () => {
  it("removes anonymous privileges and keeps SRS owner writes", () => {
    expect(migration).toContain("revoke all privileges on table public.event_rsvps from public, anon;");
    expect(migration).toContain("revoke all privileges on table public.quiz_srs from public, anon;");
    expect(migration).toContain("grant select, insert, update, delete on table public.quiz_srs to authenticated;");
    expect(migration).toContain("revoke all privileges on table public.quiz_type_progress from public, anon, authenticated;");
    expect(migration).toContain("grant select on table public.quiz_type_progress to authenticated;");
  });

  it("requires a non-empty JWT subject in owner policies", () => {
    expect(migration).toMatch(/nullif\(btrim\(\(select auth\.jwt\(\) ->> 'sub'\)\), ''\) is not null/g);
    expect(migration).toContain("participant_clerk_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')");
    expect(migration).toContain("user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')");
    expect(migration).toContain("with check (");
  });

  it("limits notification updates to receipt columns and preserves service producers", () => {
    expect(migration).toContain("grant update (read_at, seen_at, acknowledged_at) on table public.app_notifications to authenticated;");
    expect(migration).toContain("create policy app_notifications_authenticated_update_read_state on public.app_notifications");
    expect(migration).toContain("create policy app_notifications_service_role on public.app_notifications");
    expect(migration).toContain("grant select, insert, update, delete on table public.app_notifications to service_role;");
  });

  it("removes residual SQL privileges from authenticated private-data access", () => {
    for (const table of ["event_rsvps", "quiz_srs"]) {
      expect(residualPrivilegesMigration).toContain(
        `revoke truncate, trigger, references\non table public.${table}\nfrom authenticated;`,
      );
    }
  });
});
