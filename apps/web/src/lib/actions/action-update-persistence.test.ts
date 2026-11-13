import { describe, expect, it, vi } from "vitest";
import type { ActionRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionUpdateInput } from "./action-update-audit";
import type { ActionFormalitiesFacts } from "./formalities/qualification";
import type { ActionFormalitiesWorkflowState } from "./formalities/workflow";
import { persistActionUpdate, prepareActionUpdate } from "./action-update-persistence";
import { extractActionMetadataFromNotes } from "./metadata";

const resolveActionDepartmentForPersistenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/geo/action-department-resolver", () => ({
  resolveActionDepartmentForPersistence: resolveActionDepartmentForPersistenceMock,
}));

function buildCurrent(
  preparationData: ActionRow["preparation_data"],
  overrides: Partial<ActionRow> = {},
): ActionRow {
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
    ...overrides,
  };
}

describe("prepareActionUpdate administrative requirements boundary", () => {
  it("allows an independent PATCH when a legacy row has no temporal fields", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, {
        action_date: "",
        action_timezone: null,
        event_start_time: null,
        event_end_time: null,
      } as Partial<ActionRow>),
      parsedBody: ({ notes: "Matériel vérifié" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.notes).toContain("Matériel vérifié");
    expect(prepared.updateData).not.toHaveProperty("event_start_at");
    expect(prepared.updateData).not.toHaveProperty("event_end_at");
  });

  it("validates the complete resulting window when a temporal field changes", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    await expect(
      prepareActionUpdate({
        current: buildCurrent({}, { action_date: "2026-03-08" }),
        parsedBody: ({ actionTimezone: "America/Montreal", eventStartTime: "02:30" } as unknown as ActionUpdateInput),
      }),
    ).rejects.toThrow(/inexist|ambig|DST|time/i);
  });

  it("recalculates a derived target when duration changes", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        durationMinutesDeclared: false,
        routeTargetDistanceKm: 0.5,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      }),
      parsedBody: ({ durationMinutes: 90, eventEndTime: "11:00" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      durationMinutesDeclared: true,
      routeTargetDistanceKm: 4.5,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
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
      durationMinutesDeclared: true,
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

});

describe("server-managed route provenance boundary", () => {
  it("does not let a user PATCH create network-provider metadata", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({ actionTitle: "Avant" }),
      parsedBody: ({
        preparationData: {
          actionTitle: "Après",
          routeNetworkDistanceKm: 4.2,
          routeGeometryMode: "network",
          routeGeometryProvider: "fossgis-osrm",
          routeCalibrationContext: { version: "action-route-calibration-v3" },
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({ actionTitle: "Après" });
    expect(prepared.updateData.preparation_data).not.toHaveProperty("routeNetworkDistanceKm");
    expect(prepared.updateData.preparation_data).not.toHaveProperty("routeGeometryMode");
    expect(prepared.updateData.preparation_data).not.toHaveProperty("routeGeometryProvider");
    expect(prepared.updateData.preparation_data).not.toHaveProperty("routeCalibrationContext");
  });

  it("keeps existing provider metadata unchanged when a form echoes it", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const currentRouteMetadata = {
      routeNetworkDistanceKm: 2.7,
      routeGeometryMode: "network" as const,
      routeGeometryProvider: "osrm" as const,
    };
    const prepared = await prepareActionUpdate({
      current: buildCurrent({ ...currentRouteMetadata, actionTitle: "Avant" } as never),
      parsedBody: ({
        preparationData: {
          actionTitle: "Après",
          ...currentRouteMetadata,
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject(currentRouteMetadata);
  });

  it("refuses to rewrite an existing planner context", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const currentContext = { version: "action-route-calibration-v3", marker: "server" };
    await expect(prepareActionUpdate({
      current: buildCurrent({ routeCalibrationContext: currentContext } as never),
      parsedBody: ({
        preparationData: {
          routeCalibrationContext: { ...currentContext, marker: "forged" },
        },
      } as unknown as ActionUpdateInput),
    })).rejects.toThrow("ne peut pas être réécrit");
  });
});

describe("prepareActionUpdate administrative requirements continuation", () => {

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
        volunteersCount: 12,
        volunteerParticipation: {
          childrenCount: 1,
          adultCount: 999,
          retiredCount: 0,
        },
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
    expect(prepared.updateData.volunteers_count).toBe(12);
    expect(prepared.updateData).toMatchObject({
      volunteers_count: 12,
      children_count: 1,
      adult_count: 11,
      retired_count: 0,
    });
    expect(
      extractActionMetadataFromNotes(prepared.updateData.notes as string)
        .volunteerParticipation,
    ).toBeNull();
  });

  it("rejects a future effective date when finalizing an action", async () => {
    await expect(
      prepareActionUpdate({
        current: buildCurrent({}, { action_date: "2999-01-01" }),
        parsedBody: ({
          actionPhase: "post_action_complete",
          volunteersCount: 12,
          volunteerParticipation: { childrenCount: 1, adultCount: 11, retiredCount: 0 },
        } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "actionDate" });
  });

  it("rejects an explicit future date on an already completed action", async () => {
    await expect(
      prepareActionUpdate({
        current: buildCurrent({}, { action_phase: "post_action_complete" }),
        parsedBody: ({ actionDate: "2999-01-01" } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "actionDate" });
  });

  it("keeps future dates available for pre-action planning", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}),
      parsedBody: ({ actionDate: "2999-01-01" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.action_date).toBe("2999-01-01");
  });

  it("does not revalidate an unchanged historical date on a completed action", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, {
        action_phase: "post_action_complete",
        action_date: "2999-01-01",
      }),
      parsedBody: ({ notes: "Correction indépendante" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).not.toHaveProperty("action_date");
  });

  it("rejects a partial coordinate patch when the effective pair is incomplete", async () => {
    await expect(
      prepareActionUpdate({
        current: buildCurrent({}),
        parsedBody: ({ latitude: 48.8566 } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "latitude" });
  });

  it("accepts changing one coordinate when the effective pair remains complete", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, { latitude: 48.8566, longitude: 2.3522 }),
      parsedBody: ({ latitude: 48.9 } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).toMatchObject({ latitude: 48.9 });
    expect(prepared.updateData.longitude).toBeUndefined();
  });

  it("completes a historical partial coordinate pair", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, { latitude: 48.8566, longitude: null }),
      parsedBody: ({ longitude: 2.3522 } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.longitude).toBe(2.3522);
  });

  it("preserves historical partial coordinates when no geo field is submitted", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, { latitude: 48.8566, longitude: null }),
      parsedBody: ({ notes: "Sans changement de localisation" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).not.toHaveProperty("latitude");
    expect(prepared.updateData).not.toHaveProperty("longitude");
  });

  it("rejects out-of-bounds coordinates before building persistence fields", async () => {
    await expect(
      prepareActionUpdate({
        current: buildCurrent({}),
        parsedBody: ({ latitude: 91, longitude: 2 } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "latitude" });
  });

  it.each([
    ["pre-action", "pre_action"],
    ["post-action draft", "post_action_draft"],
  ] as const)("rejects finalization from %s without an explicit composition", async (_label, actionPhase) => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({}, { action_phase: actionPhase }),
        parsedBody: ({ actionPhase: "post_action_complete" } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "volunteerParticipation" });
  });

  it.each([
    ["categories exceed total", 12, 13, 0],
    ["zero total", 0, 0, 0],
  ] as const)("rejects finalization when the composition is invalid: %s", async (_label, volunteersCount, childrenCount, retiredCount) => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({}),
        parsedBody: ({
          actionPhase: "post_action_complete",
          volunteersCount,
          volunteerParticipation: { childrenCount, adultCount: 999, retiredCount },
        } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "volunteerParticipation" });
  });

  it("accepts a partial total PATCH when the current final composition is typed", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, {
        action_phase: "post_action_complete",
        volunteers_count: 26,
        children_count: 18,
        adult_count: 8,
        retired_count: 0,
        notes: "Bilan final sans composition metadata",
      }),
      parsedBody: ({ volunteersCount: 26 } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).toMatchObject({
      volunteers_count: 26,
      children_count: 18,
      adult_count: 8,
      retired_count: 0,
    });
  });

  it("rejects a partial total PATCH when typed columns are incomplete despite history", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    await expect(
      prepareActionUpdate({
        current: buildCurrent({}, {
          action_phase: "post_action_complete",
          volunteers_count: 26,
          children_count: 18,
          adult_count: null,
          retired_count: 0,
          notes: "[cmm-meta]{\"volunteerParticipation\":{\"childrenCount\":20,\"adultCount\":6,\"retiredCount\":0}}",
        }),
        parsedBody: ({ volunteersCount: 26 } as unknown as ActionUpdateInput),
      }),
    ).rejects.toMatchObject({ field: "volunteerParticipation" });
  });

  it("does not invent adults while editing a historical complete action without participant fields", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({
      departmentCode: null,
      departmentName: null,
    });

    const prepared = await prepareActionUpdate({
      current: buildCurrent({}, {
        action_phase: "post_action_complete",
        volunteers_count: 1,
      }),
      parsedBody: ({ notes: "Correction indépendante" } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData).not.toHaveProperty("volunteers_count");
    expect(prepared.updateData.notes).toContain("Correction indépendante");
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

describe("prepareActionUpdate duration declaration boundary", () => {
  it("preserves an absent duration declaration across a partial preparation PATCH", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        durationMinutesDeclared: false,
        estimatedDurationMinutes: 45,
        routeTargetDistanceKm: 1,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      }, { duration_minutes: 0 }),
      parsedBody: ({ preparationData: { actionTitle: "Après" } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      durationMinutesDeclared: false,
      estimatedDurationMinutes: 45,
      routeTargetDistanceKm: 1,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
    });
  });

  it("preserves a manual target across a partial preparation PATCH", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        durationMinutesDeclared: false,
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
      }, { duration_minutes: 0 }),
      parsedBody: ({ preparationData: { actionTitle: "Après" } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      actionTitle: "Après",
      durationMinutesDeclared: false,
      routeTargetDistanceKm: 2.25,
      routeTargetDistanceSource: "manual",
    });
    expect(prepared.updateData.preparation_data).not.toHaveProperty(
      "routeTargetDistancePolicyVersion",
    );
  });

  it("honors an explicit target modification instead of the persisted target", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        routeTargetDistanceKm: 2.25,
        routeTargetDistanceSource: "manual",
      }),
      parsedBody: ({
        preparationData: {
          routeTargetDistanceKm: 3.5,
          routeTargetDistanceSource: "manual",
        },
      } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      routeTargetDistanceKm: 3.5,
      routeTargetDistanceSource: "manual",
    });
    expect(prepared.updateData.preparation_data).not.toHaveProperty(
      "routeTargetDistancePolicyVersion",
    );
  });

  it("honors an explicit absent-duration marker instead of the SQL zero", async () => {
    resolveActionDepartmentForPersistenceMock.mockResolvedValue({ departmentCode: null, departmentName: null });
    const prepared = await prepareActionUpdate({
      current: buildCurrent({
        durationMinutesDeclared: true,
        routeTargetDistanceKm: 0,
        routeTargetDistanceSource: "derived",
        routeTargetDistancePolicyVersion: "route-distance-v1",
      }, { duration_minutes: 0 }),
      parsedBody: ({ preparationData: { durationMinutesDeclared: false } } as unknown as ActionUpdateInput),
    });

    expect(prepared.updateData.preparation_data).toMatchObject({
      durationMinutesDeclared: false,
      routeTargetDistanceKm: 1,
      routeTargetDistanceSource: "derived",
      routeTargetDistancePolicyVersion: "route-distance-v2",
    });
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
