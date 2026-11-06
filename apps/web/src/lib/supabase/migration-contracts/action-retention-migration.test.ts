import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000007_action_retention_and_statistical_versions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action retention and statistical versions migration STATIC_CONTRACT", () => {
  it("preserves legacy publication uncertainty and captures only approved publications", () => {
    expect(migration).toContain("action_statistical_versions");
    expect(migration).toContain("legacy_approved_unpublished");
    expect(migration).toMatch(/a\.published_at is null[\s\S]*?legacy_approved_unpublished/i);
    expect(migration).toMatch(/after insert or update on public\.actions/i);
    expect(migration).toMatch(/new\.published_at is null/i);
    expect(migration).toMatch(/data_provenance.*test/i);
  });

  it("centralizes the admissible version for both reference RPCs and impact", () => {
    expect(migration).toMatch(/action_collection_reference_averages_v1[\s\S]*?action_statistical_versions/i);
    expect(migration).toMatch(/action_collection_context_reference_averages_v1[\s\S]*?action_statistical_versions/i);
    expect(migration).toMatch(/build_public_impact_action_contribution_unversioned/i);
    expect(migration).toMatch(/jsonb_populate_record\(p_action/i);
    expect(migration).toMatch(/volunteers_count[\s\S]*?v_snapshot\.volunteers_count/i);
  });

  it("requires an explicit dry-run list and blocks unresolved dependencies", () => {
    expect(migration).toMatch(/for update of a skip locked/i);
    expect(migration).toMatch(/greatest\(a\.updated_at, a\.created_at\) < v_cutoff/i);
    expect(migration).toMatch(/p_expected_action_ids uuid\[\] default null/i);
    expect(migration).toMatch(/Physical retention requires the explicit dry-run action id list/i);
    expect(migration).toMatch(/pg_constraint/i);
    expect(migration).toMatch(/storage\.objects/i);
    expect(migration).toMatch(/notification_payload/i);
    expect(migration).toMatch(/foreign_key_race/i);
  });
});
