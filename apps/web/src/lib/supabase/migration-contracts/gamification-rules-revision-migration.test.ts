import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260928000002_gamification_rules_revision_acknowledgement_bound.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("gamification rules revision migration contract", () => {
  it("prevents an acknowledgement from exceeding the applied revision", () => {
    expect(migration).toContain(
      "add constraint progression_profiles_last_acknowledged_rules_revision_lte_current_check",
    );
    expect(migration).toContain(
      "check (last_acknowledged_rules_revision <= current_applied_rules_revision)",
    );
  });
});
