import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());
const syncUserActionProgressionMock = vi.hoisted(() => vi.fn());
const invalidatePublicSurfaceSnapshotsByRouteMock = vi.hoisted(() => vi.fn());
const copyValidatedActionToLocalStoreMock = vi.hoisted(() => vi.fn());
const copyValidatedSpotToLocalStoreMock = vi.hoisted(() => vi.fn());
const moderateSignalementMock = vi.hoisted(() => vi.fn());
const emitActionValidatedMock = vi.hoisted(() => vi.fn());
const emitSpotValidatedMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock,
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/data/local-sync", () => ({
  copyValidatedActionToLocalStore: copyValidatedActionToLocalStoreMock,
  copyValidatedSpotToLocalStore: copyValidatedSpotToLocalStoreMock,
}));

vi.mock("@/lib/admin/signalement-moderation", () => ({
  moderateSignalement: moderateSignalementMock,
}));

vi.mock("@/lib/events/emit", () => ({
  emitActionRejected: vi.fn(),
  emitActionValidated: emitActionValidatedMock,
  emitSpotValidated: emitSpotValidatedMock,
}));

vi.mock("@/lib/actions/organizers", () => ({
  loadActionOrganizerIdsForAction: loadActionOrganizerIdsForActionMock,
}));

vi.mock("@/lib/gamification/progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
  syncUserActionProgression: syncUserActionProgressionMock,
}));

vi.mock("@/lib/public-surface-snapshots", () => ({
  invalidatePublicSurfaceSnapshotsByRoute: invalidatePublicSurfaceSnapshotsByRouteMock,
}));

function createActionSupabaseHarness() {
  let row: Record<string, unknown> = {
    id: "action-1",
    status: "pending",
    moderation_visibility: "visible",
    created_by_clerk_id: "creator-1",
    action_date: "2026-08-20",
    location_label: "Lieu interne",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 2,
    volunteers_count: 3,
    duration_minutes: 30,
    actor_name: "Auteur interne",
    notes: null,
  };

  const selectMock = vi.fn((columns: string) => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data:
          columns === "id"
            ? { id: row.id }
            : columns.includes("moderation_visibility") &&
                !columns.startsWith("status, moderation_visibility")
              ? {
                  moderation_visibility: row.moderation_visibility,
                  hidden_at: row.hidden_at ?? null,
                  hidden_by_clerk_id: row.hidden_by_clerk_id ?? null,
                  hidden_reason: row.hidden_reason ?? null,
                }
              : row,
        error: null,
      }),
    })),
  }));

  const updateMock = vi.fn((updates: Record<string, unknown>) => {
    row = { ...row, ...updates };
    return {
      eq: vi.fn(() => ({
        select: vi.fn((columns: string) => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: columns.includes("moderation_visibility")
              ? {
                  moderation_visibility: row.moderation_visibility,
                  hidden_at: row.hidden_at ?? null,
                  hidden_by_clerk_id: row.hidden_by_clerk_id ?? null,
                  hidden_reason: row.hidden_reason ?? null,
                }
              : { id: row.id },
            error: null,
          }),
        })),
      })),
    };
  });

  return {
    from: vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return { select: selectMock, update: updateMock };
    }),
    updateMock,
  };
}

describe("POST /api/admin/moderation", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    loadActionOrganizerIdsForActionMock.mockResolvedValue(["creator-1", "organizer-1"]);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
    syncUserActionProgressionMock.mockResolvedValue(1);
    invalidatePublicSurfaceSnapshotsByRouteMock.mockResolvedValue(undefined);
    copyValidatedActionToLocalStoreMock.mockResolvedValue({
      source: "actions",
      copied: true,
    });
    copyValidatedSpotToLocalStoreMock.mockResolvedValue(true);
    moderateSignalementMock.mockResolvedValue({
      found: true,
      sourceTable: "trash_spotter_spots",
      signalement: {
        id: "spot-1",
        created_by_clerk_id: "creator-1",
      },
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("updates action form fields and status in one admin operation", async () => {
    let currentImpact: {
      status: "pending" | "approved" | "rejected";
      moderation_visibility: "visible" | "hidden";
      created_by_clerk_id: string;
      waste_kg: number;
      cigarette_butts: number;
      volunteers_count: number;
      duration_minutes: number;
      notes: string | null;
    } = {
      status: "pending",
      moderation_visibility: "visible",
      created_by_clerk_id: "creator-1",
      waste_kg: 1,
      cigarette_butts: 0,
      volunteers_count: 1,
      duration_minutes: 30,
      notes: null,
    };
    const updateMock = vi.fn((updates: Record<string, unknown>) => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "action-1" },
            error: null,
          }),
        })),
      })),
      updates,
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: vi.fn((columns: string) => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: columns.includes("created_by_clerk_id")
                ? currentImpact
                : {
                    action_date: "2026-04-20",
                    location_label: "Ancien lieu",
                    latitude: null,
                    longitude: null,
                    waste_kg: 1,
                    cigarette_butts: 0,
                    volunteers_count: 1,
                    duration_minutes: 30,
                    actor_name: "Ancien auteur",
                    notes: "Ancienne note",
                  },
              error: null,
            }),
          })),
        })),
        update: vi.fn((updates: Record<string, unknown>) => {
          currentImpact = {
            status: updates["status"] as "pending" | "approved" | "rejected",
            moderation_visibility: "visible",
            created_by_clerk_id: "creator-1",
            waste_kg: updates["waste_kg"] as number,
            cigarette_butts: updates["cigarette_butts"] as number,
            volunteers_count: updates["volunteers_count"] as number,
            duration_minutes: updates["duration_minutes"] as number,
            notes: updates["notes"] as string,
          };
          return updateMock(updates);
        }),
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
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Correction des données terrain validée.",
          edits: {
            actorName: "Marie Admin",
            associationName: "Action spontanée",
            actionDate: "2026-04-22",
            locationLabel: "Canal Saint-Martin",
            wasteKg: 3.2,
            cigaretteButts: 120,
            volunteersCount: 4,
            durationMinutes: 75,
            notes: "Corrigé par admin",
            wasteBreakdown: {
              megotsKg: 0.4,
              megotsCondition: "humide",
              triQuality: "moyenne",
            },
          },
        }),
      }),
    );

    const body = (await response.json()) as { status?: string };
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        actor_name: "Marie Admin",
        action_date: "2026-04-22",
        location_label: "Canal Saint-Martin",
        waste_kg: 3.2,
        cigarette_butts: 120,
        volunteers_count: 4,
        duration_minutes: 75,
      }),
    );
    expect(updateMock.mock.calls[0]?.[0]["notes"]).toContain("Corrigé par admin");
    expect(updateMock.mock.calls[0]?.[0]["notes"]).toContain("[cmm-meta]");
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "success",
        targetId: "action-1",
        details: expect.objectContaining({
          operation: "correct_impact",
          reason: "Correction des données terrain validée.",
          previousValue: expect.objectContaining({
            status: "pending",
            moderationVisibility: "visible",
            wasteKg: 1,
            cigaretteButts: 0,
            volunteersCount: 1,
            durationMinutes: 30,
            wasteBreakdownPresent: false,
          }),
          newValue: expect.objectContaining({
            status: "pending",
            moderationVisibility: "visible",
            wasteKg: 3.2,
            cigaretteButts: 120,
            volunteersCount: 4,
            durationMinutes: 75,
            wasteBreakdownPresent: true,
          }),
          refreshedProgressionUserIds: ["creator-1", "organizer-1"],
          publicSurfaceSnapshotsInvalidated: true,
        }),
      }),
    );
    expect(loadActionOrganizerIdsForActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "action-1",
      "creator-1",
    );
    expect(syncUserActionProgressionMock).toHaveBeenCalledTimes(2);
    expect(refreshProgressionProfileMock).toHaveBeenCalledTimes(2);
    expect(invalidatePublicSurfaceSnapshotsByRouteMock).toHaveBeenCalledWith([
      "api/actions",
      "api/actions/map",
    ]);
  });

  it("moderates a canonical signalement and returns its source", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "clean_place",
          id: "spot-1",
          sourceTable: "trash_spotter_spots",
          status: "validated",
          confirmPhrase: "CONFIRMER MODERATION",
          edits: { wasteType: "legacy-value", label: "Zone validée" },
        }),
      }),
    );

    const body = (await response.json()) as {
      status?: string;
      sourceTable?: string;
      copiedToLocalValidatedStore?: boolean;
    };
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      sourceTable: "trash_spotter_spots",
      copiedToLocalValidatedStore: true,
    });
    expect(moderateSignalementMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "spot-1",
        status: "validated",
      }),
    );
    expect(copyValidatedSpotToLocalStoreMock).toHaveBeenCalledWith(
      expect.anything(),
      "spot-1",
      "admin-1",
    );
    expect(emitSpotValidatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "creator-1" }),
    );
  });

  it("rejects sensitive action moderation without a valid reason", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "rejected",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "non",
        }),
      }),
    );

    const body = (await response.json()) as { code?: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe("reason_required");
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetId: "action-1",
        details: expect.objectContaining({
          code: "reason_required",
          operation: "reject_action",
        }),
      }),
    );
    expect(getSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

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

  it("returns a sanitized error when the underlying database update fails", async () => {
    moderateSignalementMock.mockRejectedValueOnce(
      new Error('syntax error at or near "trash_spotter_spots"'),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "clean_place",
          id: "spot-1",
          status: "validated",
          confirmPhrase: "CONFIRMER MODERATION",
        }),
      }),
    );

    const body = (await response.json()) as {
      message?: string;
      error?: string;
      code?: string;
    };

    expect(response.status).toBe(500);
    expect(body.code).toBe("server_error");
    expect(body.message).toBe("La modération a échoué.");
    expect(body.error).toBe("La modération a échoué.");
  });
});
