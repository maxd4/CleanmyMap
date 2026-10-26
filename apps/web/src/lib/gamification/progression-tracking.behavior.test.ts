import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMock = vi.hoisted(() => vi.fn());
const spotMock = vi.hoisted(() => vi.fn());
const insertEventMock = vi.hoisted(() => vi.fn());
const statsMock = vi.hoisted(() => vi.fn());
const syncActionMock = vi.hoisted(() => vi.fn());
const organizerIdsMock = vi.hoisted(() => vi.fn());
const rebuildBadgesMock = vi.hoisted(() => vi.fn());
const reconcileImpactMock = vi.hoisted(() => vi.fn());
const logFailureMock = vi.hoisted(() => vi.fn());
const awardReferralMock = vi.hoisted(() => vi.fn());
const removeReferralMock = vi.hoisted(() => vi.fn());
const persistProfileMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  fetchActionById: actionMock,
  fetchSpotById: spotMock,
  insertProgressionEvent: insertEventMock,
  loadUserProgressionStats: statsMock,
  syncUserActionProgression: syncActionMock,
}));
vi.mock("@/lib/actions/participation/organizers", () => ({
  loadCanonicalActionOrganizerIdsForAction: organizerIdsMock,
}));
vi.mock("./badges/rebuild", () => ({ rebuildUserGamificationBadges: rebuildBadgesMock }));
vi.mock("./mohs-impact-reconciliation", () => ({ reconcileMohsImpactProgression: reconcileImpactMock }));
vi.mock("@/lib/logging/failure-log", () => ({ logFailure: logFailureMock }));
vi.mock("./referrals/referrals", () => ({
  awardReferralForUsefulContribution: awardReferralMock,
  removeReferralAwardForRejectedContribution: removeReferralMock,
}));
vi.mock("./progression-profile-refresh", () => ({
  ProgressionProfileConflictError: class ProgressionProfileConflictError extends Error {},
  persistProgressionProfileRefresh: persistProfileMock,
}));

import {
  extractCommunityOpsFromDescription,
  refreshProgressionProfile,
  trackActionCreated,
  trackActionRejection,
  trackActionValidationBonus,
  trackCommunityOpsUpdate,
  trackCommunityRsvpYes,
  trackNewPlaceVisited,
  trackRouteRecommendationUse,
  trackSpotCreated,
  trackSpotValidationBonus,
} from "./progression-tracking";

function createRefreshSupabase() {
  const events = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
  };
  events.select.mockReturnValue(events);
  events.eq.mockReturnValue(events);
  events.limit.mockResolvedValue({ data: [], error: null });
  return { from: vi.fn(() => events) } as unknown as SupabaseClient;
}

const supabase = createRefreshSupabase();

function createVisitedPlaceSupabase(params: {
  insertError?: { code: string; message: string } | null;
  count?: number | null;
}) {
  const insert = vi.fn().mockResolvedValue({ error: params.insertError ?? null });
  const countQuery = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  countQuery.select.mockReturnValue(countQuery);
  countQuery.eq.mockResolvedValue({ count: params.count ?? null, error: null });
  const eventsQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  eventsQuery.select.mockReturnValue(eventsQuery);
  eventsQuery.eq.mockReturnValue(eventsQuery);
  return {
    from: vi.fn((table: string) => table === "user_visited_places"
      ? { insert, ...countQuery }
      : eventsQuery),
    insert,
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  actionMock.mockResolvedValue(null);
  spotMock.mockResolvedValue(null);
  insertEventMock.mockResolvedValue(false);
  statsMock.mockResolvedValue({});
  organizerIdsMock.mockResolvedValue([]);
  reconcileImpactMock.mockResolvedValue(undefined);
  persistProfileMock.mockResolvedValue(undefined);
});

describe("progression tracking behavioral boundaries", () => {
  it("does not project absent or non-transitioning actions, and awards/removes referrals only on their status", async () => {
    await trackActionCreated(supabase, { userId: "user-1", actionId: "missing" });
    await trackActionValidationBonus(supabase, { actionId: "missing" });
    await trackActionRejection(supabase, { actionId: "missing" });
    expect(organizerIdsMock).not.toHaveBeenCalled();

    actionMock.mockResolvedValueOnce({ id: "action-pending", status: "pending" });
    await trackActionValidationBonus(supabase, { actionId: "action-pending" });
    actionMock.mockResolvedValueOnce({ id: "action-rejected", status: "rejected" });
    await trackActionRejection(supabase, { actionId: "action-rejected" });
    expect(organizerIdsMock).toHaveBeenCalledWith(supabase, "action-rejected");

    organizerIdsMock.mockResolvedValue(["organizer-1", "organizer-2"]);
    actionMock.mockResolvedValueOnce({ id: "action-approved", status: "approved", action_date: "2026-10-01" });
    await trackActionValidationBonus(supabase, { actionId: "action-approved" });
    expect(awardReferralMock).toHaveBeenCalledTimes(2);

    actionMock.mockResolvedValueOnce({ id: "action-rejected", status: "rejected" });
    await trackActionRejection(supabase, { actionId: "action-rejected" });
    expect(removeReferralMock).toHaveBeenCalledTimes(2);
  });

  it("writes spot and RSVP traces only when their source exists, preserving idempotent insert behavior", async () => {
    await trackSpotCreated(supabase, { userId: "user-1", spotId: "missing" });
    await trackSpotValidationBonus(supabase, { spotId: "missing" });

    spotMock.mockResolvedValue({ id: "spot-1", label: "Parc", created_at: "2026-10-01T10:00:00Z", status: "pending", created_by_clerk_id: "user-1" });
    await trackSpotCreated(supabase, { userId: "user-1", spotId: "spot-1" });
    await trackSpotValidationBonus(supabase, { spotId: "spot-1" });
    expect(insertEventMock).toHaveBeenCalledWith(supabase, expect.objectContaining({ eventType: "spot_create_pending" }));

    spotMock.mockResolvedValue({ id: "spot-1", created_by_clerk_id: "user-1", status: "validated" });
    insertEventMock.mockResolvedValueOnce(true);
    await trackSpotValidationBonus(supabase, { spotId: "spot-1" });
    expect(rebuildBadgesMock).toHaveBeenCalledWith(supabase, "user-1");

    await trackCommunityRsvpYes(supabase, { userId: "user-1", eventId: "event-1" });
    expect(insertEventMock).toHaveBeenCalledWith(supabase, expect.objectContaining({ eventType: "collective_rsvp_yes_pending" }));
  });

  it("covers community operation branches without creating a projection for an empty update", async () => {
    await trackCommunityOpsUpdate(supabase, {
      userId: "user-1", eventId: "event-empty", attendanceCount: 0, hasPostMortem: false,
    });
    expect(insertEventMock).not.toHaveBeenCalled();

    insertEventMock.mockResolvedValue(true);
    await trackCommunityOpsUpdate(supabase, {
      userId: "user-1", eventId: "event-full", attendanceCount: 2, hasPostMortem: true,
      occurredOn: "2026-10-02",
    });
    expect(insertEventMock).toHaveBeenCalledTimes(2);
    expect(persistProfileMock).toHaveBeenCalled();
  });

  it("keeps route and profile refreshes idempotent when the event writer reports a duplicate", async () => {
    await trackRouteRecommendationUse(supabase, { userId: "user-1" });
    expect(insertEventMock).toHaveBeenCalledWith(supabase, expect.objectContaining({ eventType: "route_recommend_use" }));

    insertEventMock.mockResolvedValue(true);
    await trackRouteRecommendationUse(supabase, { userId: "user-1", occurredOn: "2026-10-03" });
    expect(persistProfileMock).toHaveBeenCalled();

    const reconcileCallsBefore = reconcileImpactMock.mock.calls.length;
    await refreshProgressionProfile(supabase, "user-1", { reconcileLegacyImpact: false, reconciliationId: "reconcile-1" });
    expect(reconcileImpactMock).toHaveBeenCalledTimes(reconcileCallsBefore);
    expect(persistProfileMock).toHaveBeenCalledWith(
      supabase,
      "user-1",
      [],
      {},
      { reconciliationId: "reconcile-1" },
    );
  });

  it("normalizes community descriptions and never invents attendance or post-mortem evidence", () => {
    expect(extractCommunityOpsFromDescription(null)).toEqual({ hasPostMortem: false, attendanceCount: 0 });
    expect(extractCommunityOpsFromDescription("not a structured event")).toEqual({ hasPostMortem: false, attendanceCount: 0 });
  });

  it("handles visited-place insert outcomes, milestone boundaries and operational failures", async () => {
    await trackNewPlaceVisited(supabase, { userId: "user-1", locationLabel: "   " });
    expect(insertEventMock).not.toHaveBeenCalled();

    const duplicate = createVisitedPlaceSupabase({ insertError: { code: "23505", message: "duplicate" } });
    await trackNewPlaceVisited(duplicate, { userId: "user-1", locationLabel: "  Paris  " });
    expect(logFailureMock).not.toHaveBeenCalled();

    const broken = createVisitedPlaceSupabase({ insertError: { code: "XX000", message: "database" } });
    await trackNewPlaceVisited(broken, { userId: "user-1", locationLabel: "Lyon" });
    expect(logFailureMock).toHaveBeenCalled();

    insertEventMock.mockResolvedValue(false);
    const ordinary = createVisitedPlaceSupabase({ count: 4 });
    await trackNewPlaceVisited(ordinary, { userId: "user-1", locationLabel: "  Lille ", occurredOn: "2026-10-04" });
    expect(insertEventMock).toHaveBeenCalledWith(ordinary, expect.objectContaining({ eventType: "new_place_discovered", sourceId: "user-1:lille" }));

    insertEventMock.mockResolvedValue(true);
    const milestone = createVisitedPlaceSupabase({ count: 5 });
    await trackNewPlaceVisited(milestone, { userId: "user-1", locationLabel: "Rouen" });
    expect(insertEventMock).toHaveBeenCalledWith(milestone, expect.objectContaining({ eventType: "new_place_milestone" }));
    expect(rebuildBadgesMock).toHaveBeenCalledWith(milestone, "user-1");
  });
});
