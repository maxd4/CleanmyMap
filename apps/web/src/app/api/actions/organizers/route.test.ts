import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const selectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

describe("GET /api/actions/organizers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: selectMock.mockImplementation((projection: string) => {
          expect(projection).toBe("id, name, normalized_name, organizer_type");
          expect(projection).not.toContain("created_by_clerk_id");
          return {
            eq() { return this; },
            order() { return this; },
            limit: async () => ({
              data: [{
                id: "persisted-1",
                name: "Collectif Rivière",
                normalized_name: "collectif riviere",
                organizer_type: "collective",
                created_by_clerk_id: "must-not-leak",
              }],
                error: null,
              }),
          };
        }),
      }),
    });
  });

  it("returns only the public organizer projection", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/organizers?type=collective&q=rivière"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      items: [{
        id: "persisted-1",
        name: "Collectif Rivière",
        organizerType: "collective",
        source: "user_created",
        locationLabel: null,
      }],
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
  });
});
