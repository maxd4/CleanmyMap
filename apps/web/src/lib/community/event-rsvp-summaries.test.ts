import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadCommunityEventRsvpSummaries } from "./event-rsvp-summaries";

describe("community event RSVP summaries", () => {
  it("loads RSVP summaries through the RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          event_id: "event-1",
          yes_count: "2",
          maybe_count: 1,
          no_count: null,
          total_count: "3",
          my_rsvp_status: "maybe",
        },
      ],
      error: null,
    }));

    const supabase = { rpc } as unknown as SupabaseClient;

    const summaries = await loadCommunityEventRsvpSummaries(supabase, {
      eventIds: ["event-1"],
      userId: "user-1",
    });

    expect(rpc).toHaveBeenCalledWith("load_community_event_rsvp_summaries", {
      p_event_ids: ["event-1"],
      p_user_id: "user-1",
    });
    expect(summaries).toEqual([
      {
        eventId: "event-1",
        yesCount: 2,
        maybeCount: 1,
        noCount: 0,
        totalCount: 3,
        myRsvpStatus: "maybe",
      },
    ]);
  });

  it("falls back to a bounded event_rsvps read when the RPC fails", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "rpc unavailable" },
    }));
    const inMock = vi.fn(async () => ({
      data: [
        {
          event_id: "event-1",
          participant_clerk_id: "user-1",
          status: "yes",
        },
        {
          event_id: "event-1",
          participant_clerk_id: "user-2",
          status: "maybe",
        },
      ],
      error: null,
    }));
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        in: inMock,
      })),
    }));

    const supabase = { rpc, from } as unknown as SupabaseClient;

    const summaries = await loadCommunityEventRsvpSummaries(supabase, {
      eventIds: ["event-1"],
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("event_rsvps");
    expect(inMock).toHaveBeenCalledWith("event_id", ["event-1"]);
    expect(summaries).toEqual([
      {
        eventId: "event-1",
        yesCount: 1,
        maybeCount: 1,
        noCount: 0,
        totalCount: 2,
        myRsvpStatus: "yes",
      },
    ]);
  });
});
