import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260926000001_action_participant_individual_impact.sql", import.meta.url),
  "utf8",
);

describe("individual action impact migration", () => {
  it("is append-only and keeps action_participants as the canonical table", () => {
    expect(migration).toContain("alter table public.action_participants");
    expect(migration).not.toMatch(/drop\s+(column|table)/i);
    expect(migration).not.toContain("create table");
    expect(migration).toContain("individual_waste_kg");
    expect(migration).toContain("individual_cigarette_butts_count");
    expect(migration).toContain("individual_impact_measured_by");
    expect(migration).toContain("individual_impact_measured_at");
  });

  it("constrains nullable raw values without relaxing the existing RLS model", () => {
    expect(migration).toContain("individual_waste_condition in ('sec', 'humide', 'mouille')");
    expect(migration).toContain("individual_cigarette_butts_provenance in ('counted', 'measured', 'derived')");
    expect(migration).toContain("individual_cigarette_butts_count between 0 and 5000000");
    expect(migration).toContain("individual_waste_completeness_check");
    expect(migration).toContain("individual_butts_completeness_check");
    expect(migration).not.toMatch(/enable\s+row\s+level\s+security/i);
    expect(migration).not.toMatch(/create\s+policy/i);
  });
});
