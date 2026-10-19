import { describe, expect, it } from "vitest";
import type { TerrainSpecializationEvidence } from "./terrain-specializations";
import { TERRAIN_SPECIALIZATIONS } from "./terrain-specializations";
import { buildPersonalHistory } from "./progression-user";
import type { ActionRow } from "./progression-types";

function action(id: string, actionDate: string, locationLabel = id): ActionRow {
  return {
    id,
    created_at: `${actionDate}T10:00:00Z`,
    created_by_clerk_id: "other-user",
    actor_name: "Participant",
    action_date: actionDate,
    location_label: locationLabel,
    latitude: null,
    longitude: null,
    waste_kg: 0,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 30,
    status: "approved",
    notes: "Action terrain attestée.",
  };
}

function evidence(
  actionId: string,
  roleCode: TerrainSpecializationEvidence["roleCode"],
  actionDate: string,
): TerrainSpecializationEvidence {
  const definition = TERRAIN_SPECIALIZATIONS.find((item) => item.roleCode === roleCode)!;
  return {
    actionId,
    actionDate,
    actionCreatedAt: `${actionDate}T10:00:00Z`,
    specializationId: definition.id,
    roleCode,
    attestationId: `attestation-${actionId}-${roleCode}`,
    attestationRevision: 1,
    provenance: "planned_assignment",
  };
}

describe("personal terrain mission history", () => {
  it("adds a non-organizer's attested action and merges roles without duplicating an existing action", () => {
    const history = buildPersonalHistory(
      [action("action-existing", "2026-01-02")],
      [
        evidence("action-existing", "group_lead", "2026-01-02"),
        evidence("action-existing", "recyclable_bag_lead", "2026-01-02"),
        evidence("action-volunteer", "glass_bag_lead", "2026-01-03"),
      ],
      [action("action-volunteer", "2026-01-03", "Action bénévole")],
    );

    expect(history.timeline.map((item) => item.id)).toEqual([
      "action-volunteer",
      "action-existing",
    ]);
    expect(history.timeline).toHaveLength(2);
    expect(history.timeline.find((item) => item.id === "action-existing")?.validatedRoleCodes).toEqual([
      "group_lead",
      "recyclable_bag_lead",
    ]);
    expect(history.timeline.find((item) => item.id === "action-volunteer")?.validatedRoleCodes).toEqual([
      "glass_bag_lead",
    ]);
  });

  it("sorts deterministically and applies the thirty-entry limit after merging", () => {
    const rows = Array.from({ length: 35 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return action(`action-${day}`, `2026-01-${day}`);
    });
    const shuffledRows = [...rows].reverse();
    const shuffledEvidence = rows
      .map((row) => evidence(row.id, "group_lead", row.action_date))
      .reverse();

    const history = buildPersonalHistory([], shuffledEvidence, shuffledRows);

    expect(history.timeline).toHaveLength(30);
    expect(history.timeline.map((item) => item.id)).toEqual(
      rows
        .map((row) => row.id)
        .reverse()
        .slice(0, 30),
    );
    expect(history.mapPoints).toHaveLength(0);
  });

  it("does not invent a mission without current confirmed evidence", () => {
    const history = buildPersonalHistory(
      [action("action-without-proof", "2026-01-01")],
      [],
      [action("action-without-proof", "2026-01-01")],
    );

    expect(history.timeline.filter((item) => item.validatedRoleCodes.length > 0)).toEqual([]);
  });
});
