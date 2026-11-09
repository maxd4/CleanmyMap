import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

const eventId = "11111111-1111-4111-8111-111111111111";
const changeId = "22222222-2222-4222-8222-222222222222";
const context = () => ({ params: Promise.resolve({ eventId, changeId }) });

describe("SPOGOMI event change acknowledgement API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "participant-1" });
    rpcMock.mockResolvedValue({ data: { eventId, changeId, acknowledged: true }, error: null });
    getSupabaseServerClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it("requires Clerk authentication before creating a privileged client", async () => {
    const { POST } = await import("./route");
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401 });

    const response = await POST(new Request("http://localhost", { method: "POST" }), context());

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("forwards only the verified Clerk identity to the existing RPC", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), context());

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("acknowledge_spogomi_event_change", {
      p_event_id: eventId,
      p_change_id: changeId,
      p_clerk_id: "participant-1",
    });
    expect(await response.json()).toMatchObject({ status: "ok", acknowledgement: { acknowledged: true } });
  });

  it("maps the RPC permission boundary without leaking database details", async () => {
    const { POST } = await import("./route");
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "internal relation detail" } });

    const response = await POST(new Request("http://localhost", { method: "POST" }), context());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(JSON.stringify(body)).not.toContain("internal relation detail");
  });

  it("keeps a missing event/change pair distinct from an unauthorized account", async () => {
    const { POST } = await import("./route");
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: "P0002", message: "internal history detail" } });

    const response = await POST(new Request("http://localhost", { method: "POST" }), context());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Changement introuvable.", kind: "not_found" });
  });

  it("rejects malformed event and change ids before calling the RPC", async () => {
    const { POST } = await import("./route");

    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ eventId: "wrong", changeId }) });

    expect(response.status).toBe(422);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
