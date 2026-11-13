import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261113000002_action_event_timezones_integrity.sql", import.meta.url),
  "utf8",
);

describe("action event timezone integrity correction", () => {
  it("keeps the statistical view private while restoring the public map RPC", () => {
    expect(migration).toContain("alter function public.actions_map_feed(");
    expect(migration).toContain(") security definer;");
    expect(migration).toContain("set search_path = public, pg_catalog;");
    expect(migration).not.toMatch(/grant select on public\.action_map_statistical_source\s+to\s+(?:anon|authenticated)/i);
  });

  it("keeps review-state gating on public reads and action references", () => {
    expect(migration).toContain("coalesce(review_state, 'not_required') in ('not_required', 'approved')");
    expect(migration).toContain("coalesce(a.review_state, 'not_required') in ('not_required', 'approved')");
    expect(migration).toContain("drop policy if exists actions_select_public_or_owner");
  });

  it("attests creation provenance and makes replay side-effect free", () => {
    expect(migration).toContain("set_config('cleanmymap.action_creation_provenance', 'real', true)");
    expect(migration).toMatch(/if not coalesce\(v_replayed, false\) then[\s\S]*?update public\.actions/i);
    expect(migration).not.toMatch(/if not coalesce\(v_replayed, false\) then[\s\S]*?end if;[\s\S]*?update public\.actions[\s\S]*?where id = v_action_id/i);
  });

  it("moves discussion, messaging and rides to persisted UTC instants", () => {
    expect(migration).toContain("is_action_discussion_available_utc");
    expect(migration).toContain("a.event_start_at");
    expect(migration).toContain("p_departure_at < a.event_start_at");
    expect(migration).not.toContain("at time zone 'Europe/Paris'");
  });

  it("ships an executable PostgreSQL proof fixture for roles, RLS and idempotency", () => {
    const proof = readFileSync(
      new URL("../../../supabase/tests/action-event-timezones-integrity.pgtap.sql", import.meta.url),
      "utf8",
    );
    expect(proof).toContain("set local role anon");
    expect(proof).toContain("set local role authenticated");
    expect(proof).toContain("actions_map_feed");
    expect(proof).toContain("replayed");
    expect(proof).toContain("event_start_at");
  });
});
