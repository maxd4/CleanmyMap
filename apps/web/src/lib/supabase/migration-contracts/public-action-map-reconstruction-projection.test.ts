import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261114000003_harden_public_action_map_reconstruction_projection.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public action map reconstruction projection STATIC_CONTRACT", () => {
  it("replaces only the existing invoker-safe projection function", () => {
    expect(migration).toContain("create or replace function public.public_action_map_preparation(p_preparation jsonb)");
    expect(migration).toMatch(/returns jsonb[\s\S]+language sql[\s\S]+immutable[\s\S]+security invoker/i);
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toMatch(/grant execute on function public\.public_action_map_preparation\(jsonb\)[\s\S]*to anon, authenticated, service_role/i);
    expect(migration).not.toContain("security definer");
    expect(migration).not.toMatch(/preparation_data\s*[,)]/i);
  });

  it("bounds both public historical reconstruction objects", () => {
    expect(migration).toContain("'simulatedRouteCoverage', simulated.value");
    expect(migration).toContain("'referenceAreaProvenance', reference.value");
    expect(migration).toContain("'simulated-routes-v1', 'simulated-routes-v2'");
    expect(migration).toContain("'geometrySource', 'estimated_route'");
    expect(migration).toContain("'provenance', 'estimated'");
    expect(migration).toContain("'status', 'hypothetical'");
    expect(migration).toContain("'speedKmPerHour', 3");
    expect(migration).toContain("jsonb_array_length(simulated_input -> 'coordinates') between 1 and 12");
    expect(migration).toContain("jsonb_array_length(line_value) between 2 and 1000");
    expect(migration).toContain("jsonb_build_array(point_value -> 1, point_value -> 0)");
    expect(migration).toContain("'groupSizePolicy', simulated_input ->> 'groupSizePolicy'");
    expect(migration).toContain("'individualSimulatedDistancesKm'");
    expect(migration).toContain("'totalSimulatedDistanceKm'");
    expect(migration).toContain("'^([1-9]|1[0-2])([.]0+)?$'");
    expect(migration).toContain("'groupIndex', parsed.group_index");
    expect(migration).toContain("parsed.group_index is not null");
  });

  it("rejects fractional participant counts and keeps malformed objects non-fatal", () => {
    expect(migration).toContain("count_value::text ~ '^([5-8])([.]0+)?$'");
    expect(migration).toContain("count_value::text ~ '^([1-8])([.]0+)?$'");
    expect(migration).toContain("FAILURE_BEHAVIOR: Invalid objects are omitted without evaluating unsafe casts.");
  });

  it("requires official source evidence and excludes private preparation fields", () => {
    expect(migration).toContain("input.preparation #>> '{referenceAreaProvenance,source}' = 'ville_de_paris'");
    expect(migration).toContain("input.preparation #>> '{referenceAreaProvenance,license}' = 'ODbL'");
    expect(migration).toContain("btrim(input.preparation #>> '{referenceAreaProvenance,attribution}') <> ''");
    expect(migration).toContain("btrim(input.preparation #>> '{referenceAreaProvenance,sourceUrl}') <> ''");
    expect(migration).not.toMatch(/mission_id|contributor_clerk_id|technical_provenance|plannerTechnicalStops/);
  });
});
