import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const transitionActionNeedOfferMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/community/action-need-offers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/community/action-need-offers")>("@/lib/community/action-need-offers");
  return { ...actual, transitionActionNeedOffer: transitionActionNeedOfferMock };
});

import { PATCH } from "./route";

const needId = "22222222-2222-4222-8222-222222222222";
const offerId = "11111111-1111-4111-8111-111111111111";
const offer = {
  id: offerId,
  need_id: needId,
  offered_by_clerk_id: "helper-1",
  message: "Je peux aider.",
  status: "accepted" as const,
  created_at: "2026-10-30T10:00:00.000Z",
  updated_at: "2026-10-30T10:01:00.000Z",
};

function patchRequest(operation: string) {
  return new Request(`http://localhost/api/community/needs/${needId}/offers/${offerId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation }),
  });
}

describe("community need offer transition API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId: "manager-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    transitionActionNeedOfferMock.mockResolvedValue({ status: "accepted", offer, notificationId: "notification-1" });
  });

  it("passes the session actor and explicit accept operation to the atomic transition", async () => {
    const response = await PATCH(patchRequest("accept"), { params: Promise.resolve({ needId, offerId }) });
    expect(response.status).toBe(200);
    expect(transitionActionNeedOfferMock).toHaveBeenCalledWith(expect.anything(), offerId, "manager-1", "accept");
  });

  it("allows the author path to request withdrawal without creating participation", async () => {
    authzMock.mockResolvedValue({ ok: true, userId: "helper-1" });
    transitionActionNeedOfferMock.mockResolvedValue({ ...offer, status: "withdrawn", offer: { ...offer, status: "withdrawn" }, notificationId: null });
    const response = await PATCH(patchRequest("withdraw"), { params: Promise.resolve({ needId, offerId }) });
    expect(response.status).toBe(200);
    expect(transitionActionNeedOfferMock).toHaveBeenCalledWith(expect.anything(), offerId, "helper-1", "withdraw");
  });

  it("maps closure or eligibility loss to a conflict and keeps retries explicit", async () => {
    transitionActionNeedOfferMock.mockRejectedValue({ code: "40001", message: "need is no longer eligible" });
    const response = await PATCH(patchRequest("decline"), { params: Promise.resolve({ needId, offerId }) });
    expect(response.status).toBe(409);
  });

  it("does not accept a client-supplied status or unknown operation", async () => {
    const requestWithStatus = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "accept", status: "accepted" }),
    });
    expect((await PATCH(requestWithStatus, { params: Promise.resolve({ needId, offerId }) })).status).toBe(422);
    expect(transitionActionNeedOfferMock).not.toHaveBeenCalled();
  });
});
