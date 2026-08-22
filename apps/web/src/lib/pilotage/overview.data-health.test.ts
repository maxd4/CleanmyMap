import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCachedUnifiedActionContracts: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

vi.mock("../actions/unified-source-cache", () => ({
  fetchCachedUnifiedActionContracts: mocks.fetchCachedUnifiedActionContracts,
}));

import { loadPilotageOverview } from "./overview";

describe("loadPilotageOverview data availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates truncation and source health from the cached result", async () => {
    const sourceHealth = {
      partial: true,
      failedSources: ["local" as const],
      availableSources: ["actions" as const, "spots" as const],
      warnings: ["local_source_unavailable"],
    };
    mocks.fetchCachedUnifiedActionContracts.mockResolvedValue({
      items: [],
      isTruncated: true,
      sourceHealth,
    });

    const overview = await loadPilotageOverview({
      periodDays: 90,
      limit: 2200,
    });

    expect(overview.dataAvailability).toEqual({
      isTruncated: true,
      sourceHealth,
    });
    expect(mocks.fetchCachedUnifiedActionContracts).toHaveBeenCalledTimes(1);
    expect(mocks.fetchCachedUnifiedActionContracts).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 2200,
        status: "approved",
      }),
    );
  });
});
