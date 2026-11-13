import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261113000003_action_visibility_and_utc_consumers.sql",
    import.meta.url,
  ),
  "utf8",
);

// STATIC_CONTRACT: these assertions protect the forward-only SQL shape. They
// do not prove effective RLS, grants, locks, triggers or transaction behavior.
describe("action visibility and UTC consumers follow-up migration", () => {
  it("keeps invite-link reads owner/service-only while retaining the public review gate", () => {
    expect(migration).toContain("drop policy if exists actions_select_public_or_owner");
    expect(migration).toContain("coalesce(access_mode, 'public') = 'public'");
    expect(migration).toContain("coalesce(review_state, 'not_required') in ('not_required', 'approved')");
    expect(migration).toContain("created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')");
    expect(migration).toContain("(select auth.role()) = 'service_role'");
  });

  it("closes the exposed message-reference RPC without weakening the private RLS helper", () => {
    expect(migration).toMatch(
      /revoke all on function public\.can_insert_action_message_reference\(uuid\)[\s\S]*?from public, anon, authenticated;/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.can_insert_action_message_reference\(uuid\)[\s\S]*?to service_role;/i,
    );
    expect(migration).toMatch(
      /create or replace function private\.can_insert_action_message_reference\([\s\S]*?is_public_future_pre_action_v2\([\s\S]*?event_start_at/i,
    );
    expect(migration).toMatch(
      /create or replace function private\.can_insert_action_message_reference\([\s\S]*?review_state/i,
    );
    expect(migration).not.toMatch(
      /create or replace function private\.can_insert_action_message_reference\([\s\S]*?is_public_future_pre_action\(/i,
    );
  });

  it("moves needs and buddy acceptance to the public reviewed UTC predicate", () => {
    expect(migration).toMatch(
      /create or replace function public\.is_public_open_action_need\([\s\S]*?coalesce\(a\.access_mode, 'public'\) = 'public'[\s\S]*?is_public_future_pre_action_v2[\s\S]*?review_state/i,
    );
    expect(migration).toMatch(
      /create or replace function public\.accept_action_buddy_proposal\([\s\S]*?coalesce\(v_action\.access_mode, 'public'\) <> 'public'[\s\S]*?is_public_future_pre_action_v2[\s\S]*?review_state/i,
    );
    expect(migration).not.toMatch(
      /create or replace function public\.accept_action_buddy_proposal\([\s\S]*?is_public_future_pre_action\(/i,
    );
  });

  it("requires a same-local-day ride departure while comparing UTC instants", () => {
    expect(migration).toContain("p_departure_at < a.event_start_at");
    expect(migration).toContain("(p_departure_at at time zone a.action_timezone)::date");
    expect(migration).toContain("(a.event_start_at at time zone a.action_timezone)::date");
    expect(migration).toContain("create or replace function public.accept_action_ride_request(");
    expect(migration).toContain("create or replace function public.update_action_ride_details(");
    expect(migration).not.toMatch(
      /create or replace function public\.(?:accept_action_ride_request|update_action_ride_details)\([\s\S]*?is_public_future_pre_action\(/i,
    );
  });

  it("keeps the migration append-only and documents its security boundary", () => {
    expect(migration).toMatch(/^begin;[\s\S]*commit;\s*$/);
    expect(migration).toContain("AUTHORIZATION_BOUNDARY");
    expect(migration).toContain("FAILURE_BEHAVIOR");
    expect(migration).toContain("GRANTS");
    expect(migration).not.toMatch(/drop\s+table|truncate\s+/i);
  });
});
