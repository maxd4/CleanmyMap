import { expect, it, vi } from "vitest";
import { createActionSupabaseHarness } from "@/__tests__/support/admin-moderation-route";
import { parseJsonSafely } from "@/lib/actions/http-errors";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstMockArgument(mock: { mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> } }): unknown {
  return mock.mock.calls[0]?.[0];
}

export function registerActionVisibilityScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  registerHideScenario(mocks);
  registerCombinedEditScenario(mocks);
  registerRestoreScenario(mocks);
  registerApprovedRestoreScenario(mocks);
  registerInvalidProjectionScenario(mocks);
}

function registerHideScenario({
    getSupabaseAdminClientMock,
    appendAdminOperationAuditMock,
}: ModerationScenarioMocks) {

  it("hides an action through moderation visibility with reason and audit", async () => {
    let currentAction = {
      status: "pending",
      moderation_visibility: "visible",
      created_by_clerk_id: "creator-1",
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 3,
      duration_minutes: 30,
      notes: null,
    };
    const updateMock = vi.fn((updates: Record<string, unknown>) => {
      currentAction = {
        ...currentAction,
        status: (updates["status"] as string | undefined) ?? currentAction.status,
        moderation_visibility:
          (updates["moderation_visibility"] as string | undefined) ??
          currentAction.moderation_visibility,
      };
      return {
      eq: vi.fn(() => ({
        select: vi.fn((columns: string) => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: columns.includes("moderation_visibility")
              ? {
                  moderation_visibility: currentAction.moderation_visibility,
                  hidden_at: updates["hidden_at"] ?? null,
                  hidden_by_clerk_id: updates["hidden_by_clerk_id"] ?? null,
                  hidden_reason: updates["hidden_reason"] ?? null,
                }
              : { id: "action-1" },
            error: null,
          }),
        })),
      })),
      };
    });
    const selectMock = vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: columns.startsWith("status, moderation_visibility")
            ? currentAction
            : columns.includes("moderation_visibility")
            ? {
                moderation_visibility: currentAction.moderation_visibility,
                hidden_at: null,
                hidden_by_clerk_id: null,
                hidden_reason: null,
              }
            : { id: "action-1" },
          error: null,
        }),
      })),
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: selectMock,
        update: updateMock,
      };
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          moderationVisibility: "hidden",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Contenu à vérifier avant publication.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moderation_visibility: "hidden",
        hidden_by_clerk_id: "admin-1",
        hidden_reason: "Contenu à vérifier avant publication.",
      }),
    );
    const audit = firstMockArgument(appendAdminOperationAuditMock);
    expect(audit).toMatchObject({
        outcome: "success",
        targetId: "action-1",
        details: {
          operation: "hide_action",
          reason: "Contenu à vérifier avant publication.",
          previousValue: {
            moderationVisibility: "visible",
            status: "pending",
            wasteKg: 1,
            cigaretteButts: 2,
            volunteersCount: 3,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          },
          newValue: {
            moderationVisibility: "hidden",
            status: "pending",
            wasteKg: 1,
            cigaretteButts: 2,
            volunteersCount: 3,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          },
        },
      });
  });
}

function registerCombinedEditScenario({
  getSupabaseAdminClientMock,
  appendAdminOperationAuditMock,
}: ModerationScenarioMocks) {
  it("keeps visibility and impact changes together in one allowlisted snapshot", async () => {
    const harness = createActionSupabaseHarness();
    getSupabaseAdminClientMock.mockReturnValue({ from: harness.from });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          moderationVisibility: "hidden",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Correction combinée validée.",
          edits: {
            wasteKg: 8,
            cigaretteButts: 20,
            volunteersCount: 4,
            durationMinutes: 60,
            wasteBreakdown: {
              recyclablesKg: null,
              glassKg: null,
              householdWasteKg: null,
              otherWasteKg: 0.2,
            },
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(harness.updateMock).toHaveBeenCalledTimes(2);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = firstMockArgument(appendAdminOperationAuditMock);
    if (!isRecord(audit) || !isRecord(audit.details)) throw new Error("Expected an audited moderation operation");
    expect(audit.details.previousValue).toEqual({
      status: "pending",
      moderationVisibility: "visible",
      wasteKg: 1,
      cigaretteButts: 2,
      volunteersCount: 3,
      durationMinutes: 30,
      wasteBreakdownPresent: false,
    });
    expect(audit.details.newValue).toEqual({
      status: "pending",
      moderationVisibility: "hidden",
      wasteKg: 8,
      cigaretteButts: 20,
      volunteersCount: 4,
      durationMinutes: 60,
      wasteBreakdownPresent: true,
    });
    expect(audit.details.targetUserId).toBe("creator-1");
    expect(
      Object.keys(audit.details).filter(
        (key) => key === "previousValue" || key === "newValue",
      ),
    ).toEqual(["previousValue", "newValue"]);
    const serializedDetails = JSON.stringify(audit.details);
    expect(serializedDetails).not.toContain('"wasteBreakdown":');
    expect(serializedDetails).not.toContain("hiddenReason");
    expect(serializedDetails).not.toContain("hiddenByClerkId");
    expect(serializedDetails).not.toContain("notes");
    expect(serializedDetails).not.toContain("Lieu interne");
    expect(serializedDetails).not.toContain("Auteur interne");
  });
}

function registerRestoreScenario({
  getSupabaseAdminClientMock,
  appendAdminOperationAuditMock,
}: ModerationScenarioMocks) {
  it("restores moderation visibility without bypassing the action status", async () => {
    let currentAction = {
      status: "pending",
      moderation_visibility: "hidden",
      created_by_clerk_id: "creator-1",
      waste_kg: 5,
      cigarette_butts: 6,
      volunteers_count: 7,
      duration_minutes: 45,
      notes: null,
    };
    const updateMock = vi.fn((updates: Record<string, unknown>) => {
      currentAction = {
        ...currentAction,
        status: (updates["status"] as string | undefined) ?? currentAction.status,
        moderation_visibility:
          (updates["moderation_visibility"] as string | undefined) ??
          currentAction.moderation_visibility,
      };
      return {
        eq: vi.fn(() => ({
          select: vi.fn((columns: string) => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: columns.includes("moderation_visibility")
                ? {
                    moderation_visibility: currentAction.moderation_visibility,
                    hidden_at: updates["hidden_at"] ?? null,
                    hidden_by_clerk_id: updates["hidden_by_clerk_id"] ?? null,
                    hidden_reason: updates["hidden_reason"] ?? null,
                  }
                : { id: "action-1" },
              error: null,
            }),
          })),
        })),
      };
    });
    const selectMock = vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: columns.startsWith("status, moderation_visibility")
            ? currentAction
            : columns.includes("moderation_visibility")
            ? {
                moderation_visibility: currentAction.moderation_visibility,
                hidden_at: "2026-07-11T12:00:00.000Z",
                hidden_by_clerk_id: "admin-1",
                hidden_reason: "Contenu à vérifier avant publication.",
              }
            : { id: "action-1" },
          error: null,
        }),
      })),
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: selectMock,
        update: updateMock,
      };
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          moderationVisibility: "visible",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Restauration après vérification.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
      }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        moderation_visibility: "visible",
        hidden_at: null,
        hidden_by_clerk_id: null,
        hidden_reason: null,
      }),
    );
    const audit = firstMockArgument(appendAdminOperationAuditMock);
    expect(audit).toMatchObject({
        outcome: "success",
        targetId: "action-1",
        details: {
          operation: "restore_after_sanction",
          reason: "Restauration après vérification.",
          previousValue: {
            moderationVisibility: "hidden",
            status: "pending",
            wasteKg: 5,
            cigaretteButts: 6,
            volunteersCount: 7,
            durationMinutes: 45,
            wasteBreakdownPresent: false,
          },
          newValue: {
            moderationVisibility: "visible",
            status: "pending",
            wasteKg: 5,
            cigaretteButts: 6,
            volunteersCount: 7,
            durationMinutes: 45,
            wasteBreakdownPresent: false,
          },
        },
      });
  });
}

function registerApprovedRestoreScenario({
  getSupabaseAdminClientMock,
  copyValidatedActionToLocalStoreMock,
  trackActionValidationBonusMock,
  appendAdminOperationAuditMock,
}: ModerationScenarioMocks) {
  it("restores an approved action without replaying validation rewards", async () => {
    const updateMock = vi.fn((updates: Record<string, unknown>) => ({
      eq: vi.fn(() => ({
        select: vi.fn((columns: string) => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: columns.includes("moderation_visibility")
              ? {
                  moderation_visibility: updates["moderation_visibility"],
                  hidden_at: updates["hidden_at"] ?? null,
                  hidden_by_clerk_id: updates["hidden_by_clerk_id"] ?? null,
                  hidden_reason: updates["hidden_reason"] ?? null,
                }
              : { id: "action-1" },
            error: null,
          }),
        })),
      })),
    }));
    const selectMock = vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: columns.includes("moderation_visibility")
            ? {
                moderation_visibility: "hidden",
                hidden_at: "2026-07-11T12:00:00.000Z",
                hidden_by_clerk_id: "admin-1",
                hidden_reason: "Contenu à vérifier avant publication.",
              }
            : { id: "action-1" },
          error: null,
        }),
      })),
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: selectMock,
        update: updateMock,
      };
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "approved",
          moderationVisibility: "visible",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Restauration après vérification.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
      }),
    );
    expect(copyValidatedActionToLocalStoreMock).not.toHaveBeenCalled();
    expect(trackActionValidationBonusMock).not.toHaveBeenCalled();
    const audit = firstMockArgument(appendAdminOperationAuditMock);
    expect(audit).toMatchObject({
        outcome: "success",
        details: {
          operation: "restore_after_sanction",
          copiedToLocalValidatedStore: false,
        },
      });
  });
}

function registerInvalidProjectionScenario({
  getSupabaseAdminClientMock,
}: ModerationScenarioMocks) {
  it("sanitizes an invalid visibility projection returned by Supabase", async () => {
    const selectMock = vi.fn((columns: string) => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: columns.includes("moderation_visibility, hidden_at")
            ? {
                moderation_visibility: { leaked: true },
                hidden_at: null,
                hidden_by_clerk_id: null,
                hidden_reason: null,
              }
            : {
                status: "pending",
                moderation_visibility: "visible",
                created_by_clerk_id: "creator-1",
                waste_kg: 1,
                cigarette_butts: 2,
                volunteers_count: 3,
                duration_minutes: 30,
                notes: null,
              },
          error: null,
        }),
      })),
    }));
    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "action-1", updated_at: "2026-10-25T10:00:00.000Z" },
            error: null,
          }),
        })),
      })),
    }));
    getSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: selectMock, update: updateMock })),
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          moderationVisibility: "hidden",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Projection Supabase à vérifier.",
        }),
      }),
    );

    expect(response.status).toBe(500);
    const body = await parseJsonSafely(response);
    expect(body).toMatchObject({
      error: "La modération a échoué.",
      code: "server_error",
    });
    expect(JSON.stringify(body)).not.toContain("leaked");
  });
}
