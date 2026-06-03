import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.fn();
const fetchActionPollutionScoreReferencesMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/pollution-score-references", () => ({
  fetchActionPollutionScoreReferences: fetchActionPollutionScoreReferencesMock,
}));

describe("/api/actions/pollution-score-references GET", () => {
  beforeEach(() => {
    vi.resetModules();
    getSupabaseServerClientMock.mockReset();
    fetchActionPollutionScoreReferencesMock.mockReset();
    getSupabaseServerClientMock.mockReturnValue({});
    fetchActionPollutionScoreReferencesMock.mockResolvedValue({
      wastePerVolunteer: 12.5,
      buttsPerVolunteer: 875,
    });
  });

  it("returns dynamic score references for the popup", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      wastePerVolunteer: 12.5,
      buttsPerVolunteer: 875,
    });
    expect(fetchActionPollutionScoreReferencesMock).toHaveBeenCalledWith({});
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
