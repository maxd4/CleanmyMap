import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261109000008_spogomi_volunteer_help_proposals.sql"), "utf8");

describe("SPOGOMI volunteer help proposal persistence contract", () => {
  it("keeps the proposal private, service-only, event-scoped and append-only", () => {
    expect(migration).toContain("create table public.spogomi_volunteer_help_proposals");
    expect(migration).toContain("create table public.spogomi_volunteer_help_proposal_events");
    expect(migration).toMatch(/revoke all on table public\.spogomi_volunteer_help_proposals from public, anon, authenticated/i);
    expect(migration).toMatch(/using \(auth\.role\(\) = 'service_role'\)/i);
    expect(migration).toContain("unique index spogomi_volunteer_help_active_unique");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("event.public_visibility = 'published'");
    expect(migration).toContain("event.starts_at > now()");
    expect(migration).toContain("action_organizers");
    expect(migration).toContain("spogomi_volunteer_help_proposal_events");
  });

  it("does not couple the assistance proposal RPC to the sports quiz or participation tables", () => {
    const rpcBody = migration.slice(migration.indexOf("create or replace function public.create_spogomi_volunteer_help_proposal"), migration.indexOf("create or replace function public.transition_spogomi_volunteer_help_proposal"));
    expect(rpcBody).not.toContain("spogomi_registration_quiz");
    expect(rpcBody).not.toContain("spogomi_participants");
    expect(rpcBody).not.toContain("spogomi_team_join_requests");
  });
});
