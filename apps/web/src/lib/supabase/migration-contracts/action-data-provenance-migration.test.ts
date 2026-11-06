import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261106000006_action_data_provenance_and_public_eligibility.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("action data provenance migration STATIC_CONTRACT", () => {
  it("preserves unknown history and assigns real provenance only at the server boundary", () => {
    expect(migration).toMatch(/data_provenance\s+text\s+not null\s+default\s+'unknown'/i);
    expect(migration).toMatch(/check \(data_provenance in \('unknown', 'real', 'test'\)\)/i);
    expect(migration).toMatch(/cleanmymap\.action_creation_provenance/i);
    expect(migration).toMatch(/set_config\('cleanmymap\.action_creation_provenance', 'real'/i);
    expect(migration).toMatch(/grant execute on function public\.create_action_with_relations\([^\n]+\)\s+to service_role/i);
    expect(migration).not.toMatch(/update public\.actions[\s\S]{0,300}data_provenance\s*=\s*'real'/i);
  });

  it("centralizes completed public eligibility and protects the two reference RPCs", () => {
    expect(migration).toMatch(/create or replace function public\.is_public_real_completed_action/i);
    expect(migration).toMatch(/p_action_phase[^\n]*text/i);
    expect(migration).toMatch(/coalesce\(p_data_provenance, 'unknown'\) <> 'test'/i);
    expect(migration).toMatch(/action_collection_reference_averages_v1[\s\S]*?is_public_real_completed_action/i);
    expect(migration).toMatch(/action_collection_context_reference_averages_v1[\s\S]*?is_public_real_completed_action/i);
    expect(migration).toMatch(/post_action_complete/i);
  });

  it("protects public reads, impact projections and local fixture provenance", () => {
    expect(migration).toMatch(/create policy actions_select_exclude_test_data[\s\S]*?as restrictive/i);
    expect(migration).toMatch(/data_provenance <> 'test'/i);
    expect(migration).toMatch(/build_public_impact_action_contribution_legacy/i);
    expect(migration).toMatch(/load_public_landing_action_summary_incremental[\s\S]*?a\.data_provenance <> 'test'/i);
    expect(migration).not.toMatch(/delete from public\.actions/i);
  });
});
