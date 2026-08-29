import { expect, it, vi } from "vitest";
import { createActionSupabaseHarness } from "./route.test.helpers";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerActionLifecycleScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    appendAdminOperationAuditMock,
    invalidatePublicSurfaceSnapshotsByRouteMock,
  } = mocks;

  it("audits an action not found after canonical identification", async () => {
    const harness = createActionSupabaseHarness();
    harness.updateMock.mockImplementationOnce(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    }));
    const actionFrom = harness.from;
    harness.from = vi.fn((table: string) => {
      if (table === "submissions") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        };
      }
      return actionFrom(table);
    }) as typeof harness.from;
    getSupabaseAdminClientMock.mockReturnValue(harness);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "missing-action",
          status: "rejected",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Action introuvable à contrôler",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetId: "missing-action",
        details: expect.objectContaining({
          entityType: "action",
          operation: "reject_action",
          reason: "Action introuvable à contrôler",
          stage: "lookup",
        }),
      }),
    );
  });


  it("audits an action update failure with bounded context", async () => {
    const harness = createActionSupabaseHarness();
    harness.updateMock.mockImplementationOnce(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "raw action update detail must not be audited" },
          }),
        })),
      })),
    }));
    getSupabaseAdminClientMock.mockReturnValue(harness);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "rejected",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Mise à jour action refusée",
          edits: {},
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0] as {
      details: Record<string, unknown>;
    };
    expect(audit.details).toEqual(
      expect.objectContaining({
        entityType: "action",
        operation: "reject_action",
        reason: "Mise à jour action refusée",
        stage: "update",
      }),
    );
    expect(JSON.stringify(audit.details)).not.toContain(
      "raw action update detail must not be audited",
    );
  });


  it("audits action post-update failures once", async () => {
    getSupabaseAdminClientMock.mockReturnValue(createActionSupabaseHarness());
    invalidatePublicSurfaceSnapshotsByRouteMock.mockRejectedValueOnce(
      new Error("raw action post-update detail must not be audited"),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "action",
          id: "action-1",
          status: "pending",
          confirmPhrase: "CONFIRMER MODERATION",
          reason: "Correction d’impact contrôlée",
          edits: { wasteKg: 2 },
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetId: "action-1",
        details: expect.objectContaining({
          entityType: "action",
          operation: "correct_impact",
          reason: "Correction d’impact contrôlée",
          stage: "post_update",
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "raw action post-update detail must not be audited",
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

}
