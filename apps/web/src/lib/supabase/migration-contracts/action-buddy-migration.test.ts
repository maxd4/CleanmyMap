import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../../supabase/migrations/20261030000030_action_buddy_matching.sql",
  import.meta.url,
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("action buddy matching migration contract", () => {
  it("defines the three append-only private entities and their state constraints", () => {
    expect(migration).toContain("create table if not exists public.action_buddy_availability");
    expect(migration).toContain("action_id uuid not null references public.actions(id) on delete cascade");
    expect(migration).toContain("mentor_user_id text not null");
    expect(migration).toContain("primary key (action_id, mentor_user_id)");
    expect(migration).toContain("create table if not exists public.action_buddy_requests");
    expect(migration).toContain("requester_user_id text not null");
    expect(migration).toContain("status text not null default 'open'");
    expect(migration).toContain("matched_mentor_user_id text");
    expect(migration).toContain("matched_at timestamptz");
    expect(migration).toContain("create table if not exists public.action_buddy_proposals");
    expect(migration).toContain("request_id uuid not null references public.action_buddy_requests(id) on delete cascade");
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).toContain("resolved_at timestamptz");
    expect(migration).toContain("status in ('open', 'matched', 'cancelled')");
    expect(migration).toContain("status in ('pending', 'accepted', 'declined', 'withdrawn')");
    expect(migration).toContain("status = 'open' and matched_mentor_user_id is null and matched_at is null");
    expect(migration).toContain("status = 'matched' and matched_mentor_user_id is not null and matched_at is not null");
    expect(migration).not.toContain("action_participants");
  });

  it("protects active uniqueness and keeps matching canonical on requests", () => {
    expect(migration).toContain("action_buddy_requests_active_requester_key");
    expect(migration).toContain("where status in ('open', 'matched')");
    expect(migration).toContain("action_buddy_requests_active_mentor_key");
    expect(migration).toContain("where status = 'matched' and matched_mentor_user_id is not null");
    expect(migration).toContain("action_buddy_proposals_pending_mentor_request_key");
    expect(migration).toContain("where status = 'pending'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("hashtextextended(format('action-buddy:%s:%s'");
    expect(migration).toContain("from public.actions");
    expect(migration).toContain("for update");
    expect(migration).toContain("action_buddy_conflict_unique_matching");
    expect(migration).toContain("update public.action_buddy_proposals");
    expect(migration).toContain("set status = 'declined'");
    expect(migration).toContain("set status = 'matched'");
  });

  it("keeps browser reads, writes and RPC execution outside the privilege boundary", () => {
    expect(migration).toContain("alter table public.action_buddy_availability enable row level security");
    expect(migration).toContain("alter table public.action_buddy_requests enable row level security");
    expect(migration).toContain("alter table public.action_buddy_proposals enable row level security");
    expect(migration).toContain("create policy action_buddy_availability_service_only");
    expect(migration).toContain("create policy action_buddy_requests_service_only");
    expect(migration).toContain("create policy action_buddy_proposals_service_only");
    expect(migration).toContain("revoke all on table public.action_buddy_availability from public, anon, authenticated");
    expect(migration).toContain("revoke all on table public.action_buddy_requests from public, anon, authenticated");
    expect(migration).toContain("revoke all on table public.action_buddy_proposals from public, anon, authenticated");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain("if coalesce((select auth.role()), '') <> 'service_role' then");
    expect(migration).toContain("revoke all on function public.accept_action_buddy_proposal(uuid) from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.accept_action_buddy_proposal(uuid) to service_role");
    expect(migration).toContain("withdraw_action_buddy_proposals_on_request_cancel");
    expect(migration).toContain("enforce_action_buddy_proposal_request_open");
  });

});
