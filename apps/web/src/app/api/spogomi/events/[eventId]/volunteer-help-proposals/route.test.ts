import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSpogomiResponse as requireResponse, spogomiEventParams } from "@/__tests__/support/spogomi-route";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const listRequesterMock = vi.hoisted(() => vi.fn());
const createRequesterMock = vi.hoisted(() => vi.fn());
const transitionRequesterMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const ProposalErrorMock = vi.hoisted(() => class extends Error {
  constructor(message: string, public readonly kind: "unavailable" | "conflict" | "forbidden" | "validation") {
    super(message);
  }
});
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/volunteer-help-proposals", () => ({
  listSpogomiVolunteerHelpProposalsForRequester: listRequesterMock,
  createSpogomiVolunteerHelpProposal: createRequesterMock,
  transitionSpogomiVolunteerHelpProposal: transitionRequesterMock,
  SpogomiVolunteerHelpProposalError: ProposalErrorMock,
}));

const eventId = "11111111-1111-4111-8111-111111111111";
const testEmail = ["ada", "example.test"].join("@");
function request(method = "GET", body?: unknown) {
  return new Request(`http://localhost/api/spogomi/events/${eventId}/volunteer-help-proposals`, body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("SPOGOMI volunteer help proposal requester route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "requester-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    listRequesterMock.mockResolvedValue([]);
    createRequesterMock.mockResolvedValue({ id: "proposal-1", eventId, status: "pending", createdAt: "2026-11-09T10:00:00.000Z" });
    transitionRequesterMock.mockResolvedValue({ id: "proposal-1", eventId, status: "withdrawn" });
  });

  it("reads only the authenticated requester projection", async () => {
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), spogomiEventParams(eventId)));
    expect(response.status).toBe(200);
    expect(listRequesterMock).toHaveBeenCalledWith(expect.anything(), { eventId, requesterClerkId: "requester-1" });
  });

  it("accepts a valid proposal without requiring the sports quiz or creating admission data", async () => {
    const { POST } = await import("./route");
    const response = requireResponse(await POST(request("POST", {
      idempotencyKey: "proposal-key-123456",
      contactFirstName: "Ada",
      contactLastName: "Lovelace",
      contactEmail: testEmail,
      contactPhone: "",
      helpType: "Parcours et sécurité",
      motivation: "Je souhaite aider l’équipe locale.",
      usefulSkills: "Organisation et orientation.",
      cleanwalkExperience: "Une cleanwalk en 2025.",
    }), spogomiEventParams(eventId)));
    expect(response.status).toBe(201);
    expect(createRequesterMock).toHaveBeenCalledWith(expect.objectContaining({ eventId, requesterClerkId: "requester-1", contactEmail: testEmail, contactPhone: null }));
  });

  it("rejects a missing or invalid contact before the persistence owner", async () => {
    const { POST } = await import("./route");
    const response = requireResponse(await POST(request("POST", {
      idempotencyKey: "proposal-key-123456",
      contactFirstName: "Ada",
      contactLastName: "Lovelace",
      contactEmail: "",
      contactPhone: "12",
      helpType: "Accueil",
      motivation: "Motivation suffisamment longue.",
      usefulSkills: "Accueil.",
      cleanwalkExperience: "",
    }), spogomiEventParams(eventId)));
    expect(response.status).toBe(422);
    expect(createRequesterMock).not.toHaveBeenCalled();
  });

  it("keeps withdrawal scoped to the authenticated account", async () => {
    const { DELETE } = await import("./route");
    const response = requireResponse(await DELETE(request("DELETE", { proposalId: "22222222-2222-4222-8222-222222222222" }), spogomiEventParams(eventId)));
    expect(response.status).toBe(200);
    expect(transitionRequesterMock).toHaveBeenCalledWith(expect.objectContaining({ eventId, proposalId: "22222222-2222-4222-8222-222222222222", actorClerkId: "requester-1", targetStatus: "withdrawn" }));
  });

  it("does not expose private fields from the minimal withdrawal projection", async () => {
    const { DELETE } = await import("./route");
    transitionRequesterMock.mockResolvedValueOnce({ id: "proposal-1", eventId, status: "withdrawn", createdAt: "2026-11-09T10:00:00.000Z" });
    const response = requireResponse(await DELETE(request("DELETE", { proposalId: "22222222-2222-4222-8222-222222222222" }), spogomiEventParams(eventId)));
    const body = await response.json() as Record<string, unknown>;
    expect(body.proposal).not.toHaveProperty("contactEmail");
    expect(body.proposal).not.toHaveProperty("motivation");
  });

  it("does not touch the private owner when anonymous or rate limited", async () => {
    const { POST } = await import("./route");
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false });
    expect(requireResponse(await POST(request("POST", {}), spogomiEventParams(eventId))).status).toBe(401);
    enforceRateLimitMock.mockResolvedValueOnce(new Response("limited", { status: 429 }));
    expect(requireResponse(await POST(request("POST", {}), spogomiEventParams(eventId))).status).toBe(429);
    expect(createRequesterMock).not.toHaveBeenCalled();
  });
});
