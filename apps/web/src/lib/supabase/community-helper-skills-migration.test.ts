import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261030000028_harden_community_helper_skills_replacement.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("community helper skills replacement migration", () => {
  it("serializes complete replacements by user and keeps the RPC server-only", () => {
    expect(migration).toContain(
      "perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));",
    );
    expect(migration).toContain(
      "revoke insert, update, delete\n  on table public.community_helper_skills\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select\n  on table public.community_helper_skills\n  to authenticated, service_role;",
    );
    expect(migration).toContain(
      "grant insert, update, delete\n  on table public.community_helper_skills\n  to service_role;",
    );
    expect(migration).toContain(
      "grant execute on function public.replace_community_helper_skills(text, text[])\n  to service_role;",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete)[^;]*\bto\s+(?:public|anon|authenticated)\b/i,
    );
  });

  it("locks before validation writes and preserves the canonical taxonomy", () => {
    const lockIndex = migration.indexOf(
      "perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));",
    );
    const deleteIndex = migration.indexOf(
      "delete from public.community_helper_skills",
    );
    expect(lockIndex).toBeGreaterThan(-1);
    expect(lockIndex).toBeLessThan(deleteIndex);
    for (const category of [
      "materiel",
      "transport",
      "renfort_benevole",
      "communication",
      "photo_video",
      "cartographie",
      "expertise",
      "logistique",
    ]) {
      expect(migration).toContain(`'${category}'`);
    }
    expect(migration).toContain("from unnest(p_categories) as categories(category);");
  });
});
