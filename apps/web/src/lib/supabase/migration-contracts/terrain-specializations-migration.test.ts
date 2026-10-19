import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20261019000007_gamification_terrain_specializations.sql"),
  "utf8",
);

describe("terrain specialization migration contract", () => {
  it("extends the existing role catalog without introducing a second ledger", () => {
    expect(migration).toContain("organizer_primary");
    expect(migration).toContain("coorganizer");
    expect(migration).toContain("action_field_role_catalog");
    expect(migration).not.toMatch(/create table[\s\S]+progression_events/i);
    expect(migration).not.toMatch(/create table[\s\S]+xp/i);
  });

  it("requires organizer provenance at attestation time and keeps the trigger server-owned", () => {
    expect(migration).toContain("organizer.is_primary = v_expected_primary");
    expect(migration).toContain("enforce_organizer_role_attestation_provenance");
    expect(migration).toContain("revoke all on function public.enforce_organizer_role_attestation_provenance()");
  });
});
