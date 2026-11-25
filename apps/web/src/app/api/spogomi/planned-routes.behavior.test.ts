import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(async () => ({ ok: true, userId: "organizer-1" })),
  loadAuthorizedSpogomiEvent: vi.fn(),
  buildManualRouteInput: vi.fn((input: unknown) => input),
  upsertPlannedRoute: vi.fn(async (input: unknown) => ({ input })),
  attachOfficialGpx: vi.fn(async (input: unknown) => ({ input })),
  loadSpogomiRouteByDivision: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/observability/sentry", () => ({ isSentryEnabled: () => false }));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: () => new Response("unauthorized", { status: 401 }) }));
vi.mock("@/lib/http/api-errors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/http/api-errors")>();
  return {
    ...actual,
    handleApiError: vi.fn(actual.handleApiError),
    validationErrorResponse: vi.fn(actual.validationErrorResponse),
  };
});
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorizedSpogomiEvent }));
vi.mock("@/lib/spogomi/preparation/preparation-route-service", () => ({
  buildManualRouteInput: mocks.buildManualRouteInput,
  upsertPlannedRoute: mocks.upsertPlannedRoute,
}));
vi.mock("@/lib/spogomi/preparation-service", () => ({
  attachOfficialGpx: mocks.attachOfficialGpx,
}));
vi.mock("@/lib/spogomi/preparation/route-read-service", () => ({
  loadSpogomiRouteByDivision: mocks.loadSpogomiRouteByDivision,
}));

import { POST as postManualRoute } from "./events/[eventId]/routes/route";
import { POST as postRouteGpx } from "./events/[eventId]/route-gpx/route";
import { POST as postReferenceMedia } from "./events/[eventId]/routes/reference-media/route";

const event = { id: "event-1", action_id: "action-1", composition_revision: 4, state: "draft" };
const context = { params: Promise.resolve({ eventId: "event-1" }) };

function makeGpxFormRequest(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return { formData: async () => form } as unknown as Request;
}

describe("SPOGOMI planned route API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-1" });
  });

  it("persists a manual route only through the division-aware service", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: {}, authorized: { event } });
    const response = await postManualRoute(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ divisionId: null, expectedRevision: 4, coordinates: [[48, 2], [48.1, 2.1]] }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(response.status).toBe(201);
    expect(mocks.upsertPlannedRoute).toHaveBeenCalledWith(expect.objectContaining({ event, userId: "organizer-1", expectedRevision: 4 }));
    expect(mocks.buildManualRouteInput).toHaveBeenCalledWith(expect.objectContaining({ divisionId: null, drawing: { kind: "polyline", coordinates: [[48, 2], [48.1, 2.1]] } }));
  });

  it("rejects stale revisions and invalid coordinates before mutation", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: {}, authorized: { event } });
    const stale = await postManualRoute(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ divisionId: null, expectedRevision: 3, coordinates: [[48, 2], [48.1, 2.1]] }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(stale.status).toBe(409);
    const invalid = await postManualRoute(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ divisionId: null, expectedRevision: 4, coordinates: [[148, 2], [48.1, 2.1]] }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(invalid.status).toBe(422);
    expect(mocks.upsertPlannedRoute).not.toHaveBeenCalled();
  });

  it("requires expectedRevision on GPX upload and rejects stale revisions with 409 before mutation", async () => {
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({ supabase: {}, authorized: { event } });
    const gpxFile = new File(["<gpx />"], "route.gpx", { type: "application/gpx+xml" });

    const missingRevision = await postRouteGpx(makeGpxFormRequest({ file: gpxFile }), context);
    expect(missingRevision.status).toBe(422);

    const staleRevision = await postRouteGpx(makeGpxFormRequest({ file: gpxFile, expectedRevision: "3" }), context);
    expect(staleRevision.status).toBe(409);
    expect(mocks.attachOfficialGpx).not.toHaveBeenCalled();

    const valid = await postRouteGpx(makeGpxFormRequest({ file: gpxFile, expectedRevision: "4" }), context);
    expect(valid.status).toBe(201);
    expect(mocks.attachOfficialGpx).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 4 }));
  });

  it("attaches only ready route_reference media belonging to the event action and rejects report_photo or foreign media", async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", upload_state: "ready" },
      error: null,
    });
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqCalls.push([column, value]);
        return builder;
      },
      maybeSingle,
    };
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase: { from: () => builder },
      authorized: { event },
    });
    mocks.loadSpogomiRouteByDivision.mockResolvedValue({
      id: "route-1",
      division_id: null,
      source: "manual_reference",
      file_name: "Parcours",
      geometry_geojson: { type: "LineString", coordinates: [[2, 48], [2.1, 48.1]] },
      reference_distance_km: 1,
      inferred_topology: "point_to_point",
    });

    const okResponse = await postReferenceMedia(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 4,
          mediaId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(okResponse.status).toBe(201);
    expect(eqCalls).toContainEqual(["purpose", "route_reference"]);
    expect(eqCalls).toContainEqual(["action_id", "action-1"]);

    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const foreignOrWrongPurpose = await postReferenceMedia(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 4,
          mediaId: "22222222-2222-4222-8222-222222222222",
        }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(foreignOrWrongPurpose.status).toBe(422);
    expect(mocks.upsertPlannedRoute).toHaveBeenCalledTimes(1);
  });

  it("rejects non-route_reference media on /routes and maps SQL 40001 conflicts to HTTP 409 across all 3 route endpoints", async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqCalls.push([column, value]);
        return builder;
      },
      maybeSingle,
    };
    mocks.loadAuthorizedSpogomiEvent.mockResolvedValue({
      supabase: { from: () => builder },
      authorized: { event },
    });

    const rejectedBilanMedia = await postManualRoute(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 4,
          referenceMediaId: "33333333-3333-4333-8333-333333333333",
          coordinates: [[48, 2], [48.1, 2.1]],
        }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(rejectedBilanMedia.status).toBe(422);
    expect(eqCalls).toContainEqual(["purpose", "route_reference"]);
    expect(mocks.upsertPlannedRoute).not.toHaveBeenCalled();

    const serializationError = { code: "40001", message: "SPOGOMI event changed since the route preview" };
    mocks.upsertPlannedRoute.mockRejectedValue(serializationError);
    mocks.attachOfficialGpx.mockRejectedValue(serializationError);
    maybeSingle.mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", upload_state: "ready" },
      error: null,
    });
    mocks.loadSpogomiRouteByDivision.mockResolvedValue({
      id: "route-1",
      division_id: null,
      source: "manual_reference",
      file_name: "Parcours",
      geometry_geojson: { type: "LineString", coordinates: [[2, 48], [2.1, 48.1]] },
      reference_distance_km: 1,
      inferred_topology: "point_to_point",
    });

    const manualConflict = await postManualRoute(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ divisionId: null, expectedRevision: 4, coordinates: [[48, 2], [48.1, 2.1]] }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(manualConflict.status).toBe(409);

    const gpxConflict = await postRouteGpx(
      makeGpxFormRequest({
        file: new File(["<gpx />"], "route.gpx", { type: "application/gpx+xml" }),
        expectedRevision: "4",
      }),
      context,
    );
    expect(gpxConflict.status).toBe(409);

    const mediaConflict = await postReferenceMedia(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          divisionId: null,
          expectedRevision: 4,
          mediaId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: { "content-type": "application/json" },
      }),
      context,
    );
    expect(mediaConflict.status).toBe(409);
  });
});
