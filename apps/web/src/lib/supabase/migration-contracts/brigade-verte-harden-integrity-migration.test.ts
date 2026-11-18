import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261118000002_harden_brigade_verte_integrity.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Migration 20261118000002_harden_brigade_verte_integrity", () => {
  it("contient la mise à jour du check constraint admin_operations_audit_operation_type_check", () => {
    expect(migrationSql).toContain("ALTER TABLE public.admin_operations_audit");
    expect(migrationSql).toContain("'brigade_verte_qualification'");
  });

  it("fixe le search_path de set_brigade_verte_updated_at", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.set_brigade_verte_updated_at()");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
  });

  it("définit l'immutabilité append-only stricte sur l'historique", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.prevent_modification_brigade_verte_history()");
    expect(migrationSql).toContain("BEFORE UPDATE OR DELETE ON public.brigade_verte_qualification_history");
    expect(migrationSql).toContain("BEFORE TRUNCATE ON public.brigade_verte_qualification_history");
  });

  it("révoque les privilèges anon/authenticated et n'accorde que service_role", () => {
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.brigade_verte_qualifications FROM anon, authenticated, public");
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.brigade_verte_qualification_history FROM anon, authenticated, public");
    expect(migrationSql).toContain("GRANT ALL ON TABLE public.brigade_verte_qualifications TO service_role");
    expect(migrationSql).toContain("GRANT ALL ON TABLE public.brigade_verte_qualification_history TO service_role");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS \"Brigade verte qualifications: lecture publique actives\"");
  });

  it("définit la RPC atomique qualify_brigade_verte_action avec verrouillage et sécurité", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.qualify_brigade_verte_action");
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    expect(migrationSql).toContain("pg_advisory_xact_lock");
    expect(migrationSql).toContain("v_action.action_date < CURRENT_DATE");
    expect(migrationSql).toContain("REVOKE ALL ON FUNCTION public.qualify_brigade_verte_action");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role");
  });

  it("définit la RPC atomique revoke_brigade_verte_qualification avec verrouillage et audit", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.revoke_brigade_verte_qualification");
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    expect(migrationSql).toContain("pg_advisory_xact_lock");
    expect(migrationSql).toContain("REVOKE ALL ON FUNCTION public.revoke_brigade_verte_qualification");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) TO service_role");
  });
});
