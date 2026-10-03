import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURRENT_INFINITE_PROGRESSIONS,
  CURRENT_MILESTONES,
  currentInfiniteProgressions,
  currentMilestones,
  eventFamilyMap,
  gamificationEventRegistry,
} from "./progression-utils";
import { CURRENT_INFINITE_PROGRESSION_IDS } from "./progression-types";
import { ACTION_MILESTONE_EVENT_TYPES } from "./action-milestones";

const RUNTIME_PROGRESSION_WRITERS = [
  "action-progression-events.ts",
  "progression-data.ts",
  "progression-backfill.ts",
  "progression-tracking.ts",
  "quiz-progress.ts",
  "quiz-balance-progress.ts",
  "referrals/referrals.ts",
  "gamification-facts-loader.ts",
  "gamification-counter-facts.ts",
  "sensitive-zone-progression.ts",
  "sensitive-zone-progression-store.ts",
  "action-milestones.ts",
  "participation-milestones.ts",
  "moderation-progression.ts",
] as const;

function readRuntimeWriter(path: string): string {
  return readFileSync(new URL(`./${path}`, import.meta.url), "utf8");
}

function extractRuntimeEventTypes(source: string): Set<string> {
  const eventTypes = new Set<string>();
  for (const match of source.matchAll(/eventType:\s*"([^"]+)"/g)) {
    eventTypes.add(match[1]);
  }
  for (const match of source.matchAll(/const\s+\w*EVENT_TYPE\w*\s*=\s*"([^"]+)"/g)) {
    eventTypes.add(match[1]);
  }
  return eventTypes;
}

describe("progression event registry", () => {
  it("covers every event type written by CURRENT progression producers", () => {
    const runtimeEventTypes = new Set<string>();
    for (const path of RUNTIME_PROGRESSION_WRITERS) {
      for (const eventType of extractRuntimeEventTypes(readRuntimeWriter(path))) {
        runtimeEventTypes.add(eventType);
      }
    }
    Object.values(ACTION_MILESTONE_EVENT_TYPES).forEach((eventType) => runtimeEventTypes.add(eventType));

    const families = eventFamilyMap();
    expect(families.action_declare_validation).toBe("organisation");
    expect([...runtimeEventTypes].sort()).toEqual([
      "action_declare_pending",
      "action_declare_validation",
      "action_documented_route",
      "action_documented_sorting",
      "action_exemplary_data",
      "action_formalities_prepared",
      "action_loop_completed",
      "action_mobilizer",
      "action_participation_recovered",
      "action_balance_cycle",
      "action_monthly_regularity",
      "action_traceable_measurement",
      "clean_zone_task",
      "collective_attendance_confirmed",
      "collective_rsvp_yes_pending",
      "community_ops_update",
      "community_referral_invite",
      "explorer_tier_unlock",
      "first_trace_utile",
      "new_place_discovered",
      "new_place_milestone",
      "participant_tier_unlock",
      "quiz_question_type_balance_milestone",
      "quiz_question_type_milestone",
      "route_recommend_use",
      "sensitive_zone_action",
      "sensitive_zone_milestone",
      "spot_create_pending",
      "spot_validation_bonus",
      "moderation_case_resolved",
      "moderation_first_case",
      "moderation_first_impact_correction",
      "moderation_first_participation",
      "moderation_multi_family",
      "moderation_tier_unlock",
      "verified_geometry_contribution",
    ].sort());

    for (const eventType of runtimeEventTypes) {
      expect(gamificationEventRegistry()[eventType as keyof typeof families]).toBeTruthy();
    }
  });

  it("exposes exactly the CURRENT infinite progressions", () => {
    expect(CURRENT_INFINITE_PROGRESSION_IDS).toEqual([
      "participation",
      "organisation",
      "exploration",
      "clean_zones",
      "regularity",
      "versatility",
      "learning",
      "moderation",
      "cartography",
    ]);
    expect(currentInfiniteProgressions()).toHaveLength(9);
    expect(currentInfiniteProgressions().map((progression) => progression.id)).toEqual(
      [...CURRENT_INFINITE_PROGRESSION_IDS],
    );

    for (const progression of CURRENT_INFINITE_PROGRESSIONS) {
      expect(progression).toMatchObject({ infinite: true });
      expect(progression.metric).toBeTruthy();
      expect(progression.sourceDomain).toBeTruthy();
      expect(progression.badgeFamily).toBeTruthy();
      expect(progression.scale).toBeTruthy();
    }
  });

  it("classifies every CURRENT event without creating per-progression XP balances", () => {
    const registry = gamificationEventRegistry();

    expect(Object.keys(registry).sort()).toEqual([
      "action_documented_route",
      "action_documented_sorting",
      "action_declare_pending",
      "action_declare_validation",
      "action_exemplary_data",
      "action_formalities_prepared",
      "action_loop_completed",
      "action_mobilizer",
      "action_participation_recovered",
      "action_traceable_measurement",
      "action_balance_cycle",
      "action_monthly_regularity",
      "verified_geometry_contribution",
      "clean_zone_task",
      "collective_attendance_confirmed",
      "collective_rsvp_yes_pending",
      "community_ops_update",
      "community_referral_invite",
      "explorer_tier_unlock",
      "form_bonus",
      "form_tier_unlock",
      "first_trace_utile",
      "infinite_butts_milestone",
      "infinite_waste_milestone",
      "moderation_case_resolved",
      "moderation_first_case",
      "moderation_first_impact_correction",
      "moderation_first_participation",
      "moderation_multi_family",
      "moderation_tier_unlock",
      "new_place_discovered",
      "new_place_milestone",
      "participant_tier_unlock",
      "quiz_question_type_balance_milestone",
      "quiz_question_type_milestone",
      "route_recommend_use",
      "sensitive_zone_action",
      "sensitive_zone_milestone",
      "spot_create_pending",
      "spot_validation_bonus",
    ].sort());

    expect(registry.community_referral_invite).toEqual({
      classification: "milestone",
      milestoneId: "parrainage_utile",
    });
    expect(registry.action_declare_validation).toEqual({
      classification: "progression",
      progressionId: "organisation",
    });
    expect(registry.action_balance_cycle).toEqual({
      classification: "progression",
      progressionId: "versatility",
    });
    expect(registry.verified_geometry_contribution).toEqual({
      classification: "progression",
      progressionId: "cartography",
    });
    expect(registry.action_declare_pending.classification).toBe("non_progression");
    expect(registry.collective_rsvp_yes_pending.classification).toBe("non_progression");
    expect(registry.collective_attendance_confirmed.classification).toBe("non_progression");
    expect(registry.spot_create_pending.classification).toBe("non_progression");
    expect(registry.spot_validation_bonus.classification).toBe("non_progression");
    expect(registry.first_trace_utile).toEqual({
      classification: "milestone",
      milestoneId: "premiere_trace_utile",
    });
    expect(registry.infinite_waste_milestone).toEqual({
      classification: "impact_badge",
      impactBadgeId: "mohs_waste",
    });
    expect(registry.infinite_butts_milestone).toEqual({
      classification: "impact_badge",
      impactBadgeId: "mohs_butts",
    });
    expect(registry.form_tier_unlock.classification).toBe("non_progression");
    expect(registry.form_bonus.classification).toBe("non_progression");
    expect(registry.sensitive_zone_action.classification).toBe("non_progression");
    expect(registry.sensitive_zone_milestone.classification).toBe("non_progression");
    expect(registry.quiz_question_type_milestone).toEqual({
      classification: "progression",
      progressionId: "learning",
    });

    for (const registration of Object.values(registry)) {
      if (registration.classification === "progression") {
        expect(CURRENT_INFINITE_PROGRESSION_IDS).toContain(registration.progressionId);
      }
    }

    const registeredProgressions = new Set(
      Object.values(registry)
        .filter(
          (registration): registration is Extract<
            (typeof registry)[keyof typeof registry],
            { classification: "progression" }
          > => registration.classification === "progression",
        )
        .map((registration) => registration.progressionId),
    );
    expect(registeredProgressions).toEqual(
      new Set([
        "participation",
        "organisation",
        "exploration",
        "clean_zones",
        "regularity",
      "versatility",
      "learning",
      "moderation",
        "cartography",
      ]),
    );
    expect(CURRENT_INFINITE_PROGRESSION_IDS).toContain("versatility");
  });

  it("exposes the CURRENT one-shot milestones without infinite progress", () => {
    expect(currentMilestones()).toEqual(CURRENT_MILESTONES);
    expect(currentMilestones().map((milestone) => milestone.id)).toEqual([
      "premiere_trace_utile",
      "trace_fondatrice",
      "boucle_bouclee",
      "mobilisateur",
      "donnee_exemplaire",
      "parcours_documente",
      "mesure_tracable",
      "tri_documente",
      "formalites_preparees",
      "participation_retrouvee",
      "parrainage_utile",
      "premiere_moderation",
      "premiere_validation_participation",
      "premiere_correction_impact_justifiee",
      "moderateur_polyvalent",
    ]);
    expect(currentMilestones().every((milestone) => milestone.oneShot)).toBe(true);
    expect(currentMilestones().every((milestone) => !("infinite" in milestone))).toBe(true);
    expect(currentMilestones().map((milestone) => milestone.id)).not.toEqual(
      expect.arrayContaining([
        "premiere_participation",
        "premiere_organisation",
        "premier_lieu_explore",
        "premiere_zone_propre",
        "premier_quiz_reussi",
      ]),
    );
    expect(
      CURRENT_MILESTONES.filter((milestone) => milestone.factKey === "boucle_bouclee")
        .reduce((total, milestone) => total + milestone.xpAwarded, 0),
    ).toBe(1);
  });

  it("routes every active quiz XP event to the single learning progression", () => {
    const registry = gamificationEventRegistry();
    const quizEntries = Object.entries(registry).filter(([eventType]) =>
      eventType.startsWith("quiz_"),
    );

    expect(quizEntries.length).toBeGreaterThan(0);
    expect(quizEntries.every(([, registration]) =>
      registration.classification === "progression" && registration.progressionId === "learning",
    )).toBe(true);
    expect(Object.entries(eventFamilyMap()).filter(([eventType]) => eventType.startsWith("quiz_")))
      .toEqual(quizEntries.map(([eventType]) => [eventType, "learning"]));
  });

  it("uses the reconstruction engine as the only badge rebuild implementation", () => {
    const rebuild = readRuntimeWriter("badges/rebuild.ts");
    expect(rebuild).toContain("reconcileUserGamification");
    expect(rebuild).not.toContain("awardProgressionEventIfMissing");
  });

  it("keeps deprecated forms, sensitive-zone rewards, and impact quantities outside CURRENT badge surfaces", () => {
    const listing = readFileSync(
      new URL("./badges/listing.ts", import.meta.url),
      "utf8",
    );
    const profilePanel = readFileSync(
      new URL("../../components/gamification/infinite-badges/InfiniteBadgesPanel.tsx", import.meta.url),
      "utf8",
    );
    const mohsBadge = readFileSync(
      new URL("../../components/gamification/mohs-badge.tsx", import.meta.url),
      "utf8",
    );

    expect(listing).not.toContain("buildFormsBadges");
    expect(profilePanel).not.toContain('key: "dechets"');
    expect(profilePanel).not.toContain('key: "megots"');
    const sensitiveZoneCard = readFileSync(
      new URL("../../components/gamification/sensitive-zone-badge.tsx", import.meta.url),
      "utf8",
    );
    const sensitiveZoneStore = readFileSync(
      new URL("./sensitive-zone-progression-store.ts", import.meta.url),
      "utf8",
    );
    expect(sensitiveZoneCard).not.toContain("GamificationBadgePanel");
    expect(sensitiveZoneCard).not.toContain("progressPercent");
    expect(sensitiveZoneCard).not.toContain("Prochain palier");
    expect(sensitiveZoneStore).toContain("SENSITIVE_ZONE_MILESTONE_EVENT_TYPE");
    expect(sensitiveZoneStore).toContain("milestoneThresholdsToInsert");
    expect(sensitiveZoneStore).toContain("milestoneThresholdsToRemove");
    expect(sensitiveZoneStore).not.toContain("CURRENT_INFINITE_PROGRESSION_IDS");
    const levelPanel = readFileSync(
      new URL("../../components/sections/rubriques/gamification/gamification-level-progress-panel.tsx", import.meta.url),
      "utf8",
    );
    const impactPanel = readFileSync(
      new URL("../../components/sections/rubriques/gamification/gamification-impact-panel.tsx", import.meta.url),
      "utf8",
    );
    expect(levelPanel).not.toContain("MohsBadge");
    expect(impactPanel).not.toContain("MohsBadge");
    expect(impactPanel).not.toContain("computeActionImpactKpis");
    expect(mohsBadge).toContain("nextXp");
    expect(mohsBadge).toContain('style={{ width: `${grade.progressPct}%` }}');
    expect(mohsBadge).toContain("Impact secondaire");
  });
});
