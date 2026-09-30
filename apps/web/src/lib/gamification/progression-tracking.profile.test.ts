import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, expect, it, vi } from "vitest";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "./progression-types";

const loadUserProgressionStatsMock = vi.hoisted(() => vi.fn());
const broadcastGamificationAnnouncementMock = vi.hoisted(() => vi.fn());
const logFailureMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  fetchActionById: vi.fn(),
  fetchSpotById: vi.fn(),
  insertProgressionEvent: vi.fn(),
  loadUserProgressionStats: loadUserProgressionStatsMock,
  syncUserActionProgression: vi.fn(),
}));

vi.mock("@/lib/actions/participation/group-participation-read", () => ({
  loadConfirmedParticipantImpactAttributions: vi.fn(async () => []),
}));
vi.mock("@/lib/gamification/announcements", () => ({
  broadcastGamificationAnnouncement: broadcastGamificationAnnouncementMock,
}));
vi.mock("@/lib/logging/failure-log", () => ({
  logFailure: logFailureMock,
}));

import { refreshProgressionProfile } from "./progression-tracking";

beforeEach(() => {
  vi.clearAllMocks();
});

function createLevelRefreshSupabase(params: {
  previousLevel: number;
  events: Array<{ status_phase: "pending" | "validated"; xp_awarded: number }>;
  notificationFailure?: Error;
}) {
  const profileUpsert = vi.fn(async (row: Record<string, unknown>) => ({
    data: row,
    error: null,
  }));
  const notificationInsert = vi.fn(async () => {
    if (params.notificationFailure) {
      throw params.notificationFailure;
    }
    return { error: null };
  });
  const progressionEventsChain = {
    select: vi.fn(() => progressionEventsChain),
    eq: vi.fn(() => progressionEventsChain),
    limit: vi.fn(async () => ({
      data: params.events,
      error: null,
    })),
  };
  const progressionProfilesChain = {
    select: vi.fn(() => progressionProfilesChain),
    eq: vi.fn(() => progressionProfilesChain),
    maybeSingle: vi.fn(async () => ({
      data: { current_level: params.previousLevel },
      error: null,
    })),
  };
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "progression_events") return progressionEventsChain;
      if (table === "progression_profiles") {
        return {
          ...progressionProfilesChain,
          upsert: profileUpsert,
        };
      }
      if (table === "app_notifications") {
        return { insert: notificationInsert };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { profileUpsert, notificationInsert, supabase };
}

function completeLevelSixStats() {
  return {
    totalActions: 9,
    approvedActions: 9,
    validatedActions: 9,
    verifiedContributions: 9,
    verifiedContributionFamilies: ["organisation"],
    qualityAverage: 70,
    validationRatio: 0.6,
    diversityTypes: 2,
    collectiveEvents: 1,
    totalKg: 0,
    wasteKnownActions: 0,
    wasteCoverageRate: 0,
    totalButts: 0,
  };
}

it("includes action balance XP in the validated profile total", async () => {
  loadUserProgressionStatsMock.mockResolvedValue({
    totalActions: 6,
    approvedActions: 6,
    validatedActions: 6,
    verifiedContributions: 6,
    verifiedContributionFamilies: ["organisation"],
    qualityAverage: 80,
    validationRatio: 1,
    diversityTypes: 3,
    collectiveEvents: 0,
    totalKg: 6,
    wasteKnownActions: 6,
    wasteCoverageRate: 100,
    totalButts: 60,
  });

  const { profileUpsert, supabase } = createLevelRefreshSupabase({
    previousLevel: 1,
    events: [
      { status_phase: "validated", xp_awarded: 1 },
      { status_phase: "validated", xp_awarded: 2 },
    ],
  });

  await refreshProgressionProfile(supabase, "user-1");

  expect(profileUpsert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: "user-1",
      xp_total: 3,
      xp_pending: 0,
      xp_validated: 3,
      current_applied_rules_revision: CURRENT_GAMIFICATION_RULES_REVISION,
    }),
    { onConflict: "user_id" },
  );
});

it("counts validated participant tiers in validated XP", async () => {
  loadUserProgressionStatsMock.mockResolvedValue({
    totalActions: 0,
    approvedActions: 0,
    validatedActions: 0,
    verifiedContributions: 0,
    verifiedContributionFamilies: [],
    qualityAverage: 0,
    validationRatio: 0,
    diversityTypes: 1,
    collectiveEvents: 3,
    totalKg: 0,
    wasteKnownActions: 0,
    wasteCoverageRate: 0,
    totalButts: 0,
  });

  const { profileUpsert, supabase } = createLevelRefreshSupabase({
    previousLevel: 1,
    events: [
      { status_phase: "pending", xp_awarded: 1 },
      { status_phase: "validated", xp_awarded: 1 },
    ],
  });

  await refreshProgressionProfile(supabase, "user-1");

  expect(profileUpsert).toHaveBeenCalledWith(
    expect.objectContaining({
      xp_total: 2,
      xp_pending: 1,
      xp_validated: 1,
    }),
    { onConflict: "user_id" },
  );
});

it("keeps the resolved previous level when the secondary notification fails", async () => {
  loadUserProgressionStatsMock.mockResolvedValue(completeLevelSixStats());
  const { profileUpsert, notificationInsert, supabase } = createLevelRefreshSupabase({
    previousLevel: 5,
    events: [{ status_phase: "validated", xp_awarded: 15 }],
    notificationFailure: new Error("notification insert failed"),
  });

  await refreshProgressionProfile(supabase, "user-1");

  expect(profileUpsert).toHaveBeenCalledWith(
    expect.objectContaining({ current_level: 6 }),
    { onConflict: "user_id" },
  );
  expect(notificationInsert).toHaveBeenCalledTimes(1);
  expect(broadcastGamificationAnnouncementMock).toHaveBeenCalledWith(
    supabase,
    expect.objectContaining({
      type: "level_up",
      previousLevel: 5,
      newLevel: 6,
    }),
  );
  expect(logFailureMock).toHaveBeenCalledWith(
    "Gamification/LevelUp",
    "Notification write skipped",
    expect.any(Error),
    { userId: "user-1" },
  );
});

it("does not announce when the current level does not change", async () => {
  loadUserProgressionStatsMock.mockResolvedValue(completeLevelSixStats());
  const { notificationInsert, supabase } = createLevelRefreshSupabase({
    previousLevel: 6,
    events: [{ status_phase: "validated", xp_awarded: 15 }],
  });

  await refreshProgressionProfile(supabase, "user-1");

  expect(notificationInsert).not.toHaveBeenCalled();
  expect(broadcastGamificationAnnouncementMock).not.toHaveBeenCalled();
});
