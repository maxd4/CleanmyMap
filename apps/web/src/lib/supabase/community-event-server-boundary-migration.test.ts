import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261018000004_harden_community_events_data_api_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("community event Data API boundary migration", () => {
  it("removes browser DML while preserving public reads and server DML", () => {
    expect(migration).toContain(
      "revoke all privileges on table public.community_events from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select on table public.community_events to anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.community_events to service_role;",
    );
    expect(migration).not.toMatch(
      /grant\s+(?:insert|update|delete)[^;]*\b(?:anon|authenticated)\b/,
    );
  });

  it("removes authenticated owner-write policies and keeps mutations service-only", () => {
    expect(migration).toContain(
      "drop policy if exists community_events_insert_authenticated on public.community_events;",
    );
    expect(migration).toContain(
      "drop policy if exists community_events_update_owner on public.community_events;",
    );
    expect(migration).toContain(
      "create policy community_events_insert_service_role on public.community_events",
    );
    expect(migration).toContain(
      "create policy community_events_update_service_role on public.community_events",
    );
    expect(migration).toContain(
      "create policy community_events_delete_service_role on public.community_events",
    );
    expect(migration).toContain("to service_role");
  });
});
