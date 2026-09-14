import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260915000003_paris_future_pre_action_contract.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Paris future pre-action SQL contract", () => {
  it("centralizes the exact public-future predicate", () => {
    expect(migration).toContain("create or replace function public.is_public_future_pre_action(");
    expect(migration).toContain("p_moderation_visibility = 'visible'");
    expect(migration).toContain("p_status in ('pending', 'approved')");
    expect(migration).toContain("coalesce(p_event_start_time, time '00:00')");
    expect(migration).toContain("now() at time zone 'Europe/Paris'");
    expect(migration).not.toContain("current_date");
    expect(migration).not.toContain("current_time");
  });

  it("applies the same guard to RLS, map feed and message references", () => {
    expect(migration).toContain("drop policy if exists actions_select_public_or_owner on public.actions;");
    expect(migration).toContain("public.is_public_future_pre_action(");
    expect(migration).toContain("create or replace function public.actions_map_feed(");
    expect(migration).toContain("create or replace function public.can_insert_action_message_reference(");
  });
});
