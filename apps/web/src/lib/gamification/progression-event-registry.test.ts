import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eventFamilyMap } from "./progression-utils";

const RUNTIME_PROGRESSION_WRITERS = [
  "progression-data.ts",
  "progression-backfill.ts",
  "progression-tracking.ts",
  "quiz-progress.ts",
  "quiz-balance-progress.ts",
  "referrals.ts",
  "badges/rebuild.ts",
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
    expect([...runtimeEventTypes].sort()).toEqual([
      "action_declare_pending",
      "action_declare_validation",
      "action_monthly_regularity",
      "clean_zone_task",
      "collective_attendance_confirmed",
      "collective_rsvp_yes_pending",
      "community_ops_update",
      "community_referral_invite",
      "explorer_tier_unlock",
      "form_bonus",
      "form_tier_unlock",
      "new_place_discovered",
      "new_place_milestone",
      "participant_tier_unlock",
      "quiz_question_type_balance_milestone",
      "quiz_question_type_milestone",
      "route_recommend_use",
      "spot_create_pending",
      "spot_validation_bonus",
    ].sort());

    for (const eventType of runtimeEventTypes) {
      expect(families[eventType as keyof typeof families]).toBeTruthy();
    }
  });

  it("does not leave the explicit badge rebuild with an untyped eventType escape hatch", () => {
    const rebuild = readRuntimeWriter("badges/rebuild.ts");
    expect(rebuild).not.toMatch(/eventType:\s*string/);
  });
});
