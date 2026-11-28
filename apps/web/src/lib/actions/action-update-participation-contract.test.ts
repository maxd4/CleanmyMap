import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { extractActionMetadataFromNotes } from "./metadata";
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
    waste_kg: null,
    cigarette_butts: null,
    volunteers_count: 1,
    collectors_count: null,
    children_count: null,
    adult_count: null,
    retired_count: null,
    duration_minutes: 30,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    action_timezone: "Europe/Paris",
    notes: "",
    status: "pending",
    published_at: null,
    action_phase: "pre_action",
    preparation_data: {},
    ...overrides,
  } as ActionRow;
}

describe("action participant PATCH contract", () => {
  it("persists a known single age category without deriving adults", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({ action_phase: "post_action_draft" }),
      parsedBody: ({
        actionPhase: "post_action_complete",
        volunteersCount: 15,
        volunteerParticipation: { childrenCount: 1, adultCount: null, retiredCount: null },
      } as unknown as ActionUpdateInput),
    });
    expect(prepared.updateData).toMatchObject({
      volunteers_count: 15,
      children_count: 1,
      adult_count: null,
      retired_count: null,
    });
  });

  it("accepts a historical total default only when the stored count equals the total", async () => {
    const current = buildCurrent({
      action_phase: "post_action_complete",
      volunteers_count: 10,
      collectors_count: 10,
      notes: '[cmm-meta]{"collectorsCountProvenance":"historical_unknown"}',
    });
    const accepted = await prepareActionUpdate({
      current,
      parsedBody: ({ collectorsCountProvenance: "historical_default_accepted" } as unknown as ActionUpdateInput),
    });
    expect(extractActionMetadataFromNotes(accepted.updateData.notes as string).collectorsCountProvenance)
      .toBe("historical_default_accepted");

    await expect(prepareActionUpdate({
      current: { ...current, collectors_count: 9 },
      parsedBody: ({ collectorsCountProvenance: "historical_default_accepted" } as unknown as ActionUpdateInput),
    })).rejects.toMatchObject({ field: "collectorsCountProvenance" });
  });
});
