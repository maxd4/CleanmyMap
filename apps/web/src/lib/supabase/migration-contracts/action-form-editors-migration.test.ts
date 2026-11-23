import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261123000005_action_form_editors.sql", import.meta.url),
  "utf8",
);

describe("action form editor migration", () => {
  it("keeps editor grants and audit private and server-only", () => {
    expect(migration).toContain("create table public.action_form_editors");
    expect(migration).toContain("create table public.action_form_editor_audit");
    expect(migration).toContain("alter table public.action_form_editors enable row level security");
    expect(migration).toContain("alter table public.action_form_editor_audit enable row level security");
    expect(migration).toContain("revoke all on public.action_form_editors, public.action_form_editor_audit from public, anon, authenticated, service_role");
    expect(migration).toContain("grant execute on function public.mutate_action_form_editor");
    expect(migration).toContain("to service_role");
  });

  it("locks, rechecks the creator/primary relationship, and atomically audits idempotent changes", () => {
    expect(migration).toContain("from public.actions where id = p_action_id for update");
    expect(migration).toContain("from public.action_organizers");
    expect(migration).toContain("is_primary");
    expect(migration).toContain("unique (action_id, request_id)");
    expect(migration).toContain("before_granted, after_granted");
    expect(migration).toContain("'admin', 'max'");
  });

  it("preserves editor grants through the existing backup restore entry point", () => {
    expect(migration).toContain("restore_action_backup_with_form_editors");
    expect(migration).toContain("restore_action_backup_with_individual_butts_lots(p_backup)");
    expect(migration).toContain("return public.restore_action_backup_with_form_editors(p_backup)");
    expect(migration).toContain("Incomplete action form editor backup tables");
  });
});
