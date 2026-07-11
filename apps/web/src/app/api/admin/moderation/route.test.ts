import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseAdminClientMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());

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
  copyValidatedActionToLocalStore: vi.fn(),
  copyValidatedSpotToLocalStore: vi.fn(),
}));

vi.mock("@/lib/events/emit", () => ({
  emitActionValidated: vi.fn(),
  emitSpotValidated: vi.fn(),
}));

describe("POST /api/admin/moderation", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("updates action form fields and status in one admin operation", async () => {
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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
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
          confirmPhrase: "CONFIRMER MODERATION",
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
