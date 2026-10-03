import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration00005 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000005_canonical_geometry_contributor_contract.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration00006 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000006_public_observed_geometry_coverage.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration00007 = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000007_sanitize_actions_map_feed_coverage.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("canonical observed geometry contributor contract STATIC_CONTRACT", () => {
  it("uses one eligibility owner without role-based terrain elevation", () => {
    expect(migration00005).toMatch(
      /create or replace function public\.is_action_geometry_contributor_eligible\([\s\S]*?security definer[\s\S]*?set search_path = public, pg_catalog/i,
    );
    expect(migration00005).toMatch(/a\.created_by_clerk_id = trim\(p_contributor_clerk_id\)/i);
    expect(migration00005).toMatch(/action_organizers[\s\S]*organizer_clerk_id/i);
    expect(migration00005).toMatch(/action_participants[\s\S]*participation_status = 'confirmed'/i);
    expect(migration00005).toMatch(/action_registrations[\s\S]*registration_status = 'confirmed'/i);
    expect(migration00005).not.toMatch(/role\s*=|active_role|is_admin|is_max/i);
  });

  it("keeps accepted identities accepted and refreshes on the same conflict key", () => {
    expect(migration00005).toMatch(/existing_state = 'accepted' or eligible then 'accepted'/i);
    expect(migration00005).toMatch(/on conflict \(action_id, contributor_clerk_id, source, source_fingerprint\)/i);
    expect(migration00005).toMatch(/validation_state = case[\s\S]*excluded\.validation_state = 'accepted'/i);
    expect(migration00005).toMatch(/refusal_reason = case[\s\S]*then null/i);
    expect(migration00005).toMatch(/perform public\.refresh_action_geometry_coverage\(p_action_id\)/i);
  });

  it("captures initial GPX atomically and repairs stale direct action writes", () => {
    expect(migration00005).toMatch(/after insert on public\.actions/i);
    expect(migration00005).toMatch(/record_initial_action_geometry_contribution/i);
    expect(migration00005).toMatch(/new\.created_by_clerk_id[\s\S]*'gpx_import'/i);
    expect(migration00005).toMatch(/after update of derived_geometry_kind, derived_geometry_geojson,[\s\S]*preparation_data on public\.actions/i);
    expect(migration00005).toMatch(/refresh_observed_action_geometry_after_update/i);
    expect(migration00005).toMatch(/pg_trigger_depth\(\) > 1/i);
  });

  it("projects sanitized coverage without GPS identity or point rows", () => {
    expect(migration00006).toMatch(/observed_coverage jsonb/i);
    expect(migration00006).toMatch(/a\.preparation_data -> 'observedCoverage'/i);
    expect(migration00006).not.toMatch(/action_geometry_contributions[\s\S]*contributor_clerk_id/i);
    expect(migration00006).not.toMatch(/gps_points|missions/i);
    expect(migration00007).toMatch(/from public\.action_geometry_contributions c/i);
    expect(migration00007).toMatch(/c\.validation_state = 'accepted'/i);
    expect(migration00007).toMatch(/'coverageDistanceKm', null/i);
    expect(migration00007).toMatch(/'coverageVersion', 'observed-traces-v1'/i);
    expect(migration00007).not.toMatch(/contributor_clerk_id|mission_id|technical_provenance|gps_points|missions/i);
  });
});
