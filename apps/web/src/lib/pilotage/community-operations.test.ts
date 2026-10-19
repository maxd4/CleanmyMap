import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";

const mocks = vi.hoisted(() => ({
  loadCachedPilotageCommunityEvents: vi.fn(),
}));

vi.mock("@/lib/community/report-events", () => ({
  loadCachedPilotageCommunityEvents: mocks.loadCachedPilotageCommunityEvents,
}));

import { loadPilotageCommunityOperations } from "./community-operations";

const NOW = new Date("2026-10-19T08:00:00.000Z");

const makeEvent = (partial: Partial<CommunityEventItem>): CommunityEventItem => ({
  id: "event-default",
  createdAt: "2026-10-01T09:00:00.000Z",
  organizerClerkId: "external-user",
  canEditOwnOps: false,
  title: "Collecte",
  eventDate: "2026-10-20",
  locationLabel: "Paris 1er",
  location: { label: "Paris 1er", latitude: null, longitude: null, source: null },
  description: null,
  capacityTarget: 20,
  attendanceCount: 5,
  postMortem: null,
  cleanupObjective: null,
  cleanupZone: null,
  cleanupLogisticsNeeds: null,
  cleanupSupportLevel: null,
  cleanupWasteTypesExpected: [],
  rsvpCounts: { yes: 5, maybe: 0, no: 0, total: 5 },
  myRsvpStatus: null,
  ...partial,
});

describe("pilotage community operations scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps only events organized by the user or linked to an authorized action", async () => {
    mocks.loadCachedPilotageCommunityEvents.mockResolvedValue({
      items: [
        makeEvent({ id: "event-owned", organizerClerkId: "user-a" }),
        makeEvent({ id: "event-linked", organizerClerkId: "user-b", eventDate: "2026-10-10" }),
      ],
      availability: "available",
    });
    const linkedAction = buildActionDataContract({
      id: "action-linked",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-10-10",
      locationLabel: "Paris 1er",
      latitude: 48.85,
      longitude: 2.35,
      notes: "[EVENT_REF]event-linked",
    });

    const result = await loadPilotageCommunityOperations([linkedAction], "user-a", NOW);

    expect(result.staffingPlan.rows.map((row) => row.eventId)).toEqual(["event-owned"]);
    expect(result.postEventLoop.rows.map((row) => row.event.id)).toEqual(["event-linked"]);
    expect(result.postEventLoop.rows.map((row) => row.event.id)).not.toContain("event-external");
    expect(mocks.loadCachedPilotageCommunityEvents).toHaveBeenCalledWith(
      "user-a",
      ["event-linked"],
      120,
    );
  });

  it("does not fall back to the global corpus when the authorized action corpus is empty", async () => {
    mocks.loadCachedPilotageCommunityEvents.mockResolvedValue({
      items: [],
      availability: "available",
    });

    const result = await loadPilotageCommunityOperations([], "user-a", NOW);

    expect(result.staffingPlan.rows).toEqual([]);
    expect(result.reminders).toEqual([]);
    expect(result.postEventLoop.rows).toEqual([]);
  });

  it("keeps organizer-owned events when the action corpus is empty", async () => {
    mocks.loadCachedPilotageCommunityEvents.mockResolvedValue({
      items: [makeEvent({ id: "event-owned", organizerClerkId: "user-a" })],
      availability: "available",
    });

    const result = await loadPilotageCommunityOperations([], "user-a", NOW);

    expect(result.staffingPlan.rows.map((row) => row.eventId)).toEqual(["event-owned"]);
    expect(mocks.loadCachedPilotageCommunityEvents).toHaveBeenCalledWith("user-a", [], 120);
  });

  it("propagates partial scoped coverage without treating it as an empty result", async () => {
    mocks.loadCachedPilotageCommunityEvents.mockResolvedValue({
      items: [makeEvent({ id: "event-owned", organizerClerkId: "user-a" })],
      availability: "partial",
    });

    const result = await loadPilotageCommunityOperations([], "user-a", NOW);

    expect(result.availability).toBe("partial");
    expect(result.staffingPlan.rows).toHaveLength(1);
    expect(result.postEventLoop.completionRate).toBeNull();
  });
});
