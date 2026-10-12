import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261012000009_spogomi_recognition_collection.sql"), "utf8");

describe("SPOGOMI recognition migration contract", () => {
  it("keeps official rankings as certified inputs and awards idempotent", () => {
    expect(migration).toContain("public.spogomi_official_rankings");
    expect(migration).toContain("status in ('certified', 'revoked')");
    expect(migration).toContain("spogomi_official_rankings_current_unique");
    expect(migration).toContain("unique (user_id, event_id, badge_type_id)");
    expect(migration).toContain("reconcile_spogomi_collection_awards");
    expect(migration).toContain("set_spogomi_recognition_attestation");
    expect(migration).toContain("SPOGOMI self-attestation is forbidden");
    expect(migration).toContain("for update");
  });

  it("does not grant browser roles access to private recognition data", () => {
    expect(migration).toMatch(/revoke all on table public\.spogomi_collection_awards from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.reconcile_spogomi_collection_awards\(uuid, jsonb, text\) to service_role/i);
    expect(migration).not.toMatch(/grant .*spogomi_collection_awards .*authenticated/i);
  });
});
