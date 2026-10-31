import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260926000001_action_participant_individual_impact.sql", import.meta.url),
  "utf8",
);
const lotsMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000007_action_participant_individual_butts_lots.sql", import.meta.url),
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

  it("adds canonical lots forward-only and keeps the action total outside the attribution", () => {
    expect(lotsMigration).toContain("add column if not exists individual_cigarette_butts_lots jsonb");
    expect(lotsMigration).toContain("action_participants_individual_butts_lots_shape_check");
    expect(lotsMigration).toContain("restore_action_backup_with_individual_butts_lots");
    expect(lotsMigration).toContain("grant execute on function public.restore_action_backup_with_individual_butts_lots");
    expect(lotsMigration).toContain("historical scalar columns stay as compatibility");
    expect(lotsMigration).not.toMatch(/drop\s+(column|table)/i);
    expect(lotsMigration).not.toMatch(/actions\.cigarette_butts\s*=/i);
    expect(lotsMigration).not.toMatch(/create\s+table/i);
  });
});
