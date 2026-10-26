import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const listingMock = vi.hoisted(() => vi.fn());
const supabaseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/gamification/badges/listing", () => ({
  loadGamificationBadgesList: listingMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMock,
}));

import { GET } from "./route";

beforeEach(() => {
  authMock.mockReset();
  listingMock.mockReset();
  supabaseMock.mockReset();
  authMock.mockResolvedValue({ userId: "user-1" });
  supabaseMock.mockReturnValue({ id: "supabase" });
  listingMock.mockResolvedValue({ badges: [{ id: "badge-1", earned: true }] });
});

describe("GET /api/gamification/badges/list", () => {
  it("keeps badge listing private and scoped to the authenticated user", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", badges: [{ id: "badge-1", earned: true }] });
    expect(listingMock).toHaveBeenCalledWith({ id: "supabase" }, "user-1");
    expect(response.headers.get("cache-control")).toContain("private");
  });

  it("refuses anonymous access and reports a listing failure", async () => {
    authMock.mockResolvedValue({ userId: null });
    const anonymous = await GET();
    expect(anonymous.status).toBe(401);
    expect(supabaseMock).not.toHaveBeenCalled();

    authMock.mockResolvedValue({ userId: "user-1" });
    listingMock.mockRejectedValue(new Error("listing unavailable"));
    const failure = await GET();
    expect(failure.status).toBeGreaterThanOrEqual(400);
  });
});
