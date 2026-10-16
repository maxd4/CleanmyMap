import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261017000002_atomic_action_creation.sql", import.meta.url),
  "utf8",
);

describe("atomic action creation migration contract", () => {
  it("keeps the creator-scoped key, fingerprint and relation writes in one RPC", () => {
    expect(migration).toContain("add column if not exists client_request_fingerprint text");
    expect(migration).toContain("create or replace function public.create_action_with_relations");
    expect(migration).toContain("on conflict (created_by_clerk_id, client_request_id)");
    expect(migration).toContain("insert into public.action_organizers");
    expect(migration).toContain("insert into public.action_registrations");
    expect(migration).toContain("action_creation_organizers_incomplete");
    expect(migration).toContain("action_creation_registrations_incomplete");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public, pg_catalog");
    expect(migration).toContain("revoke all on function public.create_action_with_relations");
    expect(migration).toContain("grant execute on function public.create_action_with_relations");
  });
});
