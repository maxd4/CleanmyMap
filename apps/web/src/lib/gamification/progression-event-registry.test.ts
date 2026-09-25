import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURRENT_INFINITE_PROGRESSIONS,
  currentInfiniteProgressions,
  eventFamilyMap,
  gamificationEventRegistry,
} from "./progression-utils";
import { CURRENT_INFINITE_PROGRESSION_IDS } from "./progression-types";

const RUNTIME_PROGRESSION_WRITERS = [
  "action-progression-events.ts",
  "progression-data.ts",
  "progression-backfill.ts",
  "progression-tracking.ts",
  "quiz-progress.ts",
  "quiz-balance-progress.ts",
  "referrals.ts",
  "badges/rebuild.ts",
  "sensitive-zone-progression.ts",
  "sensitive-zone-progression-store.ts",
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

    const families = eventFamilyMap();
    expect(families.action_declare_validation).toBe("organisation");
    expect([...runtimeEventTypes].sort()).toEqual([
      "action_declare_pending",
      "action_declare_validation",
      "action_balance_cycle",
      "action_monthly_regularity",
      "clean_zone_task",
      "collective_attendance_confirmed",
      "collective_rsvp_yes_pending",
      "community_ops_update",
      "community_referral_invite",
      "explorer_tier_unlock",
      "form_bonus",
      "form_tier_unlock",
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
    ].sort());

    for (const eventType of runtimeEventTypes) {
      expect(gamificationEventRegistry()[eventType as keyof typeof families]).toBeTruthy();
    }
  });

  it("exposes exactly the seven CURRENT infinite progressions", () => {
    expect(CURRENT_INFINITE_PROGRESSION_IDS).toEqual([
      "participation",
      "organisation",
      "exploration",
      "clean_zones",
      "regularity",
      "versatility",
      "learning",
    ]);
    expect(currentInfiniteProgressions()).toHaveLength(7);
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
      "action_declare_pending",
      "action_declare_validation",
      "action_balance_cycle",
      "action_monthly_regularity",
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
    expect(registry.action_declare_pending.classification).toBe("non_progression");
    expect(registry.collective_rsvp_yes_pending.classification).toBe("non_progression");
    expect(registry.collective_attendance_confirmed.classification).toBe("non_progression");
    expect(registry.spot_create_pending.classification).toBe("non_progression");
    expect(registry.spot_validation_bonus.classification).toBe("non_progression");
    expect(registry.first_trace_utile).toEqual({
      classification: "milestone",
      milestoneId: "premiere_trace_utile",
    });
    expect(registry.infinite_waste_milestone.classification).toBe("non_progression");
    expect(registry.infinite_butts_milestone.classification).toBe("non_progression");
    expect(registry.form_tier_unlock.classification).toBe("non_progression");
    expect(registry.form_bonus.classification).toBe("non_progression");
    expect(registry.sensitive_zone_action.classification).toBe("non_progression");
    expect(registry.sensitive_zone_milestone).toEqual({
      classification: "milestone",
      milestoneId: "zone_sensible_apaisement",
    });
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
      ]),
    );
    expect(CURRENT_INFINITE_PROGRESSION_IDS).toContain("versatility");
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

  it("does not leave the explicit badge rebuild with an untyped eventType escape hatch", () => {
    const rebuild = readRuntimeWriter("badges/rebuild.ts");
    expect(rebuild).not.toMatch(/eventType:\s*string/);
  });
});
