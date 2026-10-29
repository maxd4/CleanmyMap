import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261030000001_action_collection_context_references_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action collection context references migration STATIC_CONTRACT", () => {
  it("persists a complete typed composition and keeps ambiguous legacy data unknown", () => {
    expect(migration).toMatch(/add column if not exists children_count integer/i);
    expect(migration).toMatch(/add column if not exists adult_count integer/i);
    expect(migration).toMatch(/add column if not exists retired_count integer/i);
    expect(migration).toMatch(/pg_input_is_valid/i);
    expect(migration).toMatch(/children_text::integer \+ adult_text::integer \+ retired_text::integer = volunteers_count/i);
    expect(migration).toMatch(/children_count \+ adult_count \+ retired_count = volunteers_count/i);
    expect(migration).toMatch(/children_count is null and adult_count is null and retired_count is null/i);
  });

  it("separates contexts and applies the declared operational-unit formulas", () => {
    expect(migration).toMatch(/a\.action_context in \('citizen', 'company'\)/i);
    expect(migration).toMatch(/0\.5 \* a\.children_count \+ 0\.5 \* a\.retired_count/i);
    expect(migration).toMatch(/a\.adult_count \+ 0\.45 \* a\.children_count/i);
    expect(migration).toMatch(/when a\.action_context = 'school'\s+then a\.adult_count/i);
    expect(migration).toMatch(/a\.action_context <> 'school' or a\.retired_count = 0/i);
    expect(migration).toMatch(/group by action_context/i);
  });

  it("uses per-action arithmetic means with independent metric counts", () => {
    expect(migration).toMatch(/avg\(waste_kg \/ nullif\(waste_units, 0\)\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric \/ nullif\(butts_units, 0\)\)/i);
    expect(migration).toMatch(/waste_source_count/i);
    expect(migration).toMatch(/butts_source_count/i);
    expect(migration).not.toMatch(/sum\(waste_kg\)[\s\S]*sum\(waste_units\)/i);
    expect(migration).not.toMatch(/coalesce\(waste_kg\s*,\s*0\)/i);
    expect(migration).not.toMatch(/coalesce\(cigarette_butts\s*,\s*0\)/i);
  });

  it("publishes a distinct safe RPC and preserves the existing contracts", () => {
    expect(migration).toMatch(/action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public, pg_catalog/i);
    expect(migration).toMatch(/revoke all on function public\.action_collection_context_reference_averages_v1/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(\) to anon, authenticated/i);
    expect(migration).not.toMatch(/action_pollution_score_references_v2\s*\(/i);
  });

  it("keeps typed composition through backup restoration without trusting incomplete rows", () => {
    expect(migration).toMatch(/create or replace function public\.restore_action_backup/i);
    expect(migration).toMatch(/children_count, adult_count, retired_count/i);
    expect(migration).toMatch(/r\.children_count \+ r\.adult_count \+ r\.retired_count = r\.volunteers_count/i);
  });
});
