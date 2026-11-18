import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261118000003_brigade_verte_qualification_reason_and_history.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Migration 20261118000003_brigade_verte_qualification_reason_and_history", () => {
  it("ajoute la colonne qualification_reason aux tables qualifications et historique", () => {
    expect(migrationSql).toContain("ALTER TABLE public.brigade_verte_qualifications");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS qualification_reason text");
    expect(migrationSql).toContain("ALTER TABLE public.brigade_verte_qualification_history");
  });

  it("répare les données antérieures en préservant le trigger d'immutabilité", () => {
    expect(migrationSql).toContain("DISABLE TRIGGER trg_protect_brigade_verte_history_mod");
    expect(migrationSql).toContain("ENABLE TRIGGER trg_protect_brigade_verte_history_mod");
    expect(migrationSql).toContain("qualification_reason = revocation_reason");
  });

  it("met à jour qualify_brigade_verte_action avec qualification_reason distinct de revocation_reason", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.qualify_brigade_verte_action");
    expect(migrationSql).toContain("qualification_reason,");
    expect(migrationSql).toContain("revocation_reason,");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.qualify_brigade_verte_action(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role");
  });

  it("met à jour revoke_brigade_verte_qualification avec revocation_reason et qualification_reason à NULL", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.revoke_brigade_verte_qualification");
    expect(migrationSql).toContain("revocation_reason,");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.revoke_brigade_verte_qualification(UUID, TEXT, TEXT, TEXT) TO service_role");
  });
});
