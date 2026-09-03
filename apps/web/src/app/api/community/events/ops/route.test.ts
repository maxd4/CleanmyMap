import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultCommunityEventOps,
  serializeCommunityEventDescription,
} from "@/lib/community/event-ops";

const authMock = vi.hoisted(() => vi.fn());
const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const trackCommunityOpsUpdateMock = vi.hoisted(() => vi.fn());
const loadCommunityEventRsvpSummariesMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(
  () => vi.fn(() => new Response("database error", { status: 500 })),
);

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/gamification/progression", () => ({
  trackCommunityOpsUpdate: trackCommunityOpsUpdateMock,
}));

vi.mock("@/lib/community/event-rsvp-summaries", () => ({
  loadCommunityEventRsvpSummaries: loadCommunityEventRsvpSummariesMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () =>
    new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
}));

import { POST } from "./route";

function makeEvent(
  organizerClerkId: string,
  ops: Partial<ReturnType<typeof defaultCommunityEventOps>> = {},
) {
  return {
    id: "event-1",
    created_at: "2026-08-26T08:00:00.000Z",
    organizer_clerk_id: organizerClerkId,
    title: "Collecte test",
    event_date: "2026-08-30",
    location_label: "Lyon",
    latitude: null,
    longitude: null,
    location_source: null,
    description: serializeCommunityEventDescription("Description privée", {
      ...defaultCommunityEventOps(),
      ...ops,
    }),
  };
}

function configureSupabase(params: {
  event: ReturnType<typeof makeEvent>;
  updatedEvent?: ReturnType<typeof makeEvent>;
  updateError?: { message: string } | null;
}) {
  const eventLookup = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: params.event, error: null }),
  };
  const updatedQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: params.updatedEvent ?? params.event,
      error: params.updateError ?? null,
    }),
  };
  const table = {
    select: vi.fn().mockReturnValue(eventLookup),
    update: vi.fn().mockReturnValue(updatedQuery),
  };

  getSupabaseServerClientMock.mockReturnValue({
    from: vi.fn().mockReturnValue(table),
  });
  return { table, updatedQuery };
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/community/events/ops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/community/events/ops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "organizer-1" });
    requireAdminAccessMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    trackCommunityOpsUpdateMock.mockResolvedValue(undefined);
    loadCommunityEventRsvpSummariesMock.mockResolvedValue([]);
    configureSupabase({ event: makeEvent("organizer-1") });
  });

  it("keeps the normal organizer path unaudited", async () => {
    const response = await POST(
      makeRequest({ eventId: "event-1", attendanceCount: 3 }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
    expect(trackCommunityOpsUpdateMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "organizer-1", eventId: "event-1" }),
    );
  });

  it("allows an authorized event edit to add explicit coordinates", async () => {
    const { table } = configureSupabase({ event: makeEvent("organizer-1") });

    const response = await POST(
      makeRequest({
        eventId: "event-1",
        location: { latitude: 45.764, longitude: 4.8357, source: "manual" },
      }),
    );

    expect(response.status).toBe(200);
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 45.764,
        longitude: 4.8357,
        location_source: "manual",
      }),
    );
  });

  it("does not audit an admin who is also the event organizer", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "organizer-1" });

    const response = await POST(
      makeRequest({ eventId: "event-1", attendanceCount: 4 }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it.each([undefined, "no"])(
    "rejects a third-party admin override with invalid reason (%s)",
    async (reason) => {
      authMock.mockResolvedValueOnce({ userId: "admin-1" });
      requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
      const { table } = configureSupabase({ event: makeEvent("organizer-1") });

      const response = await POST(
        makeRequest({ eventId: "event-1", attendanceCount: 4, reason }),
      );

      expect(response.status).toBe(400);
      expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
      expect(table.update).not.toHaveBeenCalled();
    },
  );

  it("audits one valid third-party admin override with allowlisted before and after", async () => {
    const previousPostMortem = "Initial post mortem suffisamment détaillé";
    const nextPostMortem = "Correction administrative documentée";
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
    configureSupabase({
      event: makeEvent("organizer-1", {
        capacityTarget: 10,
        attendanceCount: 4,
        postMortem: previousPostMortem,
      }),
      updatedEvent: makeEvent("organizer-1", {
        capacityTarget: 20,
        attendanceCount: 7,
        postMortem: nextPostMortem,
      }),
    });

    const response = await POST(
      makeRequest({
        eventId: "event-1",
        capacityTarget: 20,
        attendanceCount: 7,
        postMortem: nextPostMortem,
        reason: "Correction administrative",
      }),
    );

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        targetId: "event-1",
        operationType: "admin_operation",
        outcome: "success",
        details: {
          operation: "update_community_event_ops_admin_override",
          targetUserId: "organizer-1",
          reason: "Correction administrative",
          previousValue: {
            capacityTarget: 10,
            attendanceCount: 4,
            postMortemPresent: true,
            postMortemLength: previousPostMortem.length,
          },
          newValue: {
            capacityTarget: 20,
            attendanceCount: 7,
            postMortemPresent: true,
            postMortemLength: nextPostMortem.length,
          },
        },
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      previousPostMortem,
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      nextPostMortem,
    );
  });

  it("audits an admin event update failure without copying the database error", async () => {
    authMock.mockResolvedValueOnce({ userId: "admin-1" });
    requireAdminAccessMock.mockResolvedValueOnce({ ok: true, userId: "admin-1" });
    configureSupabase({
      event: makeEvent("organizer-1", { capacityTarget: 10, attendanceCount: 4 }),
      updatedEvent: makeEvent("organizer-1", { capacityTarget: 20, attendanceCount: 7 }),
      updateError: { message: "sensitive Supabase error" },
    });

    const response = await POST(
      makeRequest({
        eventId: "event-1",
        capacityTarget: 20,
        attendanceCount: 7,
        reason: "Correction administrative",
      }),
    );

    expect(response.status).toBe(500);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        actorUserId: "admin-1",
        targetId: "event-1",
        details: expect.objectContaining({
          operation: "update_community_event_ops_admin_override",
          targetUserId: "organizer-1",
          stage: "event_update",
          previousValue: expect.objectContaining({ capacityTarget: 10 }),
          newValue: expect.objectContaining({ capacityTarget: 20 }),
        }),
      }),
    );
    expect(JSON.stringify(appendAdminOperationAuditMock.mock.calls[0]?.[0])).not.toContain(
      "sensitive Supabase error",
    );
  });

  it("keeps the existing unauthorized path unchanged", async () => {
    authMock.mockResolvedValueOnce({ userId: "other-user" });
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    configureSupabase({ event: makeEvent("organizer-1") });

    const response = await POST(
      makeRequest({ eventId: "event-1", attendanceCount: 4 }),
    );

    expect(response.status).toBe(403);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });
});
