import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const loadActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());
const syncUserActionProgressionMock = vi.hoisted(() => vi.fn());
const invalidatePublicSurfaceSnapshotsByRouteMock = vi.hoisted(() => vi.fn());
const copyValidatedActionToLocalStoreMock = vi.hoisted(() => vi.fn());
const emitActionValidatedMock = vi.hoisted(() => vi.fn());

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
  copyValidatedSpotToLocalStore: vi.fn(),
}));

vi.mock("@/lib/events/emit", () => ({
  emitActionRejected: vi.fn(),
  emitActionValidated: emitActionValidatedMock,
  emitSpotValidated: vi.fn(),
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
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("updates action form fields and status in one admin operation", async () => {
    let currentImpact: {
      created_by_clerk_id: string;
      waste_kg: number;
      cigarette_butts: number;
      volunteers_count: number;
      duration_minutes: number;
      notes: string | null;
    } = {
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
            wasteKg: 1,
            cigaretteButts: 0,
            volunteersCount: 1,
            durationMinutes: 30,
            wasteBreakdown: null,
          }),
          newValue: expect.objectContaining({
            wasteKg: 3.2,
            cigaretteButts: 120,
            volunteersCount: 4,
            durationMinutes: 75,
            wasteBreakdown: expect.objectContaining({
              megotsKg: 0.4,
              megotsCondition: "humide",
            }),
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
                moderation_visibility: "visible",
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
          moderationVisibility: "hidden",
          previousValue: expect.objectContaining({
            moderationVisibility: "visible",
          }),
          newValue: expect.objectContaining({
            moderationVisibility: "hidden",
            hiddenByClerkId: "admin-1",
          }),
        }),
      }),
    );
  });

  it("restores moderation visibility without bypassing the action status", async () => {
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
          moderationVisibility: "visible",
          previousValue: expect.objectContaining({
            moderationVisibility: "hidden",
          }),
          newValue: expect.objectContaining({
            moderationVisibility: "visible",
            hiddenByClerkId: null,
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
    const updateMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'syntax error at or near "spots"',
            },
          }),
        })),
      })),
    }));
    const fromMock = vi.fn((table: string) => {
      if (table !== "spots") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        update: updateMock,
      };
    });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

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
