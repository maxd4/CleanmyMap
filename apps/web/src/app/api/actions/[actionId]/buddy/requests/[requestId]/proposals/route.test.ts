import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/__tests__/support/action-behavior-test-helpers";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const createProposalMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) => Response.json({ details }, { status: 422 }),
}));
vi.mock("@/lib/actions/action-buddy", () => ({ createActionBuddyProposal: createProposalMock }));

describe("POST /api/actions/[actionId]/buddy/requests/[requestId]/proposals", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "mentor-session" });
    unauthorizedJsonResponseMock.mockReturnValue(jsonResponse({ error: "Unauthorized" }, 401));
    getSupabaseServerClientMock.mockReturnValue({ client: "service" });
    handleApiErrorMock.mockImplementation(() => jsonResponse({ error: "server" }, 500));
    createProposalMock.mockResolvedValue({ id: "proposal-1", request_id: "request-1", mentor_user_id: "mentor-session", status: "pending" });
  });

  it("rejects an unauthenticated or malformed proposal creation", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { POST } = await import("./route");
    const unauthenticated = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", requestId: "request-1" }) });
    expect(unauthenticated.status).toBe(401);
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "mentor-session" });
    const invalid = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", requestId: "   " }) });
    expect(invalid.status).toBe(422);
    expect(createProposalMock).not.toHaveBeenCalled();
  });

  it("binds the mentor to the authenticated session and returns private no-store state", async () => {
    const { POST } = await import("./route");
    const result = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ mentorUserId: "forged" }) }), { params: Promise.resolve({ actionId: " action-1 ", requestId: " request-1 " }) });
    expect(result.status).toBe(201);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(createProposalMock).toHaveBeenCalledWith({ client: "service" }, { actionId: "action-1", requestId: "request-1", mentorUserId: "mentor-session" });
  });

  it("delegates service conflicts to the API error boundary", async () => {
    const error = new Error("Action buddy conflict: proposal already exists.");
    createProposalMock.mockRejectedValue(error);
    const { POST } = await import("./route");
    const result = await POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ actionId: "action-1", requestId: "request-1" }) });
    expect(result.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledWith(error, "POST /api/actions/[actionId]/buddy/requests/[requestId]/proposals");
  });
});
