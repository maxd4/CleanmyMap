import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const decisionsMigration = readFileSync(new URL("../../../supabase/migrations/20261015000026_spogomi_closure_decisions.sql", import.meta.url), "utf8");
const consolidationMigration = readFileSync(new URL("../../../supabase/migrations/20261015000027_spogomi_closure_publication_guards.sql", import.meta.url), "utf8");
const rankingMigration = readFileSync(new URL("../../../supabase/migrations/20261015000028_spogomi_ranking_closure_guard.sql", import.meta.url), "utf8");

describe("SPOGOMI closure STATIC_CONTRACT", () => {
  it("keeps explicit statuses, independent environmental eligibility and append-only replay", () => {
    expect(decisionsMigration).toContain("present_measured");
    expect(decisionsMigration).toContain("result_missing");
    expect(decisionsMigration).toContain("environmental_eligibility");
    expect(decisionsMigration).toContain("supersedes_decision_id");
    expect(decisionsMigration).toContain("is_current");
    expect(decisionsMigration).toContain("spogomi_set_team_closure_decision");
    expect(decisionsMigration).toContain("The SPOGOMI closure decision version is stale");
    expect(decisionsMigration).toContain("spogomi_official_ranking_history");
    expect(decisionsMigration).toContain("spogomi_recognition_attestation_history");
    expect(decisionsMigration).toContain("spogomi_collection_award_history");
    expect(decisionsMigration).toContain("status = 'superseded'");
  });

  it("keeps consolidation publication independent from sport certification and protects the source set", () => {
    expect(consolidationMigration).toContain("spogomi_closure_decisions_match");
    expect(consolidationMigration).toContain("environmental_eligibility");
    expect(consolidationMigration).toContain("Every team without a certified result needs an explicit absence or contest decision");
    expect(consolidationMigration).toContain("sourceSubmissionIds");
    expect(consolidationMigration).toContain("is_current = false");
    expect(consolidationMigration).not.toContain("public_results_visibility = 'certified'");
  });

  it("guards division ranking publication against a changed closure decision set", () => {
    expect(rankingMigration).toContain("spogomi_division_closure_decisions_match");
    expect(rankingMigration).toContain("closureDecisionVersion");
    expect(rankingMigration).toContain("publish_spogomi_official_rankings_for_division_checked_closure");
    expect(rankingMigration).toContain("The SPOGOMI closure decision set changed since ranking calculation");
    expect(rankingMigration).toContain("grant execute on function public.publish_spogomi_official_rankings_for_division_checked_closure");
  });
});
