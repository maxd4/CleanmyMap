import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTagMock = vi.hoisted(() => vi.fn());
const emitSpotCreatedMock = vi.hoisted(() => vi.fn());
const invalidateSnapshotsMock = vi.hoisted(() => vi.fn());
const trackServerEventMock = vi.hoisted(() => vi.fn());
const trackSpotCreatedMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidateTag: revalidateTagMock }));
vi.mock("@/lib/events/emit", () => ({
  emitSpotCreated: emitSpotCreatedMock,
}));
vi.mock("@/lib/public-surface-snapshots", () => ({
  invalidatePublicSurfaceSnapshotsByRoute: invalidateSnapshotsMock,
}));
vi.mock("@/lib/analytics.server", () => ({
  trackServerEvent: trackServerEventMock,
}));
vi.mock("@/lib/gamification/progression", () => ({
  trackSpotCreated: trackSpotCreatedMock,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: vi.fn() }));

describe("createSignalement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    invalidateSnapshotsMock.mockResolvedValue(undefined);
    trackSpotCreatedMock.mockResolvedValue(undefined);
    trackServerEventMock.mockResolvedValue(undefined);
    emitSpotCreatedMock.mockResolvedValue({ delivered: 1, failed: 0 });
  });

  it("writes only the canonical source and invalidates the unified feeds", async () => {
    const created = {
      id: "spot-1",
      created_at: "2026-08-24T10:00:00Z",
      created_by_clerk_id: "user-1",
      user_id: "user-1",
      label: "Quai de Seine",
      spot_type: "spot",
      latitude: 48.85,
      longitude: 2.35,
      status: "new",
      notes: "[spot-by:Test User] mégots",
    };
    const singleMock = vi.fn().mockResolvedValue({ data: created, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const tables: string[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        tables.push(table);
        if (table !== "trash_spotter_spots") {
          throw new Error(`Unexpected write table: ${table}`);
        }
        return { insert: insertMock };
      }),
    };

    const { createSignalement } = await import("./create-signalement");
    const result = await createSignalement(supabase as never, {
      userId: "user-1",
      type: "spot",
      label: " Quai de Seine ",
      latitude: 48.85,
      longitude: 2.35,
      notes: "mégots",
      actorName: "Test User",
      consentGranted: true,
    });

    expect(result).toEqual(created);
    expect(tables).toEqual(["trash_spotter_spots"]);
    expect(insertMock).toHaveBeenCalledWith({
      created_by_clerk_id: "user-1",
      user_id: "user-1",
      label: "Quai de Seine",
      spot_type: "spot",
      latitude: 48.85,
      longitude: 2.35,
      status: "new",
      notes: "[spot-by:Test User] mégots",
    });
    expect(invalidateSnapshotsMock).toHaveBeenCalledWith([
      "api/actions",
      "api/actions/map",
    ]);
    expect(revalidateTagMock).toHaveBeenCalledWith("spots-map", "max");
    expect(trackSpotCreatedMock).toHaveBeenCalledWith(expect.anything(), {
      userId: "user-1",
      spotId: "spot-1",
    });
    expect(trackServerEventMock).toHaveBeenCalled();
  });
});
