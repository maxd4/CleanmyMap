import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionUpdateInput } from "./action-update-audit";
import type { ActionFormalitiesFacts } from "./formalities-qualification";
import type { ActionFormalitiesWorkflowState } from "./formalities-workflow";
import {
  persistActionUpdate,
  prepareActionUpdate,
} from "./action-update-persistence";

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
  it("recalculates a derived target when duration changes", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        routeTargetDistanceKm: 0.5,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      }),
      parsedBody: ({ durationMinutes: 90, eventEndTime: "11:00" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      routeTargetDistanceKm: 1.5,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v1",
    });
  });

  it("does not recalculate a manual target when duration changes", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
      }),
      parsedBody: ({ durationMinutes: 90, eventEndTime: "11:00" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      routeTargetDistanceKm: 2.25,
      routeTargetDistanceSource: "manual",
    });
    expect(prepared.updateData.preparation_data).not.toHaveProperty(
      "routeTargetDistancePolicyVersion",
    );
  });

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

  it("preserves a historical preparation state without accepting it as new input", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        actionTitle: "Avant",
        preparationState: "pret_a_partager",
      } as never),
      parsedBody: ({ preparationData: { actionTitle: "Après" } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      preparationState: "pret_a_partager",
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

  it("preserves formalities context and server-managed workflow when the ordinary form omits them", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const workflow = {
      schemaVersion: "action-formalities-workflow-v1",
      contentVersion: "qualification-v1",
      trace: { determiningFacts: { publicSpace: "public_domain" } },
      progress: [],
    } as unknown as ActionFormalitiesWorkflowState;
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        actionTitle: "Avant",
        formalitiesContext: { publicSpace: "public_domain" } as unknown as ActionFormalitiesFacts,
        formalitiesWorkflow: workflow,
      }),
      parsedBody: ({ preparationData: { actionTitle: "Après" } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      formalitiesContext: { publicSpace: "public_domain" },
      formalitiesWorkflow: workflow,
    });
  });

  it("preserves the server-managed active route version during an ordinary PATCH", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const routeVersioning = {
      schemaVersion: "action-route-versioning-v1",
      active: { versionId: "route-v1-current" },
      history: [],
    };
    const prepared = await prepareActionUpdate({
      current: buildCurrent({ routeVersioning } as never),
      parsedBody: ({ preparationData: { actionTitle: "Après" } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      routeVersioning,
    });
  });

  it("allows retrospective completion while requirements remain pending", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        administrativeRequirements: {
          status: "pending",
          validatedAt: null,
          validatedByUserId: null,
        },
      }),
      parsedBody: ({
        actionPhase: "post_action_complete",
        notes: "Finalisation rétrospective de l'action",
        preparationData: { actionTitle: "Résultats de l'action" },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.action_phase).toBe("post_action_complete");
    expect(prepared.updateData.preparation_data).toMatchObject({
      administrativeRequirements: {
        status: "pending",
        validatedAt: null,
        validatedByUserId: null,
      },
    });
  });

  it("allows the post-action draft transition while requirements are pending", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({
          administrativeRequirements: {
            status: "pending",
            validatedAt: null,
            validatedByUserId: null,
          },
        }),
        parsedBody: ({ actionPhase: "post_action_draft" } as unknown as ActionUpdateInput),
      }),
    ).resolves.toBeDefined();
  });

  it("blocks an incoherent pre-action forecast on an existing draft", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({}),
        parsedBody: ({
          actionPhase: "pre_action",
          preparationData: {
            volunteersExpected: 12,
            volunteerParticipation: {
              childrenCount: 2,
              adultCount: 4,
              retiredCount: 2,
            },
          },
        } as unknown as ActionUpdateInput),
      }),
    ).rejects.toThrow("La somme de la répartition (8) doit correspondre");
  });
});

describe("persistActionUpdate", () => {
  function buildPersistenceClient(result: { data: unknown; error: unknown }) {
    const single = vi.fn().mockResolvedValue(result);
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    return {
      client: { from } as unknown as SupabaseClient,
      from,
      update,
      eq,
      select,
    };
  }

  it("does not call the database for an empty update", async () => {
    const from = vi.fn();

    await expect(
      persistActionUpdate({
        supabase: { from } as unknown as SupabaseClient,
        actionId: "action-42",
        updateData: {},
      }),
    ).resolves.toEqual({ succeeded: false, revision: null });

    expect(from).not.toHaveBeenCalled();
  });

  it("returns the persisted revision after a successful update", async () => {
    const { client, from, update, eq, select } = buildPersistenceClient({
      data: { id: "action-42", updated_at: "2026-09-15T12:00:00.000Z" },
      error: null,
    });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Finalisé" },
      }),
    ).resolves.toEqual({
      succeeded: true,
      revision: "2026-09-15T12:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("actions");
    expect(update).toHaveBeenCalledWith({ notes: "Finalisé" });
    expect(eq).toHaveBeenCalledWith("id", "action-42");
    expect(select).toHaveBeenCalledWith("id, updated_at");
  });

  it("does not invent a revision when the update returns no row", async () => {
    const { client } = buildPersistenceClient({ data: null, error: null });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Absent" },
      }),
    ).resolves.toEqual({ succeeded: false, revision: null });
  });

  it("raises a stable error when persistence fails", async () => {
    const { client } = buildPersistenceClient({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      persistActionUpdate({
        supabase: client,
        actionId: "action-42",
        updateData: { notes: "Refusé" },
      }),
    ).rejects.toThrow("Action update failed");
  });
});
