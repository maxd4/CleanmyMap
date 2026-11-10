import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(async () => ({ ok: true, userId: "organizer-1" })),
  loadAuthorizedSpogomiEvent: vi.fn(),
  buildManualRouteInput: vi.fn((input: unknown) => input),
  upsertPlannedRoute: vi.fn(async (input: unknown) => ({ input })),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: () => new Response("unauthorized", { status: 401 }) }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn(() => new Response("error", { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("invalid", { status: 422 })),
}));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/preparation/preparation-route-service", () => ({ buildManualRouteInput: mocks.buildManualRouteInput, upsertPlannedRoute: mocks.upsertPlannedRoute }));

import { POST } from "./events/[eventId]/routes/route";

const event = { id: "event-1", action_id: "action-1", composition_revision: 4, state: "draft" };

describe("SPOGOMI planned route API", () => {
  it("persists a manual route only through the division-aware service", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: {}, authorized: { event } });
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ divisionId: null, expectedRevision: 4, coordinates: [[48, 2], [48.1, 2.1]] }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(response.status).toBe(201);
    expect(mocks.upsertPlannedRoute).toHaveBeenCalledWith(expect.objectContaining({ event, userId: "organizer-1" }));
    expect(mocks.buildManualRouteInput).toHaveBeenCalledWith(expect.objectContaining({ divisionId: null, drawing: { kind: "polyline", coordinates: [[48, 2], [48.1, 2.1]] } }));
  });

  it("rejects stale revisions and invalid coordinates before mutation", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: {}, authorized: { event } });
    const stale = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ divisionId: null, expectedRevision: 3, coordinates: [[48, 2], [48.1, 2.1]] }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(stale.status).toBe(409);
    const invalid = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ divisionId: null, expectedRevision: 4, coordinates: [[148, 2], [48.1, 2.1]] }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ eventId: "event-1" }) });
    expect(invalid.status).toBe(422);
    expect(mocks.upsertPlannedRoute).toHaveBeenCalledTimes(1);
  });
});
