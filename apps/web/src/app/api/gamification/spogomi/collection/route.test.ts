import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  loadSpogomiCollectionForUser: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/recognition-service", () => ({ loadSpogomiCollectionForUser: mocks.loadSpogomiCollectionForUser }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }) }));

import { GET } from "./route";

describe("GET /api/gamification/spogomi/collection", () => {
  it("refuses anonymous reads before creating a privileged client", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns the private collection with no-store and preserves the user scope", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: "user-1" });
    const supabase = { privileged: true };
    mocks.getSupabaseServerClient.mockReturnValueOnce(supabase);
    mocks.loadSpogomiCollectionForUser.mockResolvedValueOnce({ awards: [], spogomiAwardCount: 0 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ status: "ok", collection: { awards: [], spogomiAwardCount: 0 } });
    expect(mocks.loadSpogomiCollectionForUser).toHaveBeenCalledWith(supabase, "user-1");
  });

  it("normalizes provider failures to the API error boundary", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: "user-1" });
    mocks.getSupabaseServerClient.mockReturnValueOnce({});
    mocks.loadSpogomiCollectionForUser.mockRejectedValueOnce(new Error("private provider detail"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private provider detail");
  });
});
