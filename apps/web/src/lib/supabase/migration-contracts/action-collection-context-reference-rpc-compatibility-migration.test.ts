import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000004_restore_public_context_reference_rpc.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public contextual reference RPC compatibility migration STATIC_CONTRACT", () => {
  it("restores the zero-argument query without delegating to the dated overload", () => {
    expect(migration).toMatch(/create or replace function public\.action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/set search_path = public, pg_catalog/i);
    expect(migration).toMatch(/a\.action_date <= current_date/i);
    expect(migration).toMatch(/a\.children_count \+ a\.adult_count \+ a\.retired_count = a\.volunteers_count/i);
    expect(migration).toMatch(/avg\(waste_kg \/ nullif\(waste_units, 0\)\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric \/ nullif\(butts_units, 0\)\)/i);
    expect(migration).toMatch(/case when waste_count >= 2 then waste_average else null end/i);
    expect(migration).toMatch(/case when butts_count >= 2 then butts_average else null end/i);
    expect(migration).not.toMatch(/action_collection_context_reference_averages_v1\(current_date\)/i);
  });

  it("preserves the public grant and does not alter the dated overload", () => {
    expect(migration).toMatch(/revoke all on function public\.action_collection_context_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_context_reference_averages_v1\(\)\s+to anon, authenticated/i);
    expect(migration).not.toMatch(/action_collection_context_reference_averages_v1\(date\)/i);
    expect(migration).not.toMatch(/security definer/i);
  });
});
