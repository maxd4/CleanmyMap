import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSpogomiResponse as requireResponse, spogomiEventParams } from "@/__tests__/support/spogomi-route";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const enforceRateLimitMock = vi.hoisted(() => vi.fn());
const resolveAccessMock = vi.hoisted(() => vi.fn());
const hasCapabilityMock = vi.hoisted(() => vi.fn());
const listOrganizerMock = vi.hoisted(() => vi.fn());
const transitionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const ProposalErrorMock = vi.hoisted(() => class extends Error {
  constructor(message: string, public readonly kind: "unavailable" | "conflict" | "forbidden" | "validation") { super(message); }
});
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: enforceRateLimitMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/spogomi/authorization", () => ({ resolveSpogomiEventAccess: resolveAccessMock, hasSpogomiCapability: hasCapabilityMock }));
vi.mock("@/lib/spogomi/volunteer-help-proposals", () => ({ listSpogomiVolunteerHelpProposalsForOrganizer: listOrganizerMock, transitionSpogomiVolunteerHelpProposal: transitionMock, SpogomiVolunteerHelpProposalError: ProposalErrorMock }));

const eventId = "11111111-1111-4111-8111-111111111111";
function request(method = "GET", body?: unknown) { return new Request(`http://localhost/api/spogomi/events/${eventId}/volunteer-help-proposals/review`, body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }

describe("SPOGOMI volunteer help proposal organizer route", () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "organizer-1" });
    enforceRateLimitMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({});
    resolveAccessMock.mockResolvedValue({ capabilities: new Set(["manage"]) });
    hasCapabilityMock.mockReturnValue(true);
    listOrganizerMock.mockResolvedValue([]);
    transitionMock.mockResolvedValue({ id: "proposal-1", status: "accepted" });
  });

  it("requires the event-scoped manage capability", async () => {
    const { GET } = await import("./route");
    hasCapabilityMock.mockReturnValueOnce(false);
    const response = requireResponse(await GET(request(), spogomiEventParams(eventId)));
    expect(response.status).toBe(403);
    expect(listOrganizerMock).not.toHaveBeenCalled();
  });

  it("lists the private organizer projection only after the event authorization check", async () => {
    const { GET } = await import("./route");
    const response = requireResponse(await GET(request(), spogomiEventParams(eventId)));
    expect(response.status).toBe(200);
    expect(resolveAccessMock).toHaveBeenCalledWith({ supabase: {}, eventId, userId: "organizer-1" });
    expect(listOrganizerMock).toHaveBeenCalledWith({}, eventId);
  });

  it("processes a proposal with the authenticated organizer and exact event scope", async () => {
    const { PATCH } = await import("./route");
    const response = requireResponse(await PATCH(request("PATCH", { proposalId: "22222222-2222-4222-8222-222222222222", status: "accepted", decisionNote: "Merci pour votre aide." }), spogomiEventParams(eventId)));
    expect(response.status).toBe(200);
    expect(transitionMock).toHaveBeenCalledWith({ supabase: {}, proposalId: "22222222-2222-4222-8222-222222222222", eventId, targetStatus: "accepted", actorClerkId: "organizer-1", decisionNote: "Merci pour votre aide." });
  });
});
