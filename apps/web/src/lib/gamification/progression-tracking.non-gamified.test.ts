import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSpotByIdMock = vi.hoisted(() => vi.fn());
const insertProgressionEventMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  fetchActionById: vi.fn(),
  fetchSpotById: fetchSpotByIdMock,
  insertProgressionEvent: insertProgressionEventMock,
  loadUserProgressionStats: vi.fn(),
  syncUserActionProgression: vi.fn(),
}));
vi.mock("./badges/rebuild", () => ({
  rebuildUserGamificationBadges: vi.fn(),
}));
vi.mock("./mohs-impact-reconciliation", () => ({
  reconcileMohsImpactProgression: vi.fn(),
}));
vi.mock("./referrals", () => ({
  awardReferralForUsefulContribution: vi.fn(),
  removeReferralAwardForRejectedContribution: vi.fn(),
}));
vi.mock("@/lib/gamification/announcements", () => ({
  broadcastGamificationAnnouncement: vi.fn(),
}));
vi.mock("@/lib/logging/failure-log", () => ({
  logFailure: vi.fn(),
}));

import {
  trackCommunityOpsUpdate,
  trackRouteRecommendationUse,
  trackSpotValidationBonus,
} from "./progression-tracking";

const supabase = {} as SupabaseClient;

describe("CURRENT non-gamified progression writers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertProgressionEventMock.mockResolvedValue(false);
    fetchSpotByIdMock.mockResolvedValue({
      id: "spot-1",
      created_by_clerk_id: "user-1",
      status: "validated",
    });
  });

  it("keeps the historical spot validation trace at zero XP", async () => {
    await trackSpotValidationBonus(supabase, { spotId: "spot-1" });

    expect(insertProgressionEventMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "spot_validation_bonus",
        xpBase: 0,
        xpAwarded: 0,
      }),
    );
  });

  it("keeps community operation and attendance traces at zero XP", async () => {
    await trackCommunityOpsUpdate(supabase, {
      userId: "user-1",
      eventId: "event-1",
      attendanceCount: 3,
      hasPostMortem: true,
    });

    expect(insertProgressionEventMock).toHaveBeenCalledTimes(2);
    expect(insertProgressionEventMock.mock.calls.map(([, params]) => params)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "community_ops_update",
          xpBase: 0,
          xpAwarded: 0,
        }),
        expect.objectContaining({
          eventType: "collective_attendance_confirmed",
          xpBase: 0,
          xpAwarded: 0,
        }),
      ]),
    );
  });

  it("keeps route recommendation usage at zero XP", async () => {
    await trackRouteRecommendationUse(supabase, {
      userId: "user-1",
      occurredOn: "2026-09-27",
    });

    expect(insertProgressionEventMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "route_recommend_use",
        xpBase: 0,
        xpAwarded: 0,
      }),
    );
  });
});
