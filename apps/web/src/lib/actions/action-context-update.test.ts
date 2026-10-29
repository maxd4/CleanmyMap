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
    id: "action-context-42",
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
    duration_minutes: 30,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    notes: "",
    status: "pending",
    published_at: null,
    action_phase: "pre_action",
    preparation_data: {},
    ...overrides,
  };
}

describe("action context update persistence", () => {
  it("auto-classifies a final strict two-thirds composition as school", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent(),
      parsedBody: ({
        actionPhase: "post_action_complete",
        volunteersCount: 15,
        volunteerParticipation: { childrenCount: 11, retiredCount: 0 },
      } as unknown as ActionUpdateInput),
      userId: "editor-1",
    });

    expect(prepared.updateData).toMatchObject({
      action_context: "school",
      action_context_source: "automatic_children_ratio",
      school_context_confirmed: null,
    });
  });

  it("preserves an explicit context while composition changes", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        action_phase: "post_action_complete",
        action_context: "citizen",
        action_context_source: "explicit",
      }),
      parsedBody: ({
        volunteersCount: 15,
        volunteerParticipation: { childrenCount: 11, retiredCount: 0 },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).not.toHaveProperty("action_context");
  });

  it("restarts automatic classification after an explicit reset", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        action_phase: "post_action_complete",
        action_context: "citizen",
        action_context_source: "explicit",
      }),
      parsedBody: ({
        actionContext: null,
        volunteersCount: 15,
        volunteerParticipation: { childrenCount: 11, retiredCount: 0 },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).toMatchObject({
      action_context: "school",
      action_context_source: "automatic_children_ratio",
    });
  });

  it("persists an explicit pre-action choice carried by preparation data", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent(),
      parsedBody: ({
        actionPhase: "pre_action",
        preparationData: { actionContextSelection: "company" },
      } as unknown as ActionUpdateInput),
      userId: "editor-1",
    });

    expect(prepared.updateData).toMatchObject({
      action_context: "company",
      action_context_source: "explicit",
    });
  });
});
