import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261113000001_action_event_timezones.sql", import.meta.url),
  "utf8",
);

describe("action event timezone migration", () => {
  it("backfills legacy French rows into canonical UTC instants", () => {
    expect(migration).toContain("add column if not exists action_timezone text not null default 'Europe/Paris'");
    expect(migration).toContain("event_start_at timestamptz");
    expect(migration).toContain("at time zone coalesce(nullif(btrim(action_timezone), ''), 'Europe/Paris')");
    expect(migration).toContain("actions_event_window_ordered");
    expect(migration).toContain("trg_sync_action_event_instants");
    expect(migration).toContain("create_action_with_relations_legacy");
  });

  it("uses persisted instants for public lifecycle and per-action reminders", () => {
    expect(migration).toContain("is_public_future_pre_action_v2");
    expect(migration).toContain("p_event_start_at > now()");
    expect(migration).toContain("drop function public.actions_map_feed(");
    expect(migration).toContain("public_action_map_preparation(a.preparation_data)");
    expect(migration).toContain("public_preparation_data jsonb");
    expect(migration).toContain("event_start_at at time zone a.action_timezone");
    expect(migration).toContain("'timezone', a.action_timezone");
    expect(migration).not.toContain("v_reminder_date date := (p_now at time zone 'Europe/Paris')::date + 1");
  });
});
