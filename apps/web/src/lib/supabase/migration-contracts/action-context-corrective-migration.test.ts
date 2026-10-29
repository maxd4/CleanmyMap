import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261029000005_secure_action_context_persistence_and_map_projection.sql",
    import.meta.url,
  ),
  "utf8",
);

const mapFunction = migration.slice(migration.indexOf("drop function public.actions_map_feed"));
const createFunction = migration.slice(0, migration.indexOf("-- Rebuild the public map feed"));

describe("action context corrective migration contract", () => {
  it("persists all classification fields through the existing atomic RPC", () => {
    expect(createFunction).toContain("create or replace function public.create_action_with_relations");
    for (const field of [
      "action_context",
      "action_context_source",
      "school_context_confirmed",
      "school_context_confirmed_at",
      "school_context_confirmed_by_clerk_id",
    ]) {
      expect(createFunction).toContain(field);
    }
    expect(createFunction).toContain("on conflict (created_by_clerk_id, client_request_id)");
    expect(createFunction).toContain("action_creation_idempotency_conflict");
    expect(createFunction).toContain("insert into public.action_organizers");
    expect(createFunction).toContain("insert into public.action_registrations");
  });

  it("rejects forged or incoherent school confirmation provenance", () => {
    expect(createFunction).toContain("action_creation_school_confirmation_required");
    expect(createFunction).toContain("action_creation_school_confirmation_provenance_invalid");
    expect(createFunction).toContain("action_creation_school_confirmation_actor_mismatch");
    expect(createFunction).toContain("trim(p_creator_id)");
    expect(createFunction).toContain("security definer");
    expect(createFunction).toContain("set search_path = public, pg_catalog");
    expect(createFunction).toContain("grant execute on function public.create_action_with_relations");
    expect(createFunction).toContain("to service_role");
    expect(createFunction).not.toContain("to anon");
    expect(createFunction).not.toContain("to authenticated");
  });

  it("restores the invoker-only public projection and its complete safe shape", () => {
    expect(mapFunction).toMatch(/returns table \([\s\S]+action_context text[\s\S]+public_preparation_data jsonb[\s\S]*\)/i);
    expect(mapFunction).toMatch(/language sql[\s\S]+security invoker/i);
    expect(mapFunction).toContain("coalesce(a.access_mode, 'public') = 'public'");
    expect(mapFunction).toContain("public.is_public_future_pre_action");
    expect(mapFunction).toContain("public.public_action_map_preparation(a.preparation_data)");
    expect(mapFunction).toContain("a.preparation_data -> 'observedCoverage'");
    expect(mapFunction).toContain("between p_south and p_north");
    expect(mapFunction).toContain("between p_west and p_east");
    expect(mapFunction).toContain("p_floor_date");
    expect(mapFunction).toContain("p_types");
    expect(mapFunction).toContain("p_impact");
    expect(mapFunction).toContain("effective_limit");
    expect(mapFunction).not.toContain("created_by_clerk_id");
    expect(mapFunction).not.toContain("action_geometry_contributions");
    expect(mapFunction).not.toContain("security definer");
    expect(mapFunction).toContain("s.status in ('validated', 'cleaned')");
    expect(mapFunction).toContain("grant execute on function public.actions_map_feed");
    expect(mapFunction).toContain("to anon, authenticated, service_role");
  });
});
