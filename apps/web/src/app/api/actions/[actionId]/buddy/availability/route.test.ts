import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "@/__tests__/support/action-behavior-test-helpers";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());
const setAvailabilityMock = vi.hoisted(() => vi.fn());
const removeAvailabilityMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
  validationErrorResponse: (details: Record<string, string[]>) => Response.json({ details }, { status: 422 }),
}));
vi.mock("@/lib/actions/action-buddy", () => ({
  setActionBuddyAvailability: setAvailabilityMock,
  removeActionBuddyAvailability: removeAvailabilityMock,
}));

describe("/api/actions/[actionId]/buddy/availability", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "mentor-session" });
    unauthorizedJsonResponseMock.mockReturnValue(jsonResponse({ error: "Unauthorized" }, 401));
    getSupabaseServerClientMock.mockReturnValue({ client: "service" });
    handleApiErrorMock.mockImplementation(() => jsonResponse({ error: "server" }, 500));
    setAvailabilityMock.mockResolvedValue({ action_id: "action-1", mentor_user_id: "mentor-session" });
    removeAvailabilityMock.mockResolvedValue({ removed: true });
  });

  it("requires authentication before changing availability", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { PUT } = await import("./route");
    const result = await PUT(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(result.status).toBe(401);
    expect(setAvailabilityMock).not.toHaveBeenCalled();
  });

  it("uses only the session mentor and keeps the response private", async () => {
    const { PUT } = await import("./route");
    const result = await PUT(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ actionId: " action-1 " }) });
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(setAvailabilityMock).toHaveBeenCalledWith({ client: "service" }, { actionId: "action-1", mentorUserId: "mentor-session" });
  });

  it("makes repeated removal idempotent and rejects missing action identifiers", async () => {
    const { DELETE } = await import("./route");
    const removed = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({ status: "ok", removed: true });
    const invalid = await DELETE(new Request("http://localhost", { method: "DELETE" }), { params: Promise.resolve({ actionId: "   " }) });
    expect(invalid.status).toBe(422);
    expect(removeAvailabilityMock).toHaveBeenCalledTimes(1);
  });
});
