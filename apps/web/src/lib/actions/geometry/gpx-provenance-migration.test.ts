import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261030000011_secure_gpx_provenance_and_initial_contributions.sql", import.meta.url),
  "utf8",
);

describe("GPX provenance migration STATIC_CONTRACT", () => {
  it("keeps planned and candidate-file imports out of the compatibility trigger", () => {
    expect(migration).toContain("create or replace function public.record_initial_action_geometry_contribution()");
    expect(migration).toContain("gpx_import ->> 'intent' = 'planned'");
    expect(migration).toContain("jsonb_typeof(gpx_import -> 'files') = 'array'");
    expect(migration).toContain("public.record_action_geometry_contribution(");
  });

  it("keeps the canonical projection server-owned and preserves candidate metadata", () => {
    expect(migration).toContain("create or replace function public.refresh_action_geometry_coverage(p_action_id uuid)");
    expect(migration).toContain("jsonb_set(next_preparation, '{gpxImport}', gpx_import, true)");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toContain("revoke all privileges on function public.record_initial_action_geometry_contribution()");
    expect(migration).toContain("grant execute on function public.public_action_map_preparation(jsonb)");
    expect(migration).not.toMatch(/grant execute on function public\.record_action_geometry_contribution[\s\S]*to anon/i);
    expect(migration).not.toContain("'planned'::jsonb");
  });
});
