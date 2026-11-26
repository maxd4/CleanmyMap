import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";

const cacheStore = vi.hoisted(() => new Map<string, unknown>());
const fetchUnifiedMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => Promise<unknown>>(
    fn: T,
    keyParts: string[],
  ) => {
    const cacheKey = keyParts.join("::");
    return async (...args: Parameters<T>) => {
      if (cacheStore.has(cacheKey)) {
        return cacheStore.get(cacheKey);
      }
      const value = await fn(...args);
      cacheStore.set(cacheKey, value);
      return value;
    };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({})),
}));

vi.mock("../actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedMock,
}));

import { fetchCachedUnifiedActionContracts } from "../actions/unified-source/unified-source-cache";
import { loadPilotageOverview } from "./overview";

describe("strict public completed corpus cache recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
  });

  it("does not cache complete actions failure for strict public corpus and recovers on retry", async () => {
    const validContract = buildActionDataContract({
      id: "recovered-1",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-04-09",
      createdAt: "2026-04-08T10:00:00.000Z",
      locationLabel: "Paris 10e",
      latitude: 48.87,
      longitude: 2.35,
      wasteKg: 12,
      volunteersCount: 4,
    });

    fetchUnifiedMock
      .mockResolvedValueOnce({
        items: [],
        isTruncated: false,
        sourceHealth: {
          partial: true,
          failedSources: ["actions"],
          availableSources: [],
          warnings: ["actions_failed"],
        },
      })
      .mockResolvedValueOnce({
        items: [validContract],
        isTruncated: false,
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      });

    const first = await fetchCachedUnifiedActionContracts({
      limit: 1500,
      status: "approved",
      floorDate: "2026-01-01",
      requireCoordinates: false,
      types: ["action"],
      requirePublicCompletedActions: true,
    });
    expect(first.sourceHealth.failedSources).toEqual(["actions"]);
    expect(first.items).toHaveLength(0);

    const second = await fetchCachedUnifiedActionContracts({
      limit: 1500,
      status: "approved",
      floorDate: "2026-01-01",
      requireCoordinates: false,
      types: ["action"],
      requirePublicCompletedActions: true,
    });
    expect(second.sourceHealth.failedSources).toEqual([]);
    expect(second.items).toHaveLength(1);
    expect(fetchUnifiedMock).toHaveBeenCalledTimes(2);

    // Valid result is cached on subsequent call
    const third = await fetchCachedUnifiedActionContracts({
      limit: 1500,
      status: "approved",
      floorDate: "2026-01-01",
      requireCoordinates: false,
      types: ["action"],
      requirePublicCompletedActions: true,
    });
    expect(third.items).toHaveLength(1);
    expect(fetchUnifiedMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed strict overview and recovers on retry", async () => {
    const validContract = buildActionDataContract({
      id: "recovered-overview-1",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-11-20",
      createdAt: "2026-11-20T10:00:00.000Z",
      locationLabel: "Paris 10e",
      latitude: 48.87,
      longitude: 2.35,
      wasteKg: 10,
      volunteersCount: 3,
    });

    fetchUnifiedMock
      .mockResolvedValueOnce({
        items: [],
        isTruncated: false,
        sourceHealth: {
          partial: true,
          failedSources: ["actions"],
          availableSources: [],
          warnings: ["actions_failed"],
        },
      })
      .mockResolvedValueOnce({
        items: [validContract],
        isTruncated: false,
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      });

    const first = await loadPilotageOverview({
      periodDays: 30,
      limit: 1500,
      publishedCompletedOnly: true,
    });
    expect(first.dataAvailability.sourceHealth.failedSources).toEqual(["actions"]);
    expect(first.comparison.current.approvedActions).toBe(0);

    const second = await loadPilotageOverview({
      periodDays: 30,
      limit: 1500,
      publishedCompletedOnly: true,
    });
    expect(second.dataAvailability.sourceHealth.failedSources).toEqual([]);
    expect(second.comparison.current.approvedActions).toBe(1);
    expect(fetchUnifiedMock).toHaveBeenCalledTimes(2);

    // Valid overview is cached
    const third = await loadPilotageOverview({
      periodDays: 30,
      limit: 1500,
      publishedCompletedOnly: true,
    });
    expect(third.comparison.current.approvedActions).toBe(1);
    expect(fetchUnifiedMock).toHaveBeenCalledTimes(2);
  });
});
