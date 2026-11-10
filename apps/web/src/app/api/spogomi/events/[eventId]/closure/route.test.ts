import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getCurrentUserActiveRole: vi.fn(),
  loadAuthorizedSpogomiEvent: vi.fn(),
  loadSpogomiClosureSummary: vi.fn(),
  loadSpogomiClosureSnapshot: vi.fn(),
  setSpogomiTeamClosureDecision: vi.fn(),
  transitionSpogomiEvent: vi.fn(),
  handleApiError: vi.fn(() => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess, getCurrentUserActiveRole: mocks.getCurrentUserActiveRole }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/closure-service", () => ({ loadSpogomiClosureSummary: mocks.loadSpogomiClosureSummary, loadSpogomiClosureSnapshot: mocks.loadSpogomiClosureSnapshot, setSpogomiTeamClosureDecision: mocks.setSpogomiTeamClosureDecision, transitionSpogomiEvent: mocks.transitionSpogomiEvent }));
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
    mocks.getCurrentUserActiveRole.mockResolvedValue("admin");
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: { client: true }, authorized: { event: { id: "event-a" } } });
    mocks.loadSpogomiClosureSummary.mockResolvedValue({ fieldCompetition: "finished", blockers: [], action: "pending" });
    mocks.loadSpogomiClosureSnapshot.mockResolvedValue(null);
    mocks.setSpogomiTeamClosureDecision.mockResolvedValue({ id: "decision-a", status: "forfeit" });
    mocks.transitionSpogomiEvent.mockResolvedValue({ already_processed: false, state: "judging" });
  });

  it("reads the private summary only after AuthN and organizer authorization", async () => {
    const response = await route.GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    expect(mocks.loadAuthorizedSpogomiEvent).toHaveBeenCalledWith("event-a", "organizer-a");
    expect(mocks.loadSpogomiClosureSummary).toHaveBeenCalledWith({ supabase: { client: true }, eventId: "event-a" });
    expect(mocks.loadSpogomiClosureSnapshot).toHaveBeenCalledWith({ supabase: { client: true }, eventId: "event-a" });
    expect(response.headers.get("cache-control")).toBe("no-store");

    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: {}, authorized: { response: new Response("Forbidden", { status: 403 }) } });
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(403);
  });

  it("downloads only the persisted private diagnostic after the same authorization", async () => {
    mocks.loadSpogomiClosureSnapshot.mockResolvedValueOnce({
      id: "snapshot-a", eventId: "event-a", eventState: "judging", closedAt: "2026-11-10T10:00:00.000Z",
      actorClerkId: "organizer-a", eventRevision: 5, snapshotVersion: 1, snapshot: { event: { state: "judging" }, anomalies: [] },
    });
    const response = await route.GET(new Request("http://localhost/api/spogomi/events/event-a/closure?format=json"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("spogomi-event-a-closure-diagnostic.json");
    expect(await response.text()).toContain('"state": "judging"');
    expect(mocks.loadSpogomiClosureSummary).not.toHaveBeenCalled();
  });

  it("rejects anonymous access and malformed decisions before any mutation", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    expect((await route.POST(jsonRequest({}), context)).status).toBe(401);
    expect(mocks.setSpogomiTeamClosureDecision).not.toHaveBeenCalled();

    expect((await route.POST(jsonRequest({ action: "decide", teamId: "not-a-uuid" }), context)).status).toBe(400);
    expect(mocks.loadAuthorizedSpogomiEvent).not.toHaveBeenCalled();
  });

  it("does not mutate when the organizer authorization rejects the event", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: {}, authorized: { response: new Response("Forbidden", { status: 403 }) } });
    const response = await route.POST(jsonRequest({
      action: "decide",
      divisionId: "11111111-1111-4111-8111-111111111111",
      teamId: "22222222-2222-4222-8222-222222222222",
      status: "absent",
      sportEligible: false,
      environmentalEligibility: "excluded",
      reason: "Absence constatée.",
      decisionVersion: 1,
    }), context);
    expect(response.status).toBe(403);
    expect(mocks.setSpogomiTeamClosureDecision).not.toHaveBeenCalled();
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

  it("starts and closes only for an admin or max active role with an explicit revision", async () => {
    const start = await route.POST(jsonRequest({ action: "start", expectedRevision: 4 }), context);
    expect(start.status).toBe(200);
    expect(mocks.transitionSpogomiEvent).toHaveBeenCalledWith({ supabase: { client: true }, eventId: "event-a", transition: "start", expectedRevision: 4, actorClerkId: "organizer-a" });

    mocks.getCurrentUserActiveRole.mockResolvedValueOnce("benevole");
    const forbidden = await route.POST(jsonRequest({ action: "close", expectedRevision: 5 }), context);
    expect(forbidden.status).toBe(403);
    expect(mocks.transitionSpogomiEvent).toHaveBeenCalledTimes(1);
  });
});
