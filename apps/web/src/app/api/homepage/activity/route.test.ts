import { beforeEach, describe, expect, it, vi } from "vitest";

const loadRecentCommunityActivityMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/accueil/data", () => ({
  formatLandingOverviewErrorMessage: () =>
    "Les actions vérifiées sont momentanément indisponibles.",
  loadRecentCommunityActivity: loadRecentCommunityActivityMock,
}));

import { GET, revalidate } from "./route";

describe("GET /api/homepage/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the canonical recent activity contract with a ten-minute cache", async () => {
    loadRecentCommunityActivityMock.mockResolvedValueOnce({
      activity: {
        visibleActions: 3,
        distinctLocations: 2,
        items: [{ id: "action-1" }],
      },
      errorMessage: null,
    });

    const response = await GET();

    expect(revalidate).toBe(600);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=600");
    expect(await response.json()).toMatchObject({
      activity: { visibleActions: 3, distinctLocations: 2 },
      errorMessage: null,
    });
  });

  it("returns an explicit degraded state when the canonical source fails", async () => {
    loadRecentCommunityActivityMock.mockRejectedValueOnce(new Error("source offline"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      activity: { items: [] },
      errorMessage: "Les actions vérifiées sont momentanément indisponibles.",
    });
  });
});
