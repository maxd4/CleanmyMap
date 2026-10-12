import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000007_spogomi_action_consolidation.sql", import.meta.url), "utf8");

describe("SPOGOMI action consolidation migration STATIC_CONTRACT", () => {
  it("owns one versioned projection for one event and one action", () => {
    expect(migration).toContain("create table public.spogomi_action_consolidations");
    expect(migration).toMatch(/event_id uuid not null references public\.spogomi_events/i);
    expect(migration).toMatch(/action_id uuid not null references public\.actions/i);
    expect(migration).toContain("unique (event_id, source_hash)");
    expect(migration).toContain("unique (event_id, projection_revision)");
    expect(migration).toContain("is_current");
    expect(migration).toContain("spogomi_action_consolidations_current_action_unique");
    expect(migration).toContain("where event_id = p_event_id and source_hash = p_source_hash");
    expect(migration).toContain("if found then return v_existing");
  });

  it("persists explicit versioned mappings and exact gram fields without scores or XP", () => {
    expect(migration).toContain("spogomi_environment_category_mappings");
    expect(migration).toContain("environmental_mapping_version");
    expect(migration).toContain("spogomi_total_mass_grams");
    expect(migration).toContain("spogomi_megots_mass_grams");
    expect(migration).toContain("spogomi_megots_count");
    expect(migration).not.toMatch(/gamification/i);
    expect(migration).not.toMatch(/\bscore\b/i);
  });

  it("uses a server-only atomic RPC and protects controlled fields from ordinary edits", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain("sourceSubmissionIds");
    expect(migration).toContain("attendance_status = 'present'");
    expect(migration).toContain("ATOMIC owner");
    expect(migration).toContain("grant execute on function public.consolidate_spogomi_event_to_action");
    expect(migration).toContain("prevent_ordinary_spogomi_projection_overwrite");
    expect(migration).toContain("spogomiConsolidation");
    expect(migration).toContain("spogomiOfficialReference");
    expect(migration).toContain("status = 'superseded'");
    expect(migration).toContain("set is_current = false");
  });
});
