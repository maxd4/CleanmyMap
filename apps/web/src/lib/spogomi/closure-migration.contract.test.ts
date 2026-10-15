import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const decisionsMigration = readFileSync(new URL("../../../supabase/migrations/20261015000026_spogomi_closure_decisions.sql", import.meta.url), "utf8");
const consolidationMigration = readFileSync(new URL("../../../supabase/migrations/20261015000027_spogomi_closure_publication_guards.sql", import.meta.url), "utf8");
const rankingMigration = readFileSync(new URL("../../../supabase/migrations/20261015000028_spogomi_ranking_closure_guard.sql", import.meta.url), "utf8");
const correctionMigration = readFileSync(new URL("../../../supabase/migrations/20261015000029_spogomi_closure_republication_safety.sql", import.meta.url), "utf8");
const admissionNotificationMigration = readFileSync(new URL("../../../supabase/migrations/20261015000030_spogomi_admission_decision_notifications.sql", import.meta.url), "utf8");

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

  it("serializes closure verification before the existing ranking publication owner", () => {
    const wrapper = correctionMigration.slice(correctionMigration.indexOf("create or replace function public.publish_spogomi_official_rankings_for_division_checked_closure"));
    expect(wrapper).toContain("perform 1 from public.spogomi_events where id = p_event_id for update");
    expect(wrapper.indexOf("for update")).toBeLessThan(wrapper.indexOf("spogomi_division_closure_decisions_match"));
    expect(wrapper).toContain("return public.publish_spogomi_official_rankings_for_division(");
    expect(correctionMigration).toContain("grant execute on function public.publish_spogomi_official_rankings_for_division_checked_closure");
  });

  it("uses the official event timezone and hash-owned invalidation without imputing zero", () => {
    expect(correctionMigration).toContain("v_event.starts_at at time zone coalesce(nullif(btrim(v_event.official_timezone), ''), 'Europe/Paris')");
    expect(correctionMigration).toContain("alter column volunteers_count drop not null");
    expect(correctionMigration).toContain("spogomi_projection_source_hash = old.source_hash");
    expect(correctionMigration).toContain("waste_kg = null");
    expect(correctionMigration).toContain("cigarette_butts = null");
    expect(correctionMigration).toContain("volunteers_count = null");
    expect(correctionMigration).toContain("spogomi_total_mass_grams = null");
    expect(correctionMigration).toContain("preparation_data - 'spogomiConsolidation' - 'spogomiOfficialReference'");
    expect(correctionMigration).not.toMatch(/volunteers_count\s*=\s*coalesce\([^\n]+,\s*0\)/);
  });

  it("projects admission decisions through the canonical private notification inbox", () => {
    expect(admissionNotificationMigration).toContain("app_notifications_spogomi_admission_decision_event_unique_idx");
    expect(admissionNotificationMigration).toContain("emit_spogomi_admission_decision_notification");
    expect(admissionNotificationMigration).toContain("security definer");
    expect(admissionNotificationMigration).toContain("set search_path = public, pg_catalog");
    expect(admissionNotificationMigration).toContain("auth.role()), '') <> 'service_role'");
    expect(admissionNotificationMigration).toContain("informational_enabled");
    expect(admissionNotificationMigration).toContain("old.status = 'pending' and new.status in ('approved', 'rejected', 'cancelled')");
    expect(admissionNotificationMigration).toContain("on conflict do nothing");
    expect(admissionNotificationMigration).toContain("grant execute on function public.emit_spogomi_admission_decision_notification()");
    expect(admissionNotificationMigration).toContain("spogomi_admission_decision_notification");
  });
});
