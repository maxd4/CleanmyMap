import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/contracts/contract-model";
import type { ActionEntityType } from "@/lib/actions/contracts/contract-model";

const fetchActionsMock = vi.hoisted(() => vi.fn());
const loadLocalActionContractsMock = vi.hoisted(() => vi.fn());
const allowLocalActionStoreMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/actions/store", () => ({
  fetchActions: fetchActionsMock,
}));
vi.mock("@/lib/data/map-records", () => ({
  loadLocalActionContracts: loadLocalActionContractsMock,
}));
vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalActionStoreInCurrentRuntime: allowLocalActionStoreMock,
}));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: vi.fn() }));

function queryResult(data: unknown[], error: null | Error = null) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    lt: vi.fn(() => query),
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
  ceilingDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
};

function params(overrides: Partial<TestParams> = {}): TestParams {
  return {
    limit: 10,
    status: null,
    floorDate: null,
    ceilingDate: null,
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
    allowLocalActionStoreMock.mockReturnValue(true);
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
    expect(loadLocalActionContractsMock).not.toHaveBeenCalled();
  });

  it("uses only remote actions when the remote source succeeds", async () => {
    fetchActionsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => remoteAction(`remote-${index}`)),
    );
    loadLocalActionContractsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => localAction(`local-${index}`)),
    );

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([]) as never,
      params({ types: ["action"] }),
    );

    expect(result.items).toHaveLength(5);
    expect(result.items.map((item) => item.id)).toEqual([
      "remote-0",
      "remote-1",
      "remote-2",
      "remote-3",
      "remote-4",
    ]);
    expect(loadLocalActionContractsMock).not.toHaveBeenCalled();
  });

  it("keeps an empty successful remote action result empty", async () => {
    fetchActionsMock.mockResolvedValue([]);
    loadLocalActionContractsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => localAction(`local-${index}`)),
    );

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([]) as never,
      params({ types: ["action"] }),
    );

    expect(result.items).toEqual([]);
    expect(loadLocalActionContractsMock).not.toHaveBeenCalled();
  });

  it("falls back to local actions when the remote source fails", async () => {
    fetchActionsMock.mockRejectedValue(new Error("remote unavailable"));
    loadLocalActionContractsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => localAction(`local-${index}`)),
    );

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([]) as never,
      params({ types: ["action"] }),
    );

    expect(result.items).toHaveLength(5);
    expect(result.items.every((item) => item.source === "google_sheet")).toBe(true);
    expect(result.sourceHealth.failedSources).toEqual(["actions"]);
    expect(result.sourceHealth.availableSources).toEqual(["local"]);
    expect(result.sourceHealth.partial).toBe(true);
    expect(loadLocalActionContractsMock).toHaveBeenCalledTimes(1);
  });

  it("does not load local actions when the fallback is forbidden", async () => {
    allowLocalActionStoreMock.mockReturnValue(false);
    fetchActionsMock.mockRejectedValue(new Error("remote unavailable"));
    loadLocalActionContractsMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => localAction(`local-${index}`)),
    );

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([]) as never,
      params({ types: ["action"] }),
    );

    expect(result.items).toEqual([]);
    expect(result.sourceHealth).toMatchObject({
      partial: true,
      failedSources: ["actions"],
      availableSources: [],
    });
    expect(loadLocalActionContractsMock).not.toHaveBeenCalled();
  });

  it("keeps canonical spots when actions are unavailable", async () => {
    fetchActionsMock.mockRejectedValue(new Error("remote unavailable"));

    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const result = await fetchUnifiedActionContracts(
      createSupabase([canonicalSpot({ id: "spot-kept" })]) as never,
      params(),
    );

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "spot-kept",
          source: "trash_spotter_spots",
          type: "spot",
        }),
      ]),
    );
    expect(result.sourceHealth.failedSources).toEqual(["actions"]);
    expect(result.sourceHealth.availableSources).toEqual(["spots", "local"]);
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
      availableSources: ["actions", "spots"],
      warnings: [],
    });
  });

  it("does not query Trash Spotter when only actions are requested", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const supabase = createSupabase([]);

    const result = await fetchUnifiedActionContracts(
      supabase as never,
      params({ types: ["action"] }),
    );

    expect(supabase.from).not.toHaveBeenCalledWith("trash_spotter_spots");
    expect(result.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: ["actions"],
      warnings: [],
    });
  });

  it("does not query action sources when only spots are requested", async () => {
    const { fetchUnifiedActionContracts } = await import("./unified-source");
    const supabase = createSupabase([canonicalSpot()]);

    const result = await fetchUnifiedActionContracts(
      supabase as never,
      params({ types: ["spot"] }),
    );

    expect(fetchActionsMock).not.toHaveBeenCalled();
    expect(loadLocalActionContractsMock).not.toHaveBeenCalled();
    expect(result.sourceHealth.availableSources).toEqual(["spots"]);
  });

  it("propagates exclusive monthly upper bounds to action and spot sources", async () => {
    const spotQuery = queryResult([]);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "trash_spotter_spots") {
          return spotQuery;
        }
        throw new Error(`Unexpected source: ${table}`);
      }),
    };
    fetchActionsMock.mockResolvedValue([]);
    const { fetchUnifiedActionContracts } = await import("./unified-source");

    await fetchUnifiedActionContracts(
      supabase as never,
      params({
        floorDate: "2026-05-01",
        ceilingDate: "2026-06-01",
      }),
    );

    expect(fetchActionsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        floorDate: "2026-05-01",
        ceilingDate: "2026-06-01",
      }),
    );
    expect(spotQuery.gte).toHaveBeenCalledWith(
      "created_at",
      "2026-05-01T00:00:00.000Z",
    );
    expect(spotQuery.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-06-01T00:00:00.000Z",
    );
  });

  it("keeps paginating canonical spots when the server cap shortens each page", async () => {
    const allRows = Array.from({ length: 2001 }, (_, index) =>
      canonicalSpot({ id: `spot-${index}` }),
    );
    const pages = [
      allRows.slice(0, 500),
      allRows.slice(500, 1000),
      allRows.slice(1000, 1500),
      allRows.slice(1500, 2000),
      allRows.slice(2000),
    ];
    const rangeCalls: unknown[][] = [];
    let pageIndex = 0;
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      range: vi.fn((...args: unknown[]) => {
        rangeCalls.push(args);
        return query;
      }),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      lt: vi.fn(() => query),
      not: vi.fn(() => query),
      in: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(resolve({ data: pages[pageIndex++] ?? [], error: null })),
    };
    const supabase = { from: vi.fn(() => query) };
    const { fetchUnifiedActionContracts } = await import("./unified-source");

    const result = await fetchUnifiedActionContracts(
      supabase as never,
      params({ limit: 2000, types: ["spot"] }),
    );

    expect(result.items).toHaveLength(2000);
    expect(result.isTruncated).toBe(true);
    expect(rangeCalls).toEqual([
      [0, 999],
      [500, 1499],
      [1000, 1999],
      [1500, 2000],
      [2000, 2000],
    ]);
  });
});
