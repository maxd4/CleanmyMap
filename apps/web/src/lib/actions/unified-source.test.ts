import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchActionsMock = vi.hoisted(() => vi.fn());
const loadLocalActionContractsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/store", () => ({
  fetchActions: fetchActionsMock,
}));
vi.mock("@/lib/data/map-records", () => ({
  loadLocalActionContracts: loadLocalActionContractsMock,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: vi.fn() }));

function queryResult(data: unknown[], error: null | Error = null) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    gte: vi.fn(() => query),
    not: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  };
  return query;
}

describe("unified action source", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fetchActionsMock.mockResolvedValue([]);
    loadLocalActionContractsMock.mockResolvedValue([]);
  });

  it("keeps canonical and legacy signalements visible with explicit sources", async () => {
    const canonical = {
      id: "canonical-1",
      created_at: "2026-08-24T10:00:00Z",
      created_by_clerk_id: "user-1",
      label: "Canonique",
      spot_type: "spot",
      latitude: 48.85,
      longitude: 2.35,
      status: "new",
      notes: null,
    };
    const legacy = {
      id: "legacy-1",
      created_at: "2026-08-23T10:00:00Z",
      created_by_clerk_id: "user-2",
      label: "Historique",
      waste_type: "clean_place",
      latitude: 48.86,
      longitude: 2.36,
      status: "validated",
      notes: "ancien signalement",
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "trash_spotter_spots") {
          return queryResult([canonical]);
        }
        if (table === "spots") {
          return queryResult([legacy]);
        }
        throw new Error(`Unexpected source: ${table}`);
      }),
    };

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(supabase as never, {
      limit: 10,
      status: null,
      floorDate: null,
      requireCoordinates: false,
      types: null,
    });

    expect(result.items.map((item) => [item.id, item.source])).toEqual([
      ["canonical-1", "trash_spotter_spots"],
      ["legacy-1", "spots_legacy"],
    ]);
    expect(result.sourceHealth).toMatchObject({
      partial: false,
      failedSources: [],
      availableSources: ["actions", "spots", "spots_legacy", "local"],
    });
  });
});
