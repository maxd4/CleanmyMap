import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const insertedEvents: Array<Record<string, unknown>> = [];
const insertProgressionEventMock = vi.hoisted(() => vi.fn());
const extractCommunityOpsFromDescriptionMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  insertProgressionEvent: insertProgressionEventMock,
  syncUserActionProgression: vi.fn(),
}));
vi.mock("./progression-tracking", () => ({
  extractCommunityOpsFromDescription: extractCommunityOpsFromDescriptionMock,
  refreshProgressionProfile: vi.fn(),
}));
vi.mock("./badges/rebuild", () => ({
  rebuildUserGamificationBadges: vi.fn(),
}));

import { backfillUserProgression } from "./progression-backfill";

function queryChain(data: readonly Record<string, unknown>[]) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data, error: null })),
  };
  return chain;
}

function createSupabase(): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table === "trash_spotter_spots") {
        return queryChain([{
          id: "spot-1",
          created_at: "2026-09-20T10:00:00.000Z",
          created_by_clerk_id: "user-1",
          status: "validated",
          label: "Spot",
          notes: null,
        }]);
      }
      if (table === "event_rsvps") {
        return queryChain([{
          event_id: "event-1",
          participant_clerk_id: "user-1",
          status: "yes",
          updated_at: "2026-09-21T10:00:00.000Z",
        }]);
      }
      if (table === "community_events") {
        return queryChain([{
          id: "event-1",
          created_at: "2026-09-22T10:00:00.000Z",
          organizer_clerk_id: "user-1",
          description: "community event",
        }]);
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe("progression backfill", () => {
  it("does not recreate XP for non-gamified historical traces", async () => {
    insertedEvents.length = 0;
    insertProgressionEventMock.mockImplementation(async (_supabase, params) => {
      insertedEvents.push(params);
      return true;
    });
    extractCommunityOpsFromDescriptionMock.mockReturnValue({
      hasPostMortem: true,
      attendanceCount: 2,
    });

    await backfillUserProgression(createSupabase(), "user-1");

    expect(insertedEvents.map((event) => event.eventType)).toEqual([
      "spot_create_pending",
      "spot_validation_bonus",
      "collective_rsvp_yes_pending",
      "community_ops_update",
      "collective_attendance_confirmed",
    ]);
    expect(insertedEvents.every((event) =>
      event.xpBase === 0 && event.xpAwarded === 0,
    )).toBe(true);
  });
});
