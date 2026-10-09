import { describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { awardActionMilestonesForUser } from "./progression-data";
import { createOrganizerChain } from "./progression-data.test.helpers";
import type { ActionRow } from "./progression-types";

function buildAction(id = "action-1", status: ActionRow["status"] = "approved"): ActionRow {
  return {
    id,
    created_at: "2026-09-20T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-09-20",
    location_label: "Parc de test",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 2,
    cigarette_butts: 12,
    volunteers_count: 2,
    duration_minutes: 60,
    status,
    action_phase: "post_action_complete",
    published_at: "2026-09-18T10:00:00.000Z",
    geometry_source: "gpx_import",
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: JSON.stringify({
      type: "LineString",
      coordinates: [[2.35, 48.85], [2.351, 48.851]],
    }),
    preparation_data: {
      gpxImport: {
        source: "gpx_import",
        observedDistanceKm: 1.2,
        pointCount: 2,
        inferredTopology: "point_to_point",
      },
    },
    notes: appendActionMetadataToNotes("Action préparée et réalisée", {
      groupJoinEnabled: true,
      wasteMeasurementMethod: "balance_suspendue",
      wasteBreakdown: {
        recyclablesKg: 1,
        glassKg: 0.5,
        householdWasteKg: 0.5,
      },
    }),
  };
}

function createSupabase() {
  const eventKeys = new Set<string>();
  const insertedEvents: Array<Record<string, unknown>> = [];
  const participantChain = {
    select: vi.fn(() => participantChain),
    in: vi.fn(() => participantChain),
    eq: vi.fn(async () => ({
      data: [
        { action_id: "action-1", user_id: "user-1", participation_status: "confirmed" },
        { action_id: "action-1", user_id: "user-2", participation_status: "confirmed" },
        { action_id: "action-2", user_id: "user-1", participation_status: "confirmed" },
        { action_id: "action-2", user_id: "user-2", participation_status: "confirmed" },
      ],
      error: null,
    })),
  };
  const progressionEventsChain = {
    insert: vi.fn(async (row: Record<string, unknown>) => {
      const key = [row.user_id, row.event_type, row.source_table, row.source_id, row.status_phase].join(":");
      if (eventKeys.has(key)) {
        return { error: { code: "23505", message: "duplicate progression event" } };
      }
      eventKeys.add(key);
      insertedEvents.push(row);
      return { error: null };
    }),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "action_participants") return participantChain;
      if (table === "action_organizers") return createOrganizerChain();
      if (table === "progression_events") return progressionEventsChain;
      if (table === "action_registrations") {
        throw new Error("Mobilisateur must not read future registrations");
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, insertedEvents };
}

describe("action milestone rebuild", () => {
  it("is one-shot across replay, an equivalent second action, rejection and historical rebuild", async () => {
    const { supabase, insertedEvents } = createSupabase();
    const first = buildAction("action-1");

    await expect(awardActionMilestonesForUser(supabase as never, "user-1", [first], {
      validationQualityGrades: new Map([[first.id, "A"]]),
    })).resolves.toBeGreaterThan(0);
    const firstCount = insertedEvents.length;
    expect(insertedEvents.filter((row) => row.xp_awarded === 1)).toHaveLength(3);

    await expect(awardActionMilestonesForUser(supabase as never, "user-1", [first], {
      validationQualityGrades: new Map([[first.id, "A"]]),
    })).resolves.toBe(0);
    await expect(awardActionMilestonesForUser(supabase as never, "user-1", [buildAction("action-2")], {
      validationQualityGrades: new Map([["action-2", "A"]]),
    })).resolves.toBe(0);
    await expect(awardActionMilestonesForUser(supabase as never, "user-1", [buildAction("action-3", "rejected")], {
      validationQualityGrades: new Map([["action-3", "A"]]),
    })).resolves.toBe(0);
    await expect(awardActionMilestonesForUser(supabase as never, "user-1", [first], {
      validationQualityGrades: new Map([[first.id, "A"]]),
    })).resolves.toBe(0);

    expect(insertedEvents).toHaveLength(firstCount);
    expect(new Set(insertedEvents.map((row) => row.event_type))).toEqual(new Set([
      "action_loop_completed",
      "action_mobilizer",
      "action_exemplary_data",
      "action_documented_route",
      "action_traceable_measurement",
      "action_documented_sorting",
    ]));
  });
});
