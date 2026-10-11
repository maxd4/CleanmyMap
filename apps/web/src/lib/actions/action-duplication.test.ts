import { describe, expect, it } from "vitest";
import { buildActionDuplicatePrefill } from "./action-duplication";
import type { ActionRow } from "@/types/database";

function action(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "action-source",
    created_at: "2026-01-01T00:00:00.000Z",
    created_by_clerk_id: "creator-1",
    actor_name: "Créateur",
    action_date: "2020-01-01",
    location_label: "Quai de Loire",
    latitude: 48.9,
    longitude: 2.38,
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: 12,
    cigarette_butts: 40,
    volunteers_count: 8,
    duration_minutes: 90,
    event_start_time: "09:00",
    event_end_time: "12:00",
    notes: "Note interne à ne jamais recopier",
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {
      actionTitle: "Nettoyage régulier",
      shortDescription: "Description réutilisable",
      pointDeRendezVous: "Métro Loire",
      actionDate: "2020-01-01",
      meetingTime: "09:00",
      interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" },
      preparationChecklist: [{ key: "done", label: "Fait", checked: true }],
      formalitiesContext: { territory: "Paris", actionNature: "cleanwalk" } as never,
      volunteerParticipation: { participantsCount: 8 } as never,
      groupJoinEnabled: true,
      recommendedMaterials: "Gants",
    },
    ...overrides,
  } as ActionRow;
}

describe("action duplication contract", () => {
  it("keeps reusable preparation while clearing historical and participation state", () => {
    const prefill = buildActionDuplicatePrefill(action());
    expect(prefill.title).toBe("Nettoyage régulier");
    expect(prefill.meetingPoint).toBe("Métro Loire");
    expect(prefill.organizerType).toBeNull();
    expect(prefill.operationalRoute).toBeNull();
    expect(prefill.routeCalibrationContext).toBeNull();
    expect(prefill).not.toHaveProperty("actionId");
    expect(prefill).not.toHaveProperty("actionDate");
    expect(prefill).not.toHaveProperty("notes");
    expect(prefill).not.toHaveProperty("volunteerParticipation");
  });

  it("does not carry a route from a fixed-area action", () => {
    const prefill = buildActionDuplicatePrefill(action({
      preparation_data: {
        interventionMode: { mode: "fixed_area", version: "intervention-mode-v1" },
        operationalRoute: { version: "operational-route-v1", source: "planner" } as never,
      },
    }));
    expect(prefill.routeTopology).toBeUndefined();
    expect(prefill.operationalRoute).toBeNull();
  });
});
