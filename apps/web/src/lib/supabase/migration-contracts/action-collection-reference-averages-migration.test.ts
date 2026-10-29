import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261029000001_action_collection_reference_averages_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action collection reference averages migration STATIC_CONTRACT", () => {
  it("uses arithmetic means of per-action ratios, not maxima or ratios of sums", () => {
    expect(migration).toMatch(/action_collection_reference_averages_v1/i);
    expect(migration).toMatch(/avg\(waste_kg\s*\/\s*volunteers_count\)/i);
    expect(migration).toMatch(/avg\(cigarette_butts::numeric\s*\/\s*volunteers_count\)/i);
    expect(migration).not.toMatch(/max\(waste_kg\s*\/\s*volunteers_count\)/i);
    expect(migration).not.toMatch(/sum\(waste_kg\)[\s\S]*sum\(volunteers_count\)/i);

    const ratios = [2, 10];
    expect(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length).toBe(6);
  });

  it("keeps missing measurements out of each metric and preserves explicit zero", () => {
    expect(migration).toMatch(/waste_kg\s+is not null and waste_kg >= 0/i);
    expect(migration).toMatch(/cigarette_butts\s+is not null and cigarette_butts >= 0/i);
    expect(migration).toMatch(/volunteers_count > 0/i);
    expect(migration).not.toMatch(/coalesce\(waste_kg\s*,\s*0\)/i);
    expect(migration).not.toMatch(/coalesce\(cigarette_butts\s*,\s*0\)/i);
  });

  it("does not alter the canonical pollution score RPC", () => {
    expect(migration).not.toMatch(/action_pollution_score_references_v2\s*\(/i);
    expect(migration).toMatch(/revoke all on function public\.action_collection_reference_averages_v1\(\)/i);
    expect(migration).toMatch(/grant execute on function public\.action_collection_reference_averages_v1\(\) to anon, authenticated/i);
  });
});
