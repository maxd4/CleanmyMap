import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  loadAuthorizedSpogomiEvent: vi.fn(),
  loadSpogomiResultsProjection: vi.fn(),
  getSpogomiDivisionProjections: vi.fn(),
  rpc: vi.fn(),
  handleApiError: vi.fn(() => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/results-projection-service", () => ({ loadSpogomiResultsProjection: mocks.loadSpogomiResultsProjection }));
vi.mock("@/lib/spogomi/results-projection", () => ({ getSpogomiDivisionProjections: mocks.getSpogomiDivisionProjections }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: mocks.handleApiError }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) }));

import * as route from "./route";

const context = { params: Promise.resolve({ eventId: "event-a" }) };
const snapshot = { event: { id: "event-a" }, categories: [], teams: [], submissions: [], items: [], participants: [] };

function divisionProjection(divisionId: string, teamId: string) {
  return {
    event: { id: "event-a", divisions: [{ id: divisionId, division_type: divisionId === "division-casual" ? "casual" : "world_cup" }] },
    regulation: { version: `rules-${divisionId}`, categories: [], tiebreakers: ["sporting_score"] },
    publicationSourceSnapshot: { ...snapshot, divisions: [{ id: divisionId, type: divisionId === "division-casual" ? "casual" : "world_cup" }] },
    teams: [{ teamId, divisionId, teamNumber: 1, submissionVersion: 1, presentParticipants: 1, submissionStatus: "certified", sportEligible: true, closureStatus: "present_measured" }],
    results: {
      regulationComplete: true,
      sport: { entries: [{ teamId, rank: 1, eligible: true }] },
      butts: { entries: [{ teamId, rank: 1, eligible: true }] },
    },
  };
}

describe("SPOGOMI official rankings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-a" });
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    const supabase = { rpc: mocks.rpc };
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase,
      authorized: { event: { id: "event-a", state: "certified", divisions: [{ id: "division-casual" }, { id: "division-world" }] } },
    });
    mocks.loadSpogomiResultsProjection.mockResolvedValue({ teams: [{ sportEligible: true, submissionStatus: "certified" }] });
    mocks.getSpogomiDivisionProjections.mockReturnValue([]);
  });

  it("stops before the privileged projection or RPC for anonymous and unauthorized callers", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false, status: 401 });
    expect((await route.POST(new Request("http://localhost"), context)).status).toBe(401);
    expect(mocks.loadAuthorizedSpogomiEvent).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();

    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: { rpc: mocks.rpc }, authorized: { response: new Response("Forbidden", { status: 403 }) } });
    expect((await route.POST(new Request("http://localhost"), context)).status).toBe(403);
    expect(mocks.loadSpogomiResultsProjection).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses an uncertified event or incomplete team set before any publication RPC", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: { rpc: mocks.rpc }, authorized: { event: { id: "event-a", state: "judging" } } });
    expect((await route.POST(new Request("http://localhost"), context)).status).toBe(409);
    expect(mocks.loadSpogomiResultsProjection).not.toHaveBeenCalled();

    mocks.loadAuthorizedSpogomiEvent.mockResolvedValueOnce({ supabase: { rpc: mocks.rpc }, authorized: { event: { id: "event-a", state: "certified", divisions: [{ id: "division-casual" }] } } });
    mocks.loadSpogomiResultsProjection.mockResolvedValueOnce({ teams: [{ sportEligible: true, submissionStatus: "submitted" }] });
    expect((await route.POST(new Request("http://localhost"), context)).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("publishes each mixed division from its own source snapshot and preserves the actor boundary", async () => {
    const casual = divisionProjection("division-casual", "team-casual");
    const world = divisionProjection("division-world", "team-world");
    mocks.loadSpogomiResultsProjection.mockResolvedValueOnce({ teams: [...casual.teams, ...world.teams] });
    mocks.getSpogomiDivisionProjections.mockReturnValue([casual, world]);

    const response = await route.POST(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "published", rankings: 4, divisions: [{ divisionId: "division-casual" }, { divisionId: "division-world" }] });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "publish_spogomi_official_rankings_for_division_checked_closure", expect.objectContaining({ p_event_id: "event-a", p_division_id: "division-casual", p_actor_clerk_id: "organizer-a", p_source_snapshot: casual.publicationSourceSnapshot }));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "publish_spogomi_official_rankings_for_division_checked_closure", expect.objectContaining({ p_event_id: "event-a", p_division_id: "division-world", p_actor_clerk_id: "organizer-a", p_source_snapshot: world.publicationSourceSnapshot }));
  });

  it("does not claim publication when the checked-closure RPC rejects a stale source", async () => {
    const casual = divisionProjection("division-casual", "team-casual");
    mocks.loadSpogomiResultsProjection.mockResolvedValueOnce({ teams: casual.teams });
    mocks.getSpogomiDivisionProjections.mockReturnValue([casual]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "stale source" } });

    expect((await route.POST(new Request("http://localhost"), context)).status).toBe(500);
    expect(mocks.handleApiError).toHaveBeenCalledWith(expect.objectContaining({ code: "40001" }), "spogomi.rankings.publish");
  });
});
