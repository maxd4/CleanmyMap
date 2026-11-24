import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  enforceServerRateLimitForAuthenticatedUser: vi.fn(),
  loadAuthorizedSpogomiEvent: vi.fn(),
  assignSpogomiTeamReferee: vi.fn(),
  revokeSpogomiTeamReferee: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: mocks.requireAuthenticatedAccess,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimitForAuthenticatedUser: mocks.enforceServerRateLimitForAuthenticatedUser,
}));
vi.mock("@/lib/spogomi/route-auth", () => ({
  loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent,
}));
vi.mock("@/lib/spogomi/team-referee-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/spogomi/team-referee-service")>(
    "@/lib/spogomi/team-referee-service",
  );
  return {
    ...actual,
    assignSpogomiTeamReferee: mocks.assignSpogomiTeamReferee,
    revokeSpogomiTeamReferee: mocks.revokeSpogomiTeamReferee,
  };
});

import { DELETE, POST } from "./route";
import { SpogomiTeamRefereeError } from "@/lib/spogomi/team-referee-service";

const eventId = "11111111-1111-4111-8111-111111111111";
const divisionId = "22222222-2222-4222-8222-222222222222";
const teamId = "33333333-3333-4333-8333-333333333333";

describe("SPOGOMI team-referees API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "org-1" });
    mocks.enforceServerRateLimitForAuthenticatedUser.mockResolvedValue(null);
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase: {},
      authorized: { event: { id: eventId } },
    });
  });

  it("rejects unauthenticated requests with 401", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false });
    const response = await POST(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", { method: "POST" }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects unauthorized actors with 403", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase: {},
      authorized: { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) },
    });
    const response = await POST(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", {
        method: "POST",
        body: JSON.stringify({ divisionId, teamId, refereeClerkId: "user_ref_1" }),
      }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(response.status).toBe(403);
  });

  it("maps duplicate referee conflict to 409 and non-habilitated to 403", async () => {
    mocks.assignSpogomiTeamReferee.mockRejectedValueOnce(
      new SpogomiTeamRefereeError("Déjà affecté", "conflict"),
    );
    const conflictRes = await POST(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", {
        method: "POST",
        body: JSON.stringify({ divisionId, teamId, refereeClerkId: "user_ref_1" }),
      }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(conflictRes.status).toBe(409);

    mocks.assignSpogomiTeamReferee.mockRejectedValueOnce(
      new SpogomiTeamRefereeError("Non habilité", "forbidden"),
    );
    const forbiddenRes = await POST(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", {
        method: "POST",
        body: JSON.stringify({ divisionId, teamId, refereeClerkId: "user_ref_2" }),
      }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(forbiddenRes.status).toBe(403);
  });

  it("assigns and revokes a team referee for an authorized organizer", async () => {
    mocks.assignSpogomiTeamReferee.mockResolvedValue({ status: "assigned" });
    const postRes = await POST(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", {
        method: "POST",
        body: JSON.stringify({ divisionId, teamId, refereeClerkId: "user_ref_1" }),
      }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(postRes.status).toBe(200);
    expect(mocks.assignSpogomiTeamReferee).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, divisionId, teamId, refereeClerkId: "user_ref_1", actorClerkId: "org-1" }),
    );

    mocks.revokeSpogomiTeamReferee.mockResolvedValue({ revoked: true, status: "to_assign" });
    const delRes = await DELETE(
      new Request("http://localhost/api/spogomi/events/e1/team-referees", {
        method: "DELETE",
        body: JSON.stringify({ divisionId, teamId, reason: "Remplacement" }),
      }),
      { params: Promise.resolve({ eventId }) },
    );
    expect(delRes.status).toBe(200);
    expect(mocks.revokeSpogomiTeamReferee).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, divisionId, teamId, actorClerkId: "org-1", reason: "Remplacement" }),
    );
  });
});
