import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261019000002_action_field_roles.sql", import.meta.url),
  "utf8",
);
const backupMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261019000003_action_field_roles_backup_restore.sql", import.meta.url),
  "utf8",
);
const lifecycleMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261019000005_action_field_roles_transfer_lifecycle.sql", import.meta.url),
  "utf8",
);

describe("action field roles migration STATIC_CONTRACT", () => {
  it("keeps field roles separate from the organizer authority and closes direct client access", () => {
    expect(migration).toContain("create table if not exists public.action_field_role_assignments");
    expect(migration).toContain("references public.action_field_role_catalog(code)");
    expect(migration).toContain("alter table public.action_field_role_assignments enable row level security");
    expect(migration).toContain("revoke all on table public.action_field_role_assignments from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.assign_action_field_roles");
    expect(migration).toContain("create unique index if not exists action_organizers_one_primary_idx");
    expect(migration).toContain("action_field_role_transfer_audit");
  });

  it("requires confirmed registrations and locks the relevant rows before mutation", () => {
    expect(migration).toContain("v_registration public.action_registrations");
    expect(migration).toMatch(/from public\.action_registrations[\s\S]*?for update;/i);
    expect(migration).toContain("v_registration.registration_status <> 'confirmed'");
    expect(migration).toContain("v_action.status not in ('pending', 'approved')");
    expect(migration).toContain("for update;");
  });

  it("extends restore transactionally without rewriting the published restore migration", () => {
    expect(backupMigration).toContain("create or replace function public.restore_action_backup_with_field_roles");
    expect(backupMigration).toContain("v_base := public.restore_action_backup(p_backup)");
    expect(backupMigration).toContain("revoke all on function public.restore_action_backup_with_field_roles");
  });

  it("keeps transfer responses action-scoped and reconciliation forward-only", () => {
    expect(lifecycleMigration).toContain("drop function if exists public.respond_action_field_role_transfer(uuid, text, text, boolean, text)");
    expect(lifecycleMigration).toContain("p_action_id uuid");
    expect(lifecycleMigration).toContain("where id = p_proposal_id and action_id = p_action_id");
    expect(lifecycleMigration).toContain("action_lifecycle_closed");
    expect(lifecycleMigration).toContain("action_field_roles_registration_boundary");
    expect(lifecycleMigration).toContain("if tg_op = 'DELETE'");
    expect(lifecycleMigration).toContain("assignment_status = 'revoked'");
    expect(lifecycleMigration).toContain("'expired'");
  });
});
