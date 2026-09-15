import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { ActionUpdateInput } from "./action-update-audit";
import { prepareActionUpdate } from "./action-update-persistence";

const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

function buildCurrent(preparationData: ActionRow["preparation_data"]): ActionRow {
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
    duration_minutes: 30,
    event_start_time: "09:00:00",
    event_end_time: "10:00:00",
    notes: "",
    status: "pending",
    published_at: null,
    action_phase: "pre_action",
    preparation_data: preparationData,
  };
}

describe("prepareActionUpdate administrative requirements boundary", () => {
  it("preserves the canonical value for a same-phase malicious PATCH", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        actionTitle: "Avant",
        administrativeRequirements: {
          status: "pending",
          validatedAt: null,
          validatedByUserId: null,
        },
      }),
      parsedBody: ({
        preparationData: {
          actionTitle: "Après",
          administrativeRequirements: {
            status: "validated",
            validatedAt: "2026-09-15T10:00:00.000Z",
            validatedByUserId: "attacker",
          },
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      administrativeRequirements: {
        status: "pending",
        validatedAt: null,
        validatedByUserId: null,
      },
    });
  });

  it("preserves the canonical value when the same PATCH changes phase", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        actionTitle: "Avant",
        administrativeRequirements: {
          status: "pending",
          validatedAt: null,
          validatedByUserId: null,
        },
      }),
      parsedBody: ({
        actionPhase: "post_action_draft",
        preparationData: {
          actionTitle: "Après phase",
          administrativeRequirements: {
            status: "validated",
            validatedAt: "2026-09-15T10:00:00.000Z",
            validatedByUserId: "attacker",
          },
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.action_phase).toBe("post_action_draft");
    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après phase",
      administrativeRequirements: {
        status: "pending",
        validatedAt: null,
        validatedByUserId: null,
      },
    });
  });

  it("does not retain an in-progress pre-action while requirements are pending", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({
          preparationState: "action_en_cours",
          administrativeRequirements: {
            status: "pending",
            validatedAt: null,
            validatedByUserId: null,
          },
        }),
        parsedBody: ({ notes: "Mise à jour sans démarrage" } as unknown as ActionUpdateInput),
      }),
    ).rejects.toThrow("Les démarches administratives doivent être validées");
  });
});
