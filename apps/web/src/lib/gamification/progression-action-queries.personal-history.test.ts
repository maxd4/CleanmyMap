import { describe, expect, it, vi } from "vitest";
import { loadActionRowsByIdsForPersonalHistory } from "./progression-action-queries";

describe("personal history action projection", () => {
  it("loads a bounded ID projection instead of the organization action loader", async () => {
    const rows = [{
      id: "action-1",
      created_at: "2026-01-01T10:00:00Z",
      actor_name: "Participant",
      action_date: "2026-01-01",
      location_label: "Parc A",
      latitude: null,
      longitude: null,
      waste_kg: 1,
      cigarette_butts: 2,
      volunteers_count: 1,
      duration_minutes: 20,
      status: "approved",
      notes: "Action terrain",
      derived_geometry_kind: null,
      derived_geometry_geojson: null,
      geometry_confidence: null,
      geometry_source: null,
    }];
    const chain = {
      select: vi.fn(() => chain),
      in: vi.fn(() => chain),
      limit: vi.fn(async () => ({ data: rows, error: null })),
    };
    const supabase = { from: vi.fn(() => chain) };

    await expect(loadActionRowsByIdsForPersonalHistory(
      supabase as never,
      ["action-1", "action-1", "action-2"],
    )).resolves.toEqual(rows);

    expect(chain.select).toHaveBeenCalledWith(
      "id, created_at, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source",
    );
    expect(chain.in).toHaveBeenCalledWith("id", ["action-1", "action-2"]);
    expect(chain.limit).toHaveBeenCalledWith(2);
  });

  it("caps the recovered action IDs at the evidence boundary", async () => {
    const chain = {
      select: vi.fn(() => chain),
      in: vi.fn(() => chain),
      limit: vi.fn(async () => ({ data: [], error: null })),
    };
    const supabase = { from: vi.fn(() => chain) };
    const actionIds = Array.from({ length: 10005 }, (_, index) => `action-${index}`);

    await loadActionRowsByIdsForPersonalHistory(supabase as never, actionIds);

    expect((chain.in.mock.calls[0] as unknown[])[1]).toHaveLength(10000);
    expect(chain.limit).toHaveBeenCalledWith(10000);
  });
});
