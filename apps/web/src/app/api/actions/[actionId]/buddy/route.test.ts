import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const loadActionBuddyStateMock = vi.hoisted(() => vi.fn());
const createActionBuddyRequestMock = vi.hoisted(() => vi.fn());
const cancelActionBuddyRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) => Response.json({ details }, { status: 422 }),
}));
vi.mock("@/lib/actions/action-buddy", () => ({
  loadActionBuddyState: loadActionBuddyStateMock,
  createActionBuddyRequest: createActionBuddyRequestMock,
  cancelActionBuddyRequest: cancelActionBuddyRequestMock,
}));

describe("/api/actions/[actionId]/buddy", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "session-user" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({ client: "service" });
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
    loadActionBuddyStateMock.mockResolvedValue({ actionId: "action-1", availability: null, request: null, proposals: [] });
    createActionBuddyRequestMock.mockResolvedValue({ id: "request-1", status: "open" });
    cancelActionBuddyRequestMock.mockResolvedValue({ request: { id: "request-1", status: "cancelled" }, alreadyCancelled: false });
  });

  it("refuses anonymous reads before loading the private state", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(loadActionBuddyStateMock).not.toHaveBeenCalled();
  });

  it("returns only the session-scoped private state", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: " action-1 " }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(loadActionBuddyStateMock).toHaveBeenCalledWith({ client: "service" }, { actionId: "action-1", userId: "session-user" });
  });

  it("creates a request from the session identity and does not accept a forged body identity", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ requesterUserId: "forged-user" }) }),
      { params: Promise.resolve({ actionId: "action-1" }) },
    );
    expect(response.status).toBe(201);
    expect(createActionBuddyRequestMock).toHaveBeenCalledWith({ client: "service" }, { actionId: "action-1", requesterUserId: "session-user" });
  });

  it("cancels only the current account's action-scoped request", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(cancelActionBuddyRequestMock).toHaveBeenCalledWith({ client: "service" }, { actionId: "action-1", requesterUserId: "session-user" });
  });

  it("does not turn a service conflict into a success", async () => {
    const error = new Error("Action buddy conflict: request already exists.");
    createActionBuddyRequestMock.mockRejectedValue(error);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledWith(error, "POST /api/actions/[actionId]/buddy");
  });
});
