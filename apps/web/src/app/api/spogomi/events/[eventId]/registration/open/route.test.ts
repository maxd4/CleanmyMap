import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadEventMock = vi.hoisted(() => vi.fn());
const openRegistrationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/preparation-service", () => ({
  loadSpogomiEventForOrganizer: loadEventMock,
  openSpogomiRegistration: openRegistrationMock,
}));

const eventId = "11111111-1111-4111-8111-111111111111";
const context = () => ({ params: Promise.resolve({ eventId }) });
const event = { id: eventId, state: "draft", public_visibility: "published", composition_revision: 8 };

describe("SPOGOMI registration opening API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    getSupabaseServerClientMock.mockReturnValue({ id: "service-client" });
    loadEventMock.mockResolvedValue(event);
    openRegistrationMock.mockResolvedValue({ ...event, state: "registration_open", composition_revision: 9 });
  });

  it("rejects unauthenticated and unauthorized direct calls without opening", async () => {
    const { POST } = await import("./route");
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await POST(new Request("http://localhost"), context())).status).toBe(401);
    loadEventMock.mockResolvedValueOnce(false);
    expect((await POST(new Request("http://localhost"), context())).status).toBe(403);
    expect(openRegistrationMock).not.toHaveBeenCalled();
  });

  it("forwards the organizer event snapshot to the revision-controlled RPC service", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), context());
    expect(response.status).toBe(200);
    expect(openRegistrationMock).toHaveBeenCalledWith({ supabase: { id: "service-client" }, event, actorClerkId: "organizer-1" });
  });

  it("returns a safe conflict when the server rejects a stale opening", async () => {
    const { POST } = await import("./route");
    openRegistrationMock.mockRejectedValueOnce(Object.assign(new Error("stale"), { code: "40001" }));
    const response = await POST(new Request("http://localhost", { method: "POST" }), context());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("stale");
  });
});
