import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipantSummaries } from "./participant-summaries";

describe("action participant summaries", () => {
  it("loads action summaries through the RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          action_id: "action-1",
          active_count: "4",
          total_count: 5,
          my_participation_status: "pending",
          my_participation_source: "group_form",
          my_joined_at: "2026-06-01T12:00:00Z",
          my_updated_at: "2026-06-02T12:00:00Z",
        },
      ],
      error: null,
    }));

    const supabase = { rpc } as unknown as SupabaseClient;

    const summaries = await loadActionParticipantSummaries(supabase, {
      actionIds: ["action-1"],
      userId: "user-1",
    });

    expect(rpc).toHaveBeenCalledWith("load_action_participant_summaries", {
      p_action_ids: ["action-1"],
      p_user_id: "user-1",
    });
    expect(summaries).toEqual([
      {
        actionId: "action-1",
        activeCount: 4,
        totalCount: 5,
        myParticipationStatus: "pending",
        myParticipationSource: "group_form",
        myJoinedAt: "2026-06-01T12:00:00Z",
        myUpdatedAt: "2026-06-02T12:00:00Z",
      },
    ]);
  });

  it("falls back to a bounded action_participants read when the RPC fails", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "rpc unavailable" },
    }));
    const inMock = vi.fn(async () => ({
      data: [
        {
          action_id: "action-1",
          user_id: "user-1",
          participation_status: "confirmed",
          participation_source: "group_form",
          joined_at: "2026-06-01T12:00:00Z",
          updated_at: "2026-06-02T12:00:00Z",
        },
        {
          action_id: "action-1",
          user_id: "user-2",
          participation_status: "pending",
          participation_source: "admin",
          joined_at: "2026-06-03T12:00:00Z",
          updated_at: "2026-06-04T12:00:00Z",
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

    const summaries = await loadActionParticipantSummaries(supabase, {
      actionIds: ["action-1"],
      userId: "user-1",
    });

    expect(from).toHaveBeenCalledWith("action_participants");
    expect(inMock).toHaveBeenCalledWith("action_id", ["action-1"]);
    expect(summaries).toEqual([
      {
        actionId: "action-1",
        activeCount: 1,
        totalCount: 2,
        myParticipationStatus: "confirmed",
        myParticipationSource: "group_form",
        myJoinedAt: "2026-06-01T12:00:00Z",
        myUpdatedAt: "2026-06-02T12:00:00Z",
      },
    ]);
  });
});
