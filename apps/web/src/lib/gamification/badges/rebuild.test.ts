import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const loadGamificationUserCountersMock = vi.hoisted(() => vi.fn());
const loadCleanZoneSourcesForUserMock = vi.hoisted(() => vi.fn());
const loadActionRowsForUserMock = vi.hoisted(() => vi.fn());
const awardActionMilestonesForUserMock = vi.hoisted(() => vi.fn());
const awardRecoveredParticipationMilestoneMock = vi.hoisted(() => vi.fn());

vi.mock("../counters", () => ({
  loadGamificationUserCounters: loadGamificationUserCountersMock,
}));
vi.mock("../listing", () => ({
  loadCleanZoneSourcesForUser: loadCleanZoneSourcesForUserMock,
}));
vi.mock("../progression-data", () => ({
  awardActionMilestonesForUser: awardActionMilestonesForUserMock,
  loadActionRowsForUser: loadActionRowsForUserMock,
}));
vi.mock("../participation-milestones", () => ({
  awardRecoveredParticipationMilestone: awardRecoveredParticipationMilestoneMock,
}));
vi.mock("@/lib/gamification/notifications", () => ({
  auditXpAttribution: vi.fn(),
}));
vi.mock("@/lib/gamification/announcements", () => ({
  broadcastGamificationAnnouncement: vi.fn(),
}));

import { rebuildUserGamificationBadges } from "./rebuild";

function createSupabase() {
  const inserted: Array<Record<string, unknown>> = [];
  const progressionEvents = {
    insert: vi.fn(async (row: Record<string, unknown>) => {
      const key = [
        row.user_id,
        row.event_type,
        row.source_table,
        row.source_id,
        row.status_phase,
      ].join(":");
      if (inserted.some((existing) => [
        existing.user_id,
        existing.event_type,
        existing.source_table,
        existing.source_id,
        existing.status_phase,
      ].join(":") === key)) {
        return { error: { code: "23505", message: "duplicate progression event" } };
      }
      inserted.push(row);
      return { error: null };
    }),
  };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "progression_events") return progressionEvents;
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { supabase, inserted };
}

describe("rebuildUserGamificationBadges", () => {
  it("writes each useful participation tier as validated XP and remains idempotent", async () => {
    loadGamificationUserCountersMock.mockResolvedValue({
      participationCount: 5,
      visitedPlacesCount: 0,
    });
    loadCleanZoneSourcesForUserMock.mockResolvedValue([]);
    loadActionRowsForUserMock.mockResolvedValue([]);
    awardActionMilestonesForUserMock.mockResolvedValue(0);
    awardRecoveredParticipationMilestoneMock.mockResolvedValue(false);
    const fixture = createSupabase();

    await expect(rebuildUserGamificationBadges(fixture.supabase, "user-1"))
      .resolves.toEqual({ inserted: 3 });
    await expect(rebuildUserGamificationBadges(fixture.supabase, "user-1"))
      .resolves.toEqual({ inserted: 0 });

    expect(fixture.inserted).toHaveLength(3);
    expect(fixture.inserted).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_type: "participant_tier_unlock",
        source_id: "participant:participant-1",
        status_phase: "validated",
        xp_base: 1,
        xp_awarded: 1,
      }),
      expect.objectContaining({
        event_type: "participant_tier_unlock",
        source_id: "participant:participant-3",
        status_phase: "validated",
        xp_base: 1,
        xp_awarded: 1,
      }),
      expect.objectContaining({
        event_type: "participant_tier_unlock",
        source_id: "participant:participant-5",
        status_phase: "validated",
        xp_base: 1,
        xp_awarded: 1,
      }),
    ]));
  });
});
