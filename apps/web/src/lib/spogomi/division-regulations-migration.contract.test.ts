import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000012_spogomi_division_regulations_and_operations.sql", import.meta.url),
  "utf8",
);
const parentRepairMigration = readFileSync(
  new URL("../../../supabase/migrations/20261015000013_spogomi_parent_division_regulation_defaults.sql", import.meta.url),
  "utf8",
);
const rankingRepairMigration = readFileSync(
  new URL("../../../supabase/migrations/20261015000014_spogomi_division_ranking_snapshot_validation.sql", import.meta.url),
  "utf8",
);

describe("SPOGOMI division-owned operations migration STATIC_CONTRACT", () => {
  it("keeps regulation state and team bounds on the stable division", () => {
    expect(migration).toContain("alter table public.spogomi_divisions");
    expect(migration).toContain("regulation_version");
    expect(migration).toContain("regulation_config jsonb");
    expect(migration).toContain("team_size_config jsonb");
    expect(migration).toContain("spogomi_division_regulation_is_complete");
    expect(migration).toContain("p_division_id uuid");
  });

  it("exposes service-only explicit division boundaries for every critical sports write", () => {
    for (const functionName of [
      "spogomi_confirm_team_composition_for_division",
      "spogomi_move_participant_to_team_for_division",
      "spogomi_save_team_submission_for_division",
      "spogomi_review_team_submission_for_division",
      "set_spogomi_recognition_attestation_for_division",
      "publish_spogomi_official_rankings_for_division",
      "reconcile_spogomi_collection_awards_for_divisions",
    ]) {
      expect(migration).toContain(`create or replace function public.${functionName}`);
      expect(migration).toContain(`grant execute on function public.${functionName}`);
      expect(migration).toContain(`revoke all on function public.${functionName}`);
    }
    expect(migration).toContain("auth.role(), '') <> 'service_role'");
    expect(migration).toContain("Every composition assignment must carry the selected divisionId");
    expect(migration).toContain("Every submission category must belong to the selected division");
    expect(migration).toContain("Every official ranking must carry the selected divisionId");
    expect(migration).toContain("A mixed SPOGOMI award requires an explicit divisionId");
  });

  it("preserves idempotence, source snapshots, audit history and one parent action", () => {
    expect(migration).toContain("idempotency_key");
    expect(migration).toContain("spogomi_result_audit_events");
    expect(migration).toContain("spogomi_recognition_attestation_history");
    expect(migration).toContain("spogomi_official_ranking_history");
    expect(migration).toContain("p_source_snapshot jsonb");
    expect(migration).toContain("select * into v_event from public.spogomi_events where id = p_event_id for update");
    expect(migration).toContain("comment on table public.spogomi_divisions");
    expect(migration).toContain("one environmental action");
    expect(migration).toContain("alter column division_id drop not null");
  });

  it("keeps parent division recovery compatible with mandatory division regulation columns", () => {
    expect(parentRepairMigration).toContain("create or replace function public.spogomi_ensure_parent_divisions");
    expect(parentRepairMigration).toContain("regulation_version");
    expect(parentRepairMigration).toContain("case when v_is_mixed then 'pending' else v_event.regulation_version end");
    expect(parentRepairMigration).toContain("case when v_is_mixed then '{}'::jsonb else v_event.regulation_config end");
    expect(parentRepairMigration).toContain("on conflict (event_id, division_type) do nothing");
  });

  it("binds official ranking publication to the selected division snapshot", () => {
    expect(rankingRepairMigration).toContain("jsonb_typeof(p_source_snapshot -> 'divisions') <> 'array'");
    expect(rankingRepairMigration).toContain("The SPOGOMI division regulation snapshot changed since calculation");
    expect(rankingRepairMigration).toContain("captured.value ->> 'divisionId' = p_division_id::text");
    expect(rankingRepairMigration).toContain("spogomi_official_ranking_history");
    expect(rankingRepairMigration).toContain("'reinstated'");
  });
});
