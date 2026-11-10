import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261110000004_spogomi_division_routes.sql", import.meta.url), "utf8");

describe("SPOGOMI planned route migration STATIC_CONTRACT", () => {
  it("keeps legacy shared routes and adds division-scoped uniqueness", () => {
    expect(migration).toContain("division_id uuid");
    expect(migration).toContain("spogomi_event_routes_shared_event_unique");
    expect(migration).toContain("spogomi_event_routes_division_unique");
    expect(migration).toContain("spogomi_event_route_revisions");
    expect(migration).toContain("reference_media_id");
    expect(migration).toContain("official_reference",);
  });

  it("requires server-side revision and state guards without confusing planned and observed geometry", () => {
    expect(migration).toContain("spogomi_upsert_planned_route");
    expect(migration).toContain("p_expected_revision");
    expect(migration).toContain("p_change_reason");
    expect(migration).toContain("serialization_failure");
    expect(migration).toContain("composition_locked");
    expect(migration).toContain("never an observed field trace");
    expect(migration).toContain("spogomi_route_coverage_complete");
  });
});
