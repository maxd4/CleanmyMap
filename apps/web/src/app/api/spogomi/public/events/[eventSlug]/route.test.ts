import { describe, expect, it, vi } from "vitest";

const { getSupabaseServerClientMock, loadPublishedResultsMock } = vi.hoisted(() => ({
  getSupabaseServerClientMock: vi.fn(),
  loadPublishedResultsMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/public-service", () => ({ loadPublishedSpogomiEventResultsBySlug: loadPublishedResultsMock }));

import { GET } from "./route";

describe("GET /api/spogomi/public/events/[eventSlug]", () => {
  it("returns the bounded projection and does not reintroduce hidden numeric fields", async () => {
    loadPublishedResultsMock.mockResolvedValue({
      visibility: "certified",
      sport: { status: "unavailable", entries: [{ teamNumber: 1, publicName: "Alpha", rank: null, status: "unavailable", eligible: true, reason: "Résultat non publié.", valueUnit: "points" }] },
      butts: { status: "unavailable", entries: [] },
    });
    const response = await GET(new Request("http://localhost/api/spogomi/public/events/paris"), { params: Promise.resolve({ eventSlug: "paris" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.results.sport.entries[0]).not.toHaveProperty("score");
    expect(body.results.sport.entries[0]).not.toHaveProperty("scoreResult");
  });
});
