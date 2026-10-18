import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261018000000_harden_action_data_api_boundaries.sql",
    import.meta.url,
  ),
  "utf8",
).replace(/\s+/g, " ").trim().toLowerCase();

describe("action Data API boundary migration", () => {
  it("removes every direct browser DML grant while preserving read access", () => {
    expect(migration).toContain(
      "revoke all privileges on table public.actions from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "revoke all privileges on table public.action_organizers from public, anon, authenticated;",
    );
    expect(migration).toMatch(
      /revoke update \( action_phase, preparation_data, actor_name, organizer_type, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, notes, event_start_time, event_end_time \) on table public\.actions from public, anon, authenticated;/,
    );
    expect(migration).toContain(
      "grant select on table public.actions to anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select on table public.action_organizers to anon, authenticated;",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.actions to service_role;",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.action_organizers to service_role;",
    );
  });

  it("removes client write policies and keeps action writes service-only", () => {
    expect(migration).toContain("drop policy if exists actions_insert_authenticated on public.actions;");
    expect(migration).toContain("drop policy if exists actions_update_owner_or_service on public.actions;");
    expect(migration).toContain("drop policy if exists actions_delete_owner on public.actions;");
    expect(migration).toContain("create policy actions_insert_service_role on public.actions");
    expect(migration).toContain("create policy actions_update_service_role on public.actions");
    expect(migration).toContain("create policy actions_delete_service_role on public.actions");
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)[^;]*\b(?:anon|authenticated)\b/);
  });

  it("correlates organizer visibility with the canonical action visibility policy", () => {
    expect(migration).toContain("drop policy if exists action_organizers_select_all on public.action_organizers;");
    expect(migration).toContain("create policy action_organizers_select_visible_action");
    expect(migration).toContain("to anon, authenticated");
    expect(migration).toContain("exists ( select 1 from public.actions a where a.id = action_organizers.action_id )");
    expect(migration).not.toContain("create policy action_organizers_select_all");
  });
});
