import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261114000001_action_ride_terminal_update_guard.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const updateRpc = migration.slice(migration.indexOf("create or replace function public.update_action_ride_details"));

// STATIC_CONTRACT: this reads the latest forward-only definition. It does not
// prove PostgreSQL execution, locks, permissions or transaction semantics.
describe("latest action ride terminal update migration [STATIC_CONTRACT]", () => {
  it("keeps only open rides mutable while preserving the UTC eligibility guards", () => {
    expect(updateRpc).toMatch(/create or replace function public\.update_action_ride_details\([\s\S]*?p_ride_id uuid/);
    expect(updateRpc).toContain("or v_ride.status <> 'open'");
    expect(updateRpc).toContain("is_public_future_pre_action_v2");
    expect(updateRpc).toContain("v_action.event_start_at");
    expect(updateRpc).toContain("is_action_ride_departure_eligible(v_ride.action_id, p_departure_at)");
    expect(updateRpc).toContain("for update;");
  });

  it("preserves the server-only signature, error contracts and grants", () => {
    expect(migration).toMatch(/^begin;[\s\S]*commit;\s*$/);
    expect(updateRpc).toContain("returns public.action_rides");
    expect(updateRpc).toContain("security invoker");
    expect(updateRpc).toContain("set search_path = public, pg_catalog");
    expect(updateRpc).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(updateRpc).toContain("v_ride.driver_user_id <> v_actor");
    expect(updateRpc).toContain("raise exception 'ride is no longer eligible for modification'");
    expect(migration).toContain("revoke all on function public.update_action_ride_details(");
    expect(migration).toContain("grant execute on function public.update_action_ride_details(");
    expect(migration).toContain("to service_role;");
  });
});
