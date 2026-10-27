import { beforeEach, describe, expect, it, vi } from "vitest";

const loadItems = vi.hoisted(() => vi.fn());
const fetchReferences = vi.hoisted(() => vi.fn());
const deriveReference = vi.hoisted(() => vi.fn(() => ({ latitude: 48.85, longitude: 2.35 })));
const selectNearest = vi.hoisted(() => vi.fn());
const serverClient = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("@/lib/actions/pollution/initial-nearest-pollution-source", () => ({
  loadInitialPollutionItems: loadItems,
}));
vi.mock("@/lib/actions/pollution/pollution-score-references", () => ({
  fetchActionPollutionScoreReferences: fetchReferences,
}));
vi.mock("@/lib/actions/pollution/initial-nearest-pollution", () => ({
  INITIAL_MAP_SEARCH_RADII_KM: [1, 5, 10],
  deriveReferenceFromBounds: deriveReference,
  selectNearestActivePollution: selectNearest,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: serverClient }));

import { GET } from "./route";

const validUrl = "https://cleanmymap.test/api/actions/map/initial-nearest?south=48.8&west=2.2&north=48.9&east=2.5&radiusKm=5";

describe("GET /api/actions/map/initial-nearest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadItems.mockResolvedValue([{ id: "spot-1" }]);
    fetchReferences.mockResolvedValue({ global: { wastePerVolunteer: 1 } });
    selectNearest.mockReturnValue({ id: "spot-1", distanceKm: 1.2 });
  });

  it.each([
    "https://cleanmymap.test/api/actions/map/initial-nearest",
    "https://cleanmymap.test/api/actions/map/initial-nearest?south=48.9&west=2.2&north=48.8&east=2.5&radiusKm=5",
    "https://cleanmymap.test/api/actions/map/initial-nearest?south=48.8&west=2.2&north=48.9&east=2.5&radiusKm=2",
    "https://cleanmymap.test/api/actions/map/initial-nearest?south=91&west=2.2&north=92&east=2.5&radiusKm=5",
  ])("rejects missing, inverted, out-of-range, or unsupported parameters: %s", async (url) => {
    const response = await GET(new Request(url));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Paramètres de recherche invalides." });
    expect(serverClient).not.toHaveBeenCalled();
  });

  it("loads the bounded sources and returns the selected nearest item", async () => {
    const response = await GET(new Request(validUrl));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ item: { id: "spot-1", distanceKm: 1.2 } });
    expect(serverClient).toHaveBeenCalledWith(false);
    expect(loadItems).toHaveBeenCalledWith({}, { south: 48.8, west: 2.2, north: 48.9, east: 2.5, zoom: null });
    expect(selectNearest).toHaveBeenCalledWith(
      [{ id: "spot-1" }],
      { latitude: 48.85, longitude: 2.35 },
      { global: { wastePerVolunteer: 1 } },
      5,
    );
  });

  it("returns an empty item when score references are unavailable", async () => {
    fetchReferences.mockResolvedValueOnce(null);
    const response = await GET(new Request(validUrl));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ item: null });
    expect(selectNearest).not.toHaveBeenCalled();
  });

  it("maps source failures to the generic safe API response", async () => {
    loadItems.mockRejectedValueOnce(new Error("private database detail"));
    const response = await GET(new Request(validUrl));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("private database detail");
  });
});
