import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261013000014_canonical_clerk_role_projection_guards.sql",
  ),
  "utf8",
);

describe("canonical Clerk role projection migration", () => {
  it("keeps privileged role projections server-owned", () => {
    expect(migration).toContain("role_projection_source");
    expect(migration).toContain("role_projection_synced_at");
    expect(migration).toMatch(/revoke insert \([\s\S]*role_label[\s\S]*active_role_label[\s\S]*\) on table public\.profiles from anon, authenticated/i);
    expect(migration).toMatch(/revoke update \([\s\S]*role_label[\s\S]*active_role_label[\s\S]*\) on table public\.profiles from anon, authenticated/i);
    expect(migration).toContain("clerk_public_metadata_role");
  });

  it("does not introduce a client role attribution function or allowlist", () => {
    expect(migration).not.toMatch(/CLERK_(ADMIN|MAX)_USER_IDS/i);
    expect(migration).not.toMatch(/grant .*role_label.*authenticated/i);
  });
});
