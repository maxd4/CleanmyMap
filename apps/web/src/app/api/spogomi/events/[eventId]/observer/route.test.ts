import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  loadSpogomiObserverProjection: vi.fn(),
  handleApiError: vi.fn(() => new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/spogomi/observer-projection", () => ({ loadSpogomiObserverProjection: mocks.loadSpogomiObserverProjection }));
vi.mock("@/lib/http/api-errors", () => ({ handleApiError: mocks.handleApiError }));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
  forbiddenJsonResponse: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
}));

import * as route from "./route";

const context = { params: Promise.resolve({ eventId: "event-a" }) };

describe("SPOGOMI observer projection route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupabaseServerClient.mockReturnValue({});
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "observer-a" });
    mocks.loadSpogomiObserverProjection.mockResolvedValue({
      event: { id: "event-a", name: "SPOGOMI", eventSlug: "spogomi-a", mode: "casual", state: "draft", startsAt: "2026-01-01", endsAt: null, publicVisibility: "private", publicResultsVisibility: "hidden" },
      divisions: [],
      teams: [{ id: "team-a", divisionId: null, teamNumber: 1, publicName: "Alpha", compositionState: "locked", submissionStatus: "submitted", submissionVersion: 1, submittedAt: "2026-01-01", certified: false }],
      participation: { registered: 3, present: 2 },
    });
  });

  it("refuses anonymous and revoked observers", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(401);

    mocks.loadSpogomiObserverProjection.mockResolvedValueOnce(false);
    expect((await route.GET(new Request("http://localhost"), context)).status).toBe(403);
  });

  it("returns only the operational projection and has no mutation handler", async () => {
    const response = await route.GET(new Request("http://localhost"), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.projection.teams[0]).not.toHaveProperty("displayName");
    expect(body.projection.teams[0]).toMatchObject({ publicName: "Alpha", submissionStatus: "submitted" });
    expect(route).not.toHaveProperty("POST");
    expect(route).not.toHaveProperty("PATCH");
    expect(route).not.toHaveProperty("DELETE");
  });
});
