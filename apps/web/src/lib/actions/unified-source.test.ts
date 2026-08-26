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

type TestParams = {
  limit: number;
  status: "pending" | "approved" | "rejected" | null;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: null;
};

function params(overrides: Partial<TestParams> = {}): TestParams {
  return {
    limit: 10,
    status: null,
    floorDate: null,
    requireCoordinates: false,
    types: null,
    ...overrides,
  };
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

function remoteAction(id: string, status: "pending" | "approved" | "rejected" = "approved") {
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
    status,
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

function createSupabase(canonicalRows: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "trash_spotter_spots") {
        return queryResult(canonicalRows);
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

  it("returns one canonical contract for one canonical signalement", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot()]) as never,
      params(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "canonical-1",
      type: "spot",
      source: "trash_spotter_spots",
    });
  });

  it("reads structured Trash Spotter categories from the transient notes marker", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([
        canonicalSpot({ notes: "Contexte\n[cmm-waste:plastic,broken_glass,invalid]" }),
      ]) as never,
      params(),
    );

    expect(result.items[0]?.metadata.wasteCategories).toEqual([
      "plastic",
      "broken_glass",
    ]);
    expect(result.items[0]?.metadata.notes).toBe("Contexte");
  });

  it("keeps a canonical clean place as a clean_place contract", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot({ spot_type: "clean_place" })]) as never,
      params(),
    );

    expect(result.items[0]?.type).toBe("clean_place");
    expect(result.items[0]?.source).toBe("trash_spotter_spots");
  });

  it("maps pending consistently for actions and canonical Trash Spotter new records", async () => {
    fetchActionsMock.mockResolvedValue([remoteAction("action-pending", "pending")]);
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot({ id: "spot-new", status: "new" })]) as never,
      params({ status: "pending" }),
    );

    expect(fetchActionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "pending" }),
    );
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "action-pending", type: "action", status: "pending" }),
        expect.objectContaining({
          id: "spot-new",
          type: "spot",
          status: "pending",
          sourceStatus: "new",
        }),
      ]),
    );
  });

  it("never exposes Trash Spotter categories for a canonical clean place", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([
        canonicalSpot({
          spot_type: "clean_place",
          notes: "Référence\n[cmm-waste:plastic]",
        }),
      ]) as never,
      params(),
    );

    expect(result.items[0]?.type).toBe("clean_place");
    expect(result.items[0]?.metadata.wasteCategories).toEqual([]);
    expect(result.items[0]?.metadata.notes).toBe("Référence");
  });

  it("prefers a remote action over a local contract restored from the same externalId", async () => {
    fetchActionsMock.mockResolvedValue([remoteAction("external-42")]);
    loadLocalActionContractsMock.mockResolvedValue([localAction("external-42")]);

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([]) as never,
      params(),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "external-42",
      type: "action",
      source: "actions",
    });
  });

  it("keeps distinct canonical signalements even when coordinates are equal or close", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([
        canonicalSpot({ id: "canonical-id", latitude: 48.85, longitude: 2.35 }),
        canonicalSpot({ id: "second-id", latitude: 48.850001, longitude: 2.350001 }),
      ]) as never,
      params(),
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "canonical-id",
      "second-id",
    ]);
  });

  it("does not include a legacy spots read in the unified source", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const supabase = createSupabase([]);
    const result = await fetchUnifiedActionContracts(supabase as never, params());

    expect(result.items).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalledWith("spots");
  });

  it("keeps sourceHealth limited to active sources", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot()]) as never,
      params(),
    );

    expect(result.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: ["actions", "spots", "local"],
      warnings: [],
    });
  });
});
