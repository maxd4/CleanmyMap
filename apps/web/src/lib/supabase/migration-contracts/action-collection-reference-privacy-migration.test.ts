import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000005_harden_public_collection_reference_population.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public collection reference privacy migration STATIC_CONTRACT", () => {
  it("keeps the public RPC invoker boundary and filters to public actions", () => {
    expect(migration).toMatch(/create or replace function public\.action_collection_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/coalesce\(a\.access_mode,\s*'public'\)\s*=\s*'public'/i);
    expect(migration).not.toMatch(/security definer/i);
  });

  it("preserves the arithmetic method, NULL filters, version and grants", () => {
    expect(migration).toMatch(/avg\(waste_kg\s*\/\s*volunteers_count\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric\s*\/\s*volunteers_count\)/i);
    expect(migration).toMatch(/waste_kg is not null/i);
    expect(migration).toMatch(/cigarette_butts is not null/i);
    expect(migration).toMatch(/action-collection-reference-averages-v1/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_reference_averages_v1\(\) to anon, authenticated/i);
  });
});
