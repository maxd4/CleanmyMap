import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertLocalRecordsMock = vi.hoisted(() => vi.fn());
const readSignalementForModerationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/local-store", () => ({
  LOCAL_DB_FILES: { validated: "validated.json" },
  upsertLocalRecords: upsertLocalRecordsMock,
}));

vi.mock("@/lib/admin/moderation/signalement-moderation", () => ({
  readSignalementForModeration: readSignalementForModerationMock,
}));

describe("validated signalement local sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const canonicalRow = (spotType?: string | null) => ({
    id: "canonical-1",
    created_at: "2026-08-25T10:00:00Z",
    created_by_clerk_id: "user-1",
    label: "Zone propre",
    latitude: 48.85,
    longitude: 2.35,
    status: "validated",
    notes: "note",
    sourceTable: "trash_spotter_spots",
    ...(spotType === undefined ? {} : { spot_type: spotType }),
    waste_type: null,
    validated_at: "2026-08-25T11:00:00Z",
    cleaned_at: null,
  });

  async function copyCanonicalRow(row: ReturnType<typeof canonicalRow>) {
    readSignalementForModerationMock.mockResolvedValueOnce(row);

    const { copyValidatedSpotToLocalStore } = await import("./local-sync");
    const copied = await copyValidatedSpotToLocalStore(
      {} as never,
      "canonical-1",
      "admin-1",
    );

    expect(copied).toBe(true);
    expect(readSignalementForModerationMock).toHaveBeenCalledWith(
      expect.anything(),
      "canonical-1",
    );
    expect(upsertLocalRecordsMock).toHaveBeenCalledWith(
      "validated.json",
      [expect.any(Object)],
    );

    return upsertLocalRecordsMock.mock.calls[0]?.[1][0];
  }

  it("keeps clean_place and canonical provenance when copying a clean place", async () => {
    const record = await copyCanonicalRow(canonicalRow("clean_place"));

    expect(record).toMatchObject({
      id: "validated-spot-canonical-1",
      recordType: "clean_place",
      status: "validated",
      location: {
        latitude: 48.85,
        longitude: 2.35,
      },
      trace: {
        externalId: "canonical-1",
        originTable: "trash_spotter_spots",
        validatedAt: "2026-08-25T11:00:00Z",
      },
    });
  });

  it("normalizes a canonical spot to other while preserving its identity and provenance", async () => {
    const record = await copyCanonicalRow(canonicalRow("spot"));

    expect(record).toMatchObject({
      id: "validated-spot-canonical-1",
      recordType: "other",
      status: "validated",
      location: {
        latitude: 48.85,
        longitude: 2.35,
      },
      trace: {
        externalId: "canonical-1",
        originTable: "trash_spotter_spots",
        validatedAt: "2026-08-25T11:00:00Z",
      },
    });
  });

  it.each(["unknown", null, undefined])(
    "normalizes an absent or unknown spot_type (%s) to other",
    async (spotType) => {
      const record = await copyCanonicalRow(canonicalRow(spotType));

      expect(record).toMatchObject({
        recordType: "other",
        trace: { originTable: "trash_spotter_spots" },
      });
    },
  );
});
