import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  enforceRateLimit: vi.fn(),
  getSupabase: vi.fn(),
  loadProjection: vi.fn(),
  setStatus: vi.fn(),
  resolveAccess: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: mocks.enforceRateLimit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: () => new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
  validationErrorResponse: ({ body }: { body: string[] }) => new Response(JSON.stringify({ body }), { status: 422 }),
}));
vi.mock("@/lib/spogomi/attendance-service", () => ({
  loadSpogomiAttendanceProjection: mocks.loadProjection,
  setSpogomiAttendanceStatus: mocks.setStatus,
}));
vi.mock("@/lib/spogomi/authorization", () => ({
  hasSpogomiCapability: (access: { checkin?: boolean }, capability: string) => capability === "checkin" && access.checkin === true,
  resolveSpogomiEventAccess: mocks.resolveAccess,
}));

const context = { params: Promise.resolve({ eventId: "event-1" }) };

describe("SPOGOMI attendance route", () => {
  it("fails closed for anonymous and non-check-in users", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false });
    const route = await import("./events/[eventId]/attendance/route");
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(401);
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: true, userId: "user-1" });
    mocks.getSupabase.mockReturnValue({});
    mocks.loadProjection.mockResolvedValue(false);
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(403);
  });

  it("returns only the scoped projection and sends the actor to the transactional command", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "checkin-1" });
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.getSupabase.mockReturnValue({});
    mocks.loadProjection.mockResolvedValue({ eventId: "event-1", total: 1, participants: [{ id: "participant-1", attendanceStatus: "pending" }] });
    mocks.resolveAccess.mockResolvedValue({ checkin: true });
    mocks.setStatus.mockResolvedValue({ changed: true, attendanceStatus: "present" });
    const route = await import("./events/[eventId]/attendance/route");
    const read = await route.GET(new Request("http://localhost/attendance?page=0&pageSize=25"), context);
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual(expect.objectContaining({ eventId: "event-1", total: 1 }));
    const write = await route.POST(new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: "11111111-1111-4111-8111-111111111111", participantId: "22222222-2222-4222-8222-222222222222", status: "present", reason: "Accueil", provenance: "onsite_identity_check" }) }), context);
    expect(write.status).toBe(200);
    expect(mocks.setStatus).toHaveBeenCalledWith(expect.objectContaining({ actorClerkId: "checkin-1", status: "present", reason: "Accueil" }));
  });
});
