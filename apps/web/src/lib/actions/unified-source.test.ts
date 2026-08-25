import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";

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
    lte: vi.fn(() => query),
    not: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  };
  return query;
}

function params() {
  return {
    limit: 10,
    status: null,
    floorDate: null,
    requireCoordinates: false,
    types: null,
  } as const;
}

function canonicalSpot(overrides: Record<string, unknown> = {}) {
  return {
    id: "canonical-1",
    created_at: "2026-08-24T10:00:00Z",
    created_by_clerk_id: "user-1",
    label: "Canonique",
    spot_type: "spot",
    latitude: 48.85,
    longitude: 2.35,
    status: "new",
    notes: null,
    ...overrides,
  };
}

function legacySpot(overrides: Record<string, unknown> = {}) {
  return {
    id: "legacy-1",
    created_at: "2026-08-23T10:00:00Z",
    created_by_clerk_id: "user-2",
    label: "Historique",
    waste_type: "clean_place",
    latitude: 48.85,
    longitude: 2.35,
    status: "validated",
    notes: "ancien signalement",
    ...overrides,
  };
}

function remoteAction(id: string) {
  return {
    id,
    created_at: "2026-08-24T10:00:00Z",
    updated_at: "2026-08-24T11:00:00Z",
    created_by_clerk_id: "user-1",
    actor_name: "Remote",
    action_date: "2026-08-24",
    location_label: "Action distante",
    latitude: 48.85,
    longitude: 2.35,
    waste_kg: 1,
    cigarette_butts: 0,
    volunteers_count: 1,
    duration_minutes: 10,
    status: "approved",
    notes: null,
    action_phase: "post_action_complete",
    preparation_data: {},
  };
}

function localAction(id: string) {
  return buildActionDataContract({
    id,
    type: "action",
    status: "approved",
    source: "google_sheet",
    observedAt: "2026-08-23",
    createdAt: "2026-08-23T10:00:00Z",
    locationLabel: "Action locale",
    latitude: 48.850001,
    longitude: 2.350001,
    notes: "import local",
  });
}

function createSupabase(canonicalRows: unknown[], legacyRows: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "trash_spotter_spots") {
        return queryResult(canonicalRows);
      }
      if (table === "spots") {
        return queryResult(legacyRows);
      }
      throw new Error(`Unexpected source: ${table}`);
    }),
  };
}

describe("unified action source", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fetchActionsMock.mockResolvedValue([]);
    loadLocalActionContractsMock.mockResolvedValue([]);
  });

  it("deduplicates a canonical and legacy row with the same UUID and keeps canonical provenance", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase(
        [canonicalSpot({ id: "same-uuid" })],
        [legacySpot({ id: "same-uuid" })],
      ) as never,
      params(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "same-uuid",
      type: "spot",
      source: "trash_spotter_spots",
    });
  });

  it("prefers a remote action over a local contract restored from the same externalId", async () => {
    fetchActionsMock.mockResolvedValue([remoteAction("external-42")]);
    loadLocalActionContractsMock.mockResolvedValue([localAction("external-42")]);

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([], []) as never,
      params(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "external-42",
      type: "action",
      source: "actions",
    });
  });

  it("keeps distinct IDs even when their coordinates are equal or close", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase(
        [canonicalSpot({ id: "canonical-id", latitude: 48.85, longitude: 2.35 })],
        [legacySpot({ id: "legacy-id", latitude: 48.850001, longitude: 2.350001 })],
      ) as never,
      params(),
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "canonical-id",
      "legacy-id",
    ]);
  });

  it("applies remote canonical, local fallback, then legacy priority for one ID/type", async () => {
    loadLocalActionContractsMock.mockResolvedValue([
      buildActionDataContract({
        id: "priority-id",
        type: "spot",
        status: "approved",
        source: "google_sheet",
        observedAt: "2026-08-23",
        locationLabel: "Local fallback",
        latitude: 48.85,
        longitude: 2.35,
      }),
    ]);

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase(
        [canonicalSpot({ id: "priority-id" })],
        [legacySpot({ id: "priority-id" })],
      ) as never,
      params(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.source).toBe("trash_spotter_spots");
  });

  it("does not interpret legacy waste_type as clean_place", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([], [legacySpot({ waste_type: "clean_place" })]) as never,
      params(),
    );

    expect(result.items[0]?.type).toBe("spot");
    expect(result.items[0]?.source).toBe("spots_legacy");
  });

  it("keeps sourceHealth unchanged", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot()], [legacySpot()]) as never,
      params(),
    );

    expect(result.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: ["actions", "spots", "spots_legacy", "local"],
      warnings: [],
    });
  });
});
