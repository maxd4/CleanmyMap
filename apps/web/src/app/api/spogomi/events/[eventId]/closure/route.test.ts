import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  loadAuthorizedSpogomiEvent: vi.fn(),
  loadSpogomiClosureSummary: vi.fn(),
  setSpogomiTeamClosureDecision: vi.fn(),
  handleApiError: vi.fn(() => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/closure-service", () => ({ loadSpogomiClosureSummary: mocks.loadSpogomiClosureSummary, setSpogomiTeamClosureDecision: mocks.setSpogomiTeamClosureDecision }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: mocks.handleApiError,
  validationErrorResponse: () => new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 }),
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));

import * as route from "./route";

const context = { params: Promise.resolve({ eventId: "event-a" }) };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/spogomi/events/event-a/closure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("SPOGOMI closure route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-a" });
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: { client: true }, authorized: { event: { id: "event-a" } } });
    mocks.loadSpogomiClosureSummary.mockResolvedValue({ fieldCompetition: "finished", blockers: [], action: "pending" });
    mocks.setSpogomiTeamClosureDecision.mockResolvedValue({ id: "decision-a", status: "forfeit" });
  });

  it("reads the private summary only after AuthN and organizer authorization", async () => {
    const response = await route.GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    expect(mocks.loadAuthorizedSpogomiEvent).toHaveBeenCalledWith("event-a", "organizer-a");
    expect(mocks.loadSpogomiClosureSummary).toHaveBeenCalledWith({ supabase: { client: true }, eventId: "event-a" });
    expect(response.headers.get("cache-control")).toBe("no-store");

    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: {}, authorized: { response: new Response("Forbidden", { status: 403 }) } });
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(403);
  });

  it("rejects anonymous access and malformed decisions before any mutation", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    expect((await route.POST(jsonRequest({}), context)).status).toBe(401);
    expect(mocks.setSpogomiTeamClosureDecision).not.toHaveBeenCalled();

    expect((await route.POST(jsonRequest({ action: "decide", teamId: "not-a-uuid" }), context)).status).toBe(400);
    expect(mocks.loadAuthorizedSpogomiEvent).not.toHaveBeenCalled();
  });

  it("records a scoped decision without granting any implicit certification", async () => {
    const decision = {
      action: "decide",
      divisionId: "11111111-1111-4111-8111-111111111111",
      teamId: "22222222-2222-4222-8222-222222222222",
      status: "forfeit",
      sportEligible: false,
      environmentalEligibility: "excluded",
      reason: "Équipe absente au contrôle de départ.",
      decisionVersion: 2,
    } as const;
    const response = await route.POST(jsonRequest(decision), context);
    expect(response.status).toBe(200);
    expect(mocks.setSpogomiTeamClosureDecision).toHaveBeenCalledWith({
      supabase: { client: true },
      eventId: "event-a",
      ...decision,
      actorClerkId: "organizer-a",
    });
  });
});
