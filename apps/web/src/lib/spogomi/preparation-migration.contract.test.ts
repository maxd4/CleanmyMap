import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000002_spogomi_preparation.sql", import.meta.url), "utf8");

describe("SPOGOMI preparation migration STATIC_CONTRACT", () => {
  it("keeps recovery, private roster and official-route provenance explicit", () => {
    expect(migration).toContain("PARTIAL_ALLOWED");
    expect(migration).toContain("spogomi_event_creation_attempts");
    expect(migration).toContain("unique (event_id, content_sha256)");
    expect(migration).toContain("spogomi_event_routes");
    expect(migration).toContain("official_reference");
    expect(migration).toContain("reference_distance_km");
    expect(migration).toMatch(/revoke all on table public\.spogomi_roster_imports from public, anon, authenticated/i);
    expect(migration).not.toMatch(/grant select on table public\.spogomi_participants to authenticated/i);
  });
});
