import { expect, it, vi } from "vitest";

export type ModerationScenarioMocks = Record<string, ReturnType<typeof vi.fn>>;

export function registerSignalementTransitionScenarios({
  mocks,
}: {
  mocks: ModerationScenarioMocks;
}) {
  const {
    getSupabaseAdminClientMock,
    readSignalementForModerationMock,
    moderateSignalementMock,
    trackSpotValidationBonusMock,
    notifySignalementValidationMock,
  } = mocks;

  it("does not replay spot validation effects without a status transition", async () => {
    getSupabaseAdminClientMock.mockReturnValue({});
    readSignalementForModerationMock.mockResolvedValueOnce({
      id: "spot-1",
      created_at: "2026-08-20T10:00:00.000Z",
      created_by_clerk_id: "creator-1",
      label: "Zone déjà validée",
      latitude: 48.1,
      longitude: 2.3,
      status: "validated",
      notes: "Notes",
      sourceTable: "trash_spotter_spots",
      spot_type: "spot",
      validated_at: "2026-08-27T10:00:00.000Z",
      cleaned_at: null,
    });
    moderateSignalementMock.mockResolvedValueOnce({
      found: true,
      sourceTable: "trash_spotter_spots",
      signalement: {
        id: "spot-1",
        created_at: "2026-08-20T10:00:00.000Z",
        created_by_clerk_id: "creator-1",
        label: "Zone déjà validée",
        latitude: 48.1,
        longitude: 2.3,
        status: "validated",
        notes: "Notes",
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
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(trackSpotValidationBonusMock).not.toHaveBeenCalled();
    expect(notifySignalementValidationMock).not.toHaveBeenCalled();
  });
}
