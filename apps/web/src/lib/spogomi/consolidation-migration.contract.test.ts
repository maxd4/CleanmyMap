import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseMigration = readFileSync(new URL("../../../supabase/migrations/20261012000007_spogomi_action_consolidation.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../supabase/migrations/20261012000011_harden_spogomi_consolidation_revisions.sql", import.meta.url), "utf8");
const geometryMigration = readFileSync(new URL("../../../supabase/migrations/20261012000012_preserve_independent_spogomi_geometry.sql", import.meta.url), "utf8");
const contractSource = `${baseMigration}\n${migration}\n${geometryMigration}`;

describe("SPOGOMI action consolidation migration STATIC_CONTRACT", () => {
  it("keeps historical hashes replayable while preserving one active projection", () => {
    expect(migration).toContain("drop constraint if exists spogomi_action_consolidations_event_id_source_hash_key");
    expect(migration).toContain("spogomi_action_consolidations_event_source_hash_idx");
    expect(migration).toContain("where event_id = p_event_id and is_current");
    expect(migration).toContain("v_existing.source_hash = p_source_hash");
    expect(migration).toContain("projection - 'sourceSnapshot'");
    expect(migration).not.toContain("where event_id = p_event_id and source_hash = p_source_hash;");
    expect(migration).toContain("is_current");
    expect(migration).toContain("coalesce(max(projection_revision), 0) + 1");
  });

  it("persists explicit versioned mappings and exact gram fields without scores or XP", () => {
    expect(contractSource).toContain("spogomi_environment_category_mappings");
    expect(contractSource).toContain("environmental_mapping_version");
    expect(contractSource).toContain("spogomi_total_mass_grams");
    expect(contractSource).toContain("spogomi_megots_mass_grams");
    expect(contractSource).toContain("spogomi_megots_count");
    expect(contractSource).not.toMatch(/gamification/i);
    expect(contractSource).not.toMatch(/\bscore\b/i);
  });

  it("uses a server-only atomic RPC and protects controlled fields from ordinary edits", () => {
    expect(migration).toContain("spogomi_consolidation_sources_match");
    expect(migration).toContain("sourceSnapshot");
    expect(migration).toContain("spogomi_result_items where event_id = p_event_id for update");
    expect(migration).toContain("The SPOGOMI source snapshot changed since the preview");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain("sourceSubmissionIds");
    expect(migration).toContain("attendance_status = 'present'");
    expect(migration).toContain("ATOMIC owner");
    expect(migration).toContain("grant execute on function public.consolidate_spogomi_event_to_action");
    expect(contractSource).toContain("prevent_ordinary_spogomi_projection_overwrite");
    expect(contractSource).toContain("spogomiConsolidation");
    expect(contractSource).toContain("spogomiOfficialReference");
    expect(contractSource).toContain("status = 'superseded'");
    expect(contractSource).toContain("set is_current = false");
  });

  it("preserves independent geometry and proves SPOGOMI ownership before clearing it", () => {
    expect(geometryMigration).toContain("preserve_spogomi_independent_geometry");
    expect(geometryMigration).toContain("new.spogomi_projection_source_hash is not distinct from old.spogomi_projection_source_hash");
    expect(geometryMigration).toContain("old.preparation_data -> 'spogomiOfficialReference'");
    expect(geometryMigration).toContain("old.geometry_source::text = 'reference'");
    expect(geometryMigration).toContain("old.derived_geometry_geojson is not distinct from (previous_reference -> 'geometryGeojson')::text");
    expect(geometryMigration).toContain("new.preparation_data := old.preparation_data");
    expect(geometryMigration).toContain("if has_existing_geometry and not is_previous_spogomi_reference then");
    expect(geometryMigration).toContain("new.derived_geometry_kind := old.derived_geometry_kind");
    expect(geometryMigration).toContain("trg_preserve_spogomi_independent_geometry");
    expect(geometryMigration).not.toMatch(/create table/i);
  });
});
