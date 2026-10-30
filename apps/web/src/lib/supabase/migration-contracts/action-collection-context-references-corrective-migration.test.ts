import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261030000006_action_collection_context_references_public_minimum.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action collection context references corrective migration STATIC_CONTRACT", () => {
  it("keeps the public boundary and all existing eligibility predicates", () => {
    expect(migration).toMatch(/coalesce\(a\.access_mode,\s*'public'\)\s*=\s*'public'/i);
    expect(migration).toMatch(/a\.status\s*=\s*'approved'/i);
    expect(migration).toMatch(/a\.moderation_visibility\s*=\s*'visible'/i);
    expect(migration).toMatch(/a\.action_phase\s*=\s*'post_action_complete'/i);
    expect(migration).toMatch(/a\.action_date\s*<=\s*current_date/i);
    expect(migration).toMatch(/a\.children_count\s*\+\s*a\.adult_count\s*\+\s*a\.retired_count\s*=\s*a\.volunteers_count/i);
    expect(migration).toMatch(/a\.action_context\s*<>\s*'school'\s+or\s+a\.retired_count\s*=\s*0/i);
  });

  it("preserves per-action formulas and independent metric counts", () => {
    expect(migration).toMatch(/avg\(waste_kg \/ nullif\(waste_units, 0\)\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric \/ nullif\(butts_units, 0\)\)/i);
    expect(migration).toMatch(/0\.5 \* a\.children_count \+ 0\.5 \* a\.retired_count/i);
    expect(migration).toMatch(/a\.adult_count \+ 0\.45 \* a\.children_count/i);
    expect(migration).toMatch(/waste_count/i);
    expect(migration).toMatch(/butts_count/i);
    expect(migration).toMatch(/case\s+when waste_count >= 2 then waste_average else null end/i);
    expect(migration).toMatch(/case\s+when butts_count >= 2 then butts_average else null end/i);
    expect(migration).not.toMatch(/sum\(waste_kg\)[\s\S]*sum\(waste_units\)/i);
    expect(migration).not.toMatch(/coalesce\(waste_kg\s*,\s*0\)/i);
    expect(migration).not.toMatch(/coalesce\(cigarette_butts\s*,\s*0\)/i);
  });

  it("changes only the contextual RPC and keeps the historical global RPC untouched", () => {
    expect(migration).toMatch(/create or replace function public\.action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public, pg_catalog/i);
    expect(migration).toMatch(/revoke all on function public\.action_collection_context_reference_averages_v1/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(\) to anon, authenticated/i);
    expect(migration).not.toMatch(/create or replace function public\.action_collection_reference_averages_v1/i);
  });
});
