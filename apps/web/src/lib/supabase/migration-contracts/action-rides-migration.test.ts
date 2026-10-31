import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000004_action_rides.sql", import.meta.url),
  "utf8",
).toLowerCase();
const compactMigration = migration.replace(/\s+/gu, " ");

describe("action rides migration contract [STATIC_CONTRACT]", () => {
  it("defines the private action-scoped tables and requested bounds", () => {
    expect(migration).toContain("create table if not exists public.action_rides");
    expect(migration).toContain("create table if not exists public.action_ride_requests");
    expect(migration).toContain("action_id uuid not null references public.actions(id) on delete cascade");
    expect(migration).toContain("ride_id uuid not null references public.action_rides(id) on delete cascade");
    expect(migration).toContain("seats_total between 1 and 8");
    expect(migration).toContain("seats_requested between 1 and 4");
    expect(migration).toContain("char_length(coalesce(note, '')) <= 200");
    expect(migration).toContain("char_length(coalesce(message, '')) <= 200");
    expect(migration).toContain("status in ('open', 'closed', 'cancelled')");
    expect(migration).toContain("status in ('pending', 'accepted', 'declined', 'withdrawn')");
    expect(migration).toContain("where status in ('pending', 'accepted')");
  });

  it("keeps direct reads and writes behind the service-role boundary", () => {
    expect(migration).toContain("alter table public.action_rides enable row level security");
    expect(migration).toContain("alter table public.action_ride_requests enable row level security");
    expect(migration).toContain("create policy action_rides_service_only");
    expect(migration).toContain("create policy action_ride_requests_service_only");
    expect(migration).toContain("revoke all privileges on table public.action_rides");
    expect(migration).toContain("revoke all privileges on table public.action_ride_requests");
    expect(compactMigration).toContain("grant select, insert, update, delete on table public.action_rides to service_role");
    expect(compactMigration).toContain("grant select, insert, update, delete on table public.action_ride_requests to service_role");
    expect(migration).not.toContain("grant select, insert, update, delete on table public.action_rides to authenticated");
  });

  it("keeps one capacity owner and prepares the serialized acceptance boundary", () => {
    expect(migration).toContain("create or replace function public.action_ride_capacity(p_ride_id uuid)");
    expect(migration).toContain("seats_total - coalesce(sum(rr.seats_requested)");
    expect(migration).toContain("from public.action_rides");
    expect(migration).toContain("for update");
    expect(migration).toContain("create trigger action_ride_requests_capacity");
    expect(migration).toContain("create trigger action_rides_total_capacity");
    expect(migration).toContain("create trigger action_rides_eligibility");
    expect(migration).toContain("create trigger action_ride_requests_eligibility");
    expect(migration).toContain("if v_capacity.seats_reserved > v_capacity.seats_total then");
  });

  it("reuses the canonical action and registration eligibility contract", () => {
    expect(migration).toContain("create or replace function public.is_action_ride_eligible_member");
    expect(migration).toContain("ar.registration_status = 'confirmed'");
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain("coalesce(a.access_mode, 'public') = 'public'");
    expect(migration).toContain("coalesce(a.review_state, 'not_required') in ('not_required', 'approved')");
    expect(migration).toContain("create or replace function public.is_action_ride_departure_eligible");
    expect(migration).toContain("at time zone 'europe/paris'");
    expect(migration).toContain("a.event_start_time is not null");
  });

  it("does not create structured personal-coordinate fields", () => {
    const tableDefinitions = migration.slice(
      migration.indexOf("create table if not exists public.action_rides"),
      migration.indexOf("create index if not exists action_rides_action_id_idx"),
    );
    expect(tableDefinitions).not.toMatch(/\b(latitude|longitude|phone|telephone|email|plate|plaque|address|adresse)\b/iu);
  });
});
