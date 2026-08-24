import { describe, expect, it, vi } from "vitest";

const upsertLocalRecordsMock = vi.hoisted(() => vi.fn());
const readSignalementForModerationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/local-store", () => ({
  LOCAL_DB_FILES: { validated: "validated.json" },
  upsertLocalRecords: upsertLocalRecordsMock,
}));

vi.mock("@/lib/admin/signalement-moderation", () => ({
  readSignalementForModeration: readSignalementForModerationMock,
}));

describe("validated signalement local sync", () => {
  it("copies canonical trash_spotter_spots with canonical provenance", async () => {
    readSignalementForModerationMock.mockResolvedValue({
      id: "canonical-1",
      created_at: "2026-08-25T10:00:00Z",
      created_by_clerk_id: "user-1",
      label: "Zone propre",
      latitude: 48.85,
      longitude: 2.35,
      status: "validated",
      notes: "note",
      sourceTable: "trash_spotter_spots",
      spot_type: "clean_place",
      waste_type: null,
      validated_at: "2026-08-25T11:00:00Z",
      cleaned_at: null,
    });

    const { copyValidatedSpotToLocalStore } = await import("./local-sync");
    const copied = await copyValidatedSpotToLocalStore(
      {} as never,
      "canonical-1",
      "admin-1",
      "trash_spotter_spots",
    );

    expect(copied).toBe(true);
    expect(readSignalementForModerationMock).toHaveBeenCalledWith(
      expect.anything(),
      "canonical-1",
      "trash_spotter_spots",
    );
    expect(upsertLocalRecordsMock).toHaveBeenCalledWith(
      "validated.json",
      [
        expect.objectContaining({
          trace: expect.objectContaining({
            originTable: "trash_spotter_spots",
            validatedAt: "2026-08-25T11:00:00Z",
          }),
        }),
      ],
    );
  });
});
