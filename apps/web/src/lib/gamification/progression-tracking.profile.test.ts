import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";

const loadUserProgressionStatsMock = vi.hoisted(() => vi.fn());

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

import { refreshProgressionProfile } from "./progression-tracking";

it("includes action balance XP in the validated profile total", async () => {
  loadUserProgressionStatsMock.mockResolvedValue({
    totalActions: 6,
    approvedActions: 6,
    validatedActions: 6,
    qualityAverage: 80,
    validationRatio: 1,
    diversityTypes: 3,
    collectiveEvents: 0,
    totalKg: 6,
    wasteKnownActions: 6,
    wasteCoverageRate: 100,
    totalButts: 60,
  });

  const profileUpsert = vi.fn(async (row: Record<string, unknown>) => ({
    data: row,
    error: null,
  }));
  const progressionEventsChain = {
    select: vi.fn(() => progressionEventsChain),
    eq: vi.fn(() => progressionEventsChain),
    limit: vi.fn(async () => ({
      data: [
        { status_phase: "validated", xp_awarded: 1 },
        { status_phase: "validated", xp_awarded: 2 },
      ],
      error: null,
    })),
  };
  const progressionProfilesChain = {
    select: vi.fn(() => progressionProfilesChain),
    eq: vi.fn(() => progressionProfilesChain),
    maybeSingle: vi.fn(async () => ({
      data: { current_level: 1 },
      error: null,
    })),
  };
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "progression_events") {
        return progressionEventsChain;
      }
      if (table === "progression_profiles") {
        return {
          ...progressionProfilesChain,
          upsert: profileUpsert,
        };
      }
      if (table === "app_notifications") {
        return { insert: vi.fn(async () => ({ error: null })) };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;

  await refreshProgressionProfile(supabase, "user-1");

  expect(profileUpsert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: "user-1",
      xp_total: 3,
      xp_pending: 0,
      xp_validated: 3,
    }),
    { onConflict: "user_id" },
  );
});
