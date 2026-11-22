import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const readActionRegistrationRecordMock = vi.hoisted(() => vi.fn());
const loadParticipantProfilesForUserIdsMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const loadCanonicalActionOrganizerIdsForActionMock = vi.hoisted(() => vi.fn());
const loadOwnActionAccessibilitySupportRequestMock = vi.hoisted(() => vi.fn());
const loadActionAccessibilitySupportRequestsForOrganizerMock = vi.hoisted(() => vi.fn());
const saveActionAccessibilitySupportRequestMock = vi.hoisted(() => vi.fn());
const deleteOwnActionAccessibilitySupportRequestMock = vi.hoisted(() => vi.fn());
const updateActionAccessibilityCheckInMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock, getCurrentUserIdentity: getCurrentUserIdentityMock }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: unauthorizedJsonResponseMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: handleApiErrorMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/actions/participation/organizers", () => ({ loadCanonicalActionOrganizerIdsForAction: loadCanonicalActionOrganizerIdsForActionMock }));
vi.mock("@/lib/actions/participation/registration-records", () => ({ readActionRegistrationRecord: readActionRegistrationRecordMock }));
vi.mock("@/lib/actions/participation/group-participation.helpers", () => ({ loadParticipantProfilesForUserIds: loadParticipantProfilesForUserIdsMock }));
vi.mock("@/lib/actions/accessibility-support", () => ({
  deleteOwnActionAccessibilitySupportRequest: deleteOwnActionAccessibilitySupportRequestMock,
  loadActionAccessibilitySupportRequestsForOrganizer: loadActionAccessibilitySupportRequestsForOrganizerMock,
  loadOwnActionAccessibilitySupportRequest: loadOwnActionAccessibilitySupportRequestMock,
  saveActionAccessibilitySupportRequest: saveActionAccessibilitySupportRequestMock,
  updateActionAccessibilityCheckIn: updateActionAccessibilityCheckInMock,
}));

describe("/api/actions/[actionId]/accessibility-support", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "participant-1" });
    unauthorizedJsonResponseMock.mockReturnValue(Response.json({ error: "Unauthorized" }, { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
    loadActionByIdMock.mockResolvedValue({ id: "action-1", created_by_clerk_id: "organizer-1" });
    getCurrentUserIdentityMock.mockResolvedValue({ role: "member", activeRole: "member" });
    loadCanonicalActionOrganizerIdsForActionMock.mockResolvedValue(["organizer-1"]);
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    loadParticipantProfilesForUserIdsMock.mockResolvedValue(new Map());
    loadOwnActionAccessibilitySupportRequestMock.mockResolvedValue({ requested_needs: ["rest_breaks"] });
    loadActionAccessibilitySupportRequestsForOrganizerMock.mockResolvedValue([]);
    handleApiErrorMock.mockImplementation(() => Response.json({ error: "server" }, { status: 500 }));
  });

  it("blocks anonymous reads before accessing private request data", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(401);
    expect(loadActionByIdMock).not.toHaveBeenCalled();
  });

  it("returns only the requester's own record with private no-store caching", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(loadOwnActionAccessibilitySupportRequestMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "participant-1" });
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).not.toHaveBeenCalled();
  });

  it("returns organizer requests only after canonical action-management authorization", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    readActionRegistrationRecordMock.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(loadCanonicalActionOrganizerIdsForActionMock).toHaveBeenCalledWith(expect.anything(), "action-1");
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1" });
    expect(loadOwnActionAccessibilitySupportRequestMock).not.toHaveBeenCalled();
  });

  it("returns the personal request first when the signed-in organizer is also confirmed", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-1/accessibility-support"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(await response.json()).toMatchObject({ audience: "participant", request: { requested_needs: ["rest_breaks"] } });
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).not.toHaveBeenCalled();
  });

  it("allows the dual-role organizer to explicitly request the organizer view with a distinct audience", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    loadActionAccessibilitySupportRequestsForOrganizerMock.mockResolvedValue([{ id: "request-1", requester_user_id: "member-1" }]);
    loadParticipantProfilesForUserIdsMock.mockResolvedValue(new Map([["member-1", { display_name: "Camille", handle: "camille" }]]));
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-1/accessibility-support?audience=organizer"), { params: Promise.resolve({ actionId: "action-1" }) });
    const body = await response.json();
    expect(body).toMatchObject({ audience: "organizer", requests: [{ id: "request-1", participantLabel: "Camille" }] });
    expect(body.requests[0]).not.toHaveProperty("requester_user_id");
  });

  it("rejects organizer audience for a non-manager even when the caller is registered", async () => {
    readActionRegistrationRecordMock.mockResolvedValue({ registration_status: "confirmed" });
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/actions/action-1/accessibility-support?audience=organizer"), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(loadActionAccessibilitySupportRequestsForOrganizerMock).not.toHaveBeenCalled();
  });

  it("accepts only the allowlisted check-in fields and supports resetting a status to unknown", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    updateActionAccessibilityCheckInMock.mockResolvedValue({ id: "request-1", arrival_status: null });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/actions/action-1/accessibility-support", { method: "PATCH", body: JSON.stringify({ requestId: "request-1", field: "arrival_status", status: null }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(200);
    expect(updateActionAccessibilityCheckInMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", requestId: "request-1", field: "arrival_status", status: null });
  });

  it("does not authorize another account to write organizer check-ins", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "participant-2" });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/actions/action-1/accessibility-support", { method: "PATCH", body: JSON.stringify({ requestId: "request-1", field: "arrival_status", status: "completed" }) }), { params: Promise.resolve({ actionId: "action-1" }) });
    expect(response.status).toBe(403);
    expect(updateActionAccessibilityCheckInMock).not.toHaveBeenCalled();
  });

  it("keeps participant save and deletion scoped to the authenticated owner", async () => {
    saveActionAccessibilitySupportRequestMock.mockResolvedValue({ requested_needs: ["rest_breaks"] });
    deleteOwnActionAccessibilitySupportRequestMock.mockResolvedValue(undefined);
    const { PUT, DELETE } = await import("./route");
    const context = { params: Promise.resolve({ actionId: "action-1" }) };
    const putResponse = await PUT(new Request("http://localhost/api/actions/action-1/accessibility-support", { method: "PUT", body: JSON.stringify({ requestedNeeds: ["rest_breaks"] }) }), context);
    const deleteResponse = await DELETE(new Request("http://localhost/api/actions/action-1/accessibility-support", { method: "DELETE" }), context);
    expect(putResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(saveActionAccessibilitySupportRequestMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "participant-1", body: { requestedNeeds: ["rest_breaks"] } });
    expect(deleteOwnActionAccessibilitySupportRequestMock).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "participant-1" });
  });
});
