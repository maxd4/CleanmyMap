import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { prepareActionUpdate } from "./action-update-persistence";

const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

function buildCurrent(overrides: Partial<ActionRow> = {}): ActionRow {
  return {
    id: "action-42",
    created_at: "2026-09-15T09:00:00.000Z",
    updated_at: "2026-09-15T09:00:00.000Z",
    created_by_clerk_id: "creator-1",
    actor_name: "Test",
    organizer_type: null,
    action_date: "2026-09-20",
    location_label: "Paris",
    department_code: null,
    department_name: null,
    latitude: null,
    longitude: null,
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    geometry_confidence: null,
    waste_kg: 10,
    cigarette_butts: null,
    volunteers_count: 1,
    duration_minutes: 30,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    notes: '[cmm-meta]{"wasteBreakdown":{"characterizationKg":{"plastic":10.2}}}',
    status: "pending",
    published_at: null,
    action_phase: "pre_action",
    preparation_data: {},
    ...overrides,
  };
}

describe("action update characterization validation", () => {
  it("rejects an incoherent characterization inherited from current metadata", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent(),
        parsedBody: ({ notes: "Correction indépendante" } as unknown as ActionUpdateInput),
      }),
    ).rejects.toThrow("La somme des masses caractérisées ne peut pas dépasser");
  });
});
