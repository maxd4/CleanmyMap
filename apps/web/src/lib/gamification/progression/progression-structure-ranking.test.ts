import { describe, expect, it } from "vitest";
import type { ActionRow } from "./progression-types";
import {
  buildStructureLeaderboardCandidates,
  type StructureProgressionEvent,
} from "./progression-structure-ranking";

function action(
  id: string,
  organizerId: string | null,
  organizerName: string | null,
  organizerType: ActionRow["organizer_type"] = "association",
): ActionRow {
  return {
    id,
    created_at: "2026-09-01T00:00:00.000Z",
    created_by_clerk_id: `creator-${id}`,
    actor_name: "Contributeur",
    organizer_type: organizerType,
    organizer_id: organizerId,
    organizer_name: organizerName,
    action_date: "2026-09-01",
    location_label: "Paris",
    latitude: null,
    longitude: null,
    waste_kg: null,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 30,
    status: "approved",
    notes: "Même nom historique ignoré",
    action_phase: "post_action_complete",
  };
}

function event(
  id: number,
  sourceId: string,
  xpAwarded: number,
  eventType = "action_declare_validation",
): StructureProgressionEvent {
  return {
    id,
    event_type: eventType,
    source_table: "actions",
    source_id: sourceId,
    status_phase: "validated",
    xp_awarded: xpAwarded,
  };
}

describe("CURRENT structure leaderboard", () => {
  it("keeps identical names distinct when canonical IDs differ", () => {
    const items = buildStructureLeaderboardCandidates(
      [action("a1", "structure-a", "Les Rives"), action("b1", "structure-b", "Les Rives")],
      [event(1, "a1", 1), event(2, "b1", 1)],
      "level",
    );

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.publicLabel)).toEqual(["Les Rives", "Les Rives"]);
    expect(items[0]).toMatchObject({ structureType: "association" });
  });

  it("excludes spontaneous actions and legacy rows without organizerId", () => {
    const items = buildStructureLeaderboardCandidates(
      [
        action("spontaneous", null, "Action spontanée", "spontaneous"),
        action("legacy", null, "Même nom"),
        action("current", "structure-a", "Structure A"),
      ],
      [event(1, "spontaneous", 8), event(2, "legacy", 8), event(3, "current", 1)],
      "level",
    );

    expect(items.map((item) => item.publicLabel)).toEqual(["Structure A"]);
  });

  it("counts each canonical action event once and excludes non-structural families", () => {
    const items = buildStructureLeaderboardCandidates(
      [action("a1", "structure-a", "Structure A")],
      [
        event(1, "a1", 2),
        event(1, "a1", 2),
        { ...event(2, "a1", 50, "quiz_answered"), source_table: "quizzes" },
        { ...event(3, "a1", 50, "moderation_case_resolved"), source_table: "admin_operations_audit" },
        { ...event(4, "a1", 50, "referral_contribution"), source_table: "referrals" },
      ],
      "xp",
    );

    expect(items[0]).toMatchObject({ xpValidated: 2, level: 2 });
  });

  it("derives collectiveLevel from the shared XP curve and only structure-owned grades", () => {
    const items = buildStructureLeaderboardCandidates(
      [
        action("a1", "structure-a", "Structure A"),
        action("a2", "structure-a", "Structure A"),
        action("a3", "structure-a", "Structure A"),
      ],
      [event(1, "a1", 2), event(2, "a2", 2), event(3, "a3", 2)],
      "badges",
    );

    expect(items[0]).toMatchObject({
      level: 4,
      xpValidated: 6,
      badgeTotal: 2,
      gradeCount: 2,
      oneShotCount: 0,
    });
  });

  it.each([
    ["level", ["High XP", "Low XP"]],
    ["xp", ["High XP", "Low XP"]],
    ["badges", ["High badges", "Low badges"]],
  ] as const)("sorts structures deterministically for metric=%s", (metric, expected) => {
    const items = buildStructureLeaderboardCandidates(
      [
        action("low", "low", "Low XP"),
        action("high", "high", "High XP"),
        action("badge-1", "badges", "High badges"),
        action("badge-2", "badges", "High badges"),
        action("badge-3", "badges", "High badges"),
      ],
      [event(1, "low", 1), event(2, "high", 3)],
      metric,
    );

    if (metric === "badges") {
      expect(items[0]?.publicLabel).toBe("High badges");
      expect(items.at(-1)?.publicLabel).toBe("Low XP");
    } else {
      expect(items.slice(0, 2).map((item) => item.publicLabel)).toEqual(expected);
    }
    expect(items.map((item) => item.rank)).toEqual(items.map((_, index) => index + 1));
  });
});
