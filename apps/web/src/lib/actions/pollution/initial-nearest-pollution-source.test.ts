import { describe, expect, it, vi } from "vitest";
import { loadInitialPollutionItems } from "./initial-nearest-pollution-source";

describe("initial nearest pollution source", () => {
  it("loads validated map signalements once from the canonical table", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      not: vi.fn(() => query),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async () => ({
        data: [
          {
            id: "canonical-spot-1",
            created_at: "2026-08-25T00:00:00.000Z",
            label: "Signalement canonique",
            spot_type: "spot",
            latitude: 48.8566,
            longitude: 2.3522,
            status: "validated",
            notes: null,
          },
        ],
        error: null,
      })),
    };
    const from = vi.fn(() => query);
    const supabase = { from } as never;

    const items = await loadInitialPollutionItems(supabase, {
      south: 48.8,
      west: 2.2,
      north: 48.9,
      east: 2.4,
      zoom: 12,
    });

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("trash_spotter_spots");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "canonical-spot-1",
      source: "trash_spotter_spots",
      record_type: "other",
    });
  });
});
