import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000002_scientific_projection_initial_rebuild.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("scientific projection initial rebuild migration STATIC_CONTRACT", () => {
  it("uses the versioned idempotent transition instead of rewriting source data", () => {
    expect(migration).toMatch(/public\.advance_public_impact_action_state/i);
    expect(migration).toMatch(/public\.current_public_impact_projection_version\(\)/i);
    expect(migration).toMatch(/current_date\s*-\s*365/i);
    expect(migration).toMatch(/greatest\(/i);
    expect(migration).toMatch(/current_public_impact_projection_version\(\)/i);
    expect(migration).not.toMatch(/update\s+public\.actions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.actions/i);
  });
});
