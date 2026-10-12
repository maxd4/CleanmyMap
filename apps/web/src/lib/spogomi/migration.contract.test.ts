import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261012000001_spogomi_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

// STATIC_CONTRACT: these assertions inspect the migration source. They do not
// execute PostgreSQL constraints, RLS or grants against a database.
describe("SPOGOMI foundation migration STATIC_CONTRACT", () => {
  it("creates the isolated domain entities and keeps the action link one-to-one", () => {
    for (const table of [
      "spogomi_events",
      "spogomi_teams",
      "spogomi_participants",
      "spogomi_category_rules",
      "spogomi_result_submissions",
      "spogomi_result_items",
      "spogomi_result_reviews",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
    }
    expect(migration).toMatch(
      /action_id uuid not null unique references public\.actions\(id\)/i,
    );
    expect(migration).not.toMatch(/public\.forms/i);
  });

  it("keeps certification versioned, traceable and blocked by incomplete rules", () => {
    expect(migration).toContain("unique (team_id, version)");
    expect(migration).toContain("spogomi_result_reviews");
    expect(migration).toContain("incomplete SPOGOMI regulation cannot certify");
    expect(migration).toContain("Incomplete SPOGOMI category rules cannot certify");
    expect(migration).toContain("A provisional, rejected or superseded submission cannot become certified");
    expect(migration).toContain("must keep the category measurement kind and unit");
    expect(migration).toContain("Move the team current certification before superseding it");
    expect(migration).toContain("unique (id, team_id)");
  });

  it("does not expose roster data and delegates organizer reads to action_organizers", () => {
    expect(migration).toMatch(
      /revoke all on table public\.spogomi_participants from public, anon, authenticated/i,
    );
    expect(migration).toContain("create policy spogomi_participants_service_only");
    expect(migration).toContain("public.is_spogomi_action_organizer");
    expect(migration).toContain("from public.action_organizers ao");
    expect(migration).toContain("grant select on table public.spogomi_events to authenticated");
    expect(migration).not.toContain("grant select on table public.spogomi_participants to authenticated");
  });

  it("hardens SQL functions and leaves review history append-only", () => {
    expect(migration).toMatch(/is_spogomi_action_organizer\(p_action_id uuid\)[\s\S]*?security invoker/i);
    expect(migration).toMatch(/set search_path = pg_catalog/);
    expect(migration).toContain("grant select, insert on table public.spogomi_result_reviews to service_role");
    expect(migration).not.toContain("grant all on table public.spogomi_result_reviews to service_role");
  });
});
