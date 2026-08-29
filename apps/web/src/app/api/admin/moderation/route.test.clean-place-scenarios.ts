import { expect, it, vi } from "vitest";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerCleanPlaceScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    appendAdminOperationAuditMock,
    invalidatePublicSurfaceSnapshotsByRouteMock,
    copyValidatedSpotToLocalStoreMock,
    moderateSignalementMock,
    readSignalementForModerationMock,
    emitSpotValidatedMock,
  } = mocks;

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


  it("audits clean_place before and after from the canonical signalement", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});
    moderateSignalementMock.mockResolvedValueOnce({
      found: true,
      sourceTable: "trash_spotter_spots",
      signalement: {
        id: "spot-1",
        created_at: "2026-08-20T10:00:00.000Z",
        created_by_clerk_id: "creator-1",
        label: "Nouveau libellé",
        latitude: 48.2,
        longitude: 2.3,
        status: "validated",
        notes: "Notes mises à jour",
        sourceTable: "trash_spotter_spots",
        spot_type: "spot",
        validated_at: "2026-08-27T10:00:00.000Z",
        cleaned_at: null,
      },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "clean_place",
          id: "spot-1",
          status: "validated",
          confirmPhrase: "CONFIRMER MODERATION",
          edits: {
            label: "Nouveau libellé",
            latitude: 48.2,
            notes: "Notes mises à jour",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "moderation",
        outcome: "success",
        targetId: "spot-1",
        details: expect.objectContaining({
          entityType: "clean_place",
          targetUserId: "creator-1",
          previousValue: {
            status: "new",
            spotType: "spot",
            labelChanged: true,
            coordinatesChanged: true,
            notesChanged: true,
          },
          newValue: {
            status: "validated",
            spotType: "spot",
            labelChanged: true,
            coordinatesChanged: true,
            notesChanged: true,
          },
        }),
      }),
    );

    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0] as {
      details: Record<string, unknown>;
    };
    const serializedDetails = JSON.stringify(audit.details);
    expect(serializedDetails).not.toContain("Nouveau libellé");
    expect(serializedDetails).not.toContain("Notes mises à jour");
    expect(serializedDetails).not.toContain("48.2");
    expect(audit.details).not.toHaveProperty("label");
    expect(audit.details).not.toHaveProperty("latitude");
    expect(audit.details).not.toHaveProperty("longitude");
    expect(audit.details).not.toHaveProperty("notes");
  });


  it("audits a clean_place not found during canonical lookup once", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});
    readSignalementForModerationMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/moderation", {
        method: "POST",
        body: JSON.stringify({
          entityType: "clean_place",
          id: "missing-spot",
          status: "validated",
          confirmPhrase: "CONFIRMER MODERATION",
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(moderateSignalementMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetId: "missing-spot",
        details: expect.objectContaining({
          entityType: "clean_place",
          stage: "lookup",
          code: "not_found",
        }),
      }),
    );
  });


  it("audits clean_place update failures with bounded context", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});
    moderateSignalementMock.mockRejectedValueOnce(
      new Error("database update detail must not be audited"),
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
          reason: "Vérification administrative",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0] as {
      targetId?: string;
      details: Record<string, unknown>;
    };
    expect(audit.targetId).toBe("spot-1");
    expect(audit.details).toEqual(
      expect.objectContaining({
        entityType: "clean_place",
        reason: "Vérification administrative",
        stage: "update",
      }),
    );
    expect(JSON.stringify(audit.details)).not.toContain(
      "database update detail must not be audited",
    );
  });


  it("audits clean_place post-update failures without a second audit", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});
    invalidatePublicSurfaceSnapshotsByRouteMock.mockRejectedValueOnce(
      new Error("snapshot failure must not be audited"),
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
          reason: "Post-traitement contrôlé",
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        targetId: "spot-1",
        details: expect.objectContaining({
          entityType: "clean_place",
          reason: "Post-traitement contrôlé",
          stage: "post_update",
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "snapshot failure must not be audited",
    );
  });

}
