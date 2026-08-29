import { expect, it, vi } from "vitest";
import { createActionSupabaseHarness } from "./route.test.helpers";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerActionVisibilityScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    appendAdminOperationAuditMock,
    copyValidatedActionToLocalStoreMock,
    emitActionValidatedMock,
  } = mocks;

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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        targetId: "action-1",
        details: expect.objectContaining({
          operation: "hide_action",
          reason: "Contenu à vérifier avant publication.",
          previousValue: expect.objectContaining({
            moderationVisibility: "visible",
            status: "pending",
            wasteKg: 1,
            cigaretteButts: 2,
            volunteersCount: 3,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          }),
          newValue: expect.objectContaining({
            moderationVisibility: "hidden",
            status: "pending",
            wasteKg: 1,
            cigaretteButts: 2,
            volunteersCount: 3,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          }),
        }),
      }),
    );
  });


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
            wasteBreakdown: { megotsKg: 0.2 },
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(harness.updateMock).toHaveBeenCalledTimes(2);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
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
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        targetId: "action-1",
        details: expect.objectContaining({
          operation: "restore_after_sanction",
          reason: "Restauration après vérification.",
          previousValue: expect.objectContaining({
            moderationVisibility: "hidden",
            status: "pending",
            wasteKg: 5,
            cigaretteButts: 6,
            volunteersCount: 7,
            durationMinutes: 45,
            wasteBreakdownPresent: false,
          }),
          newValue: expect.objectContaining({
            moderationVisibility: "visible",
            status: "pending",
            wasteKg: 5,
            cigaretteButts: 6,
            volunteersCount: 7,
            durationMinutes: 45,
            wasteBreakdownPresent: false,
          }),
        }),
      }),
    );
  });


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
    expect(emitActionValidatedMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        details: expect.objectContaining({
          operation: "restore_after_sanction",
          copiedToLocalValidatedStore: false,
        }),
      }),
    );
  });

}
