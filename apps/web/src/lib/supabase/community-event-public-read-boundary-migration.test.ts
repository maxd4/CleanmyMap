import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261023000001_harden_community_events_public_read_boundary.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("community event public read boundary migration", () => {
  it("revokes direct browser reads and removes the global SELECT policy", () => {
    expect(migration).toContain(
      "revoke select on table public.community_events from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "drop policy if exists community_events_select_all on public.community_events;",
    );
    expect(migration).not.toMatch(
      /grant\s+select[^;]*\b(?:anon|authenticated)\b/,
    );
  });

  it("keeps server-side SELECT without changing historical write grants", () => {
    expect(migration).toContain(
      "grant select on table public.community_events to service_role;",
    );
    expect(migration).not.toMatch(/revoke\s+(?:insert|update|delete)/);
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)/);
  });
});
