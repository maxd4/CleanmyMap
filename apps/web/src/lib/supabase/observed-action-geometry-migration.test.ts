import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261003000003_harden_observed_geometry_trigger_acl.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("observed action geometry trigger ACL migration", () => {
  it("keeps the trigger path server-only without direct execute grants", () => {
    for (const marker of [
      "PURPOSE:",
      "CALLER:",
      "AUTHORIZATION_BOUNDARY:",
      "IDEMPOTENCY:",
      "ATOMICITY:",
      "FAILURE_BEHAVIOR:",
      "SEARCH_PATH:",
      "GRANTS:",
    ]) {
      expect(migration).toContain(marker);
    }

    expect(migration).toContain(
      "alter function public.promote_completed_mission_geometry()",
    );
    expect(migration).toContain(
      "alter function public.preserve_observed_action_geometry()",
    );
    expect(migration).toContain(
      "revoke all privileges on function public.promote_completed_mission_geometry()\n  from public, anon, authenticated, service_role;",
    );
    expect(migration).toContain(
      "revoke all privileges on function public.preserve_observed_action_geometry()\n  from public, anon, authenticated, service_role;",
    );
    expect(migration).not.toMatch(/grant\s+execute\s+on\s+function/i);
    expect(migration).not.toMatch(/grant\s+.*\s+on\s+table\s+public\.(missions|gps_points|actions)/i);
  });
});
