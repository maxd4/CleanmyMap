import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipantSummaries } from "./participant-summaries";

function createFallbackParticipantSupabaseMock() {
  const rows = [
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
  ];

  const createParticipantChain = () => {
    const state = {
      participationStatus: null as "confirmed" | "pending" | null,
    };
    const participantChain = {
      select: vi.fn(() => participantChain),
      eq: vi.fn((field: string, value: string) => {
        if (field === "participation_status") {
          state.participationStatus = value as "confirmed" | "pending";
        }
        return participantChain;
      }),
      maybeSingle: vi.fn(async () => ({
        data: rows[0] ?? null,
        error: null,
      })),
      then: (
        resolve: (value: {
          data: typeof rows | null;
          count?: number;
          error: null;
        }) => void,
        reject: (reason: unknown) => void,
      ) =>
        Promise.resolve({
          data: rows,
          count: state.participationStatus ? 1 : 2,
          error: null,
        }).then(resolve, reject),
    };

    return participantChain;
  };

  const rpc = vi.fn(async () => ({
    data: null,
    error: { message: "rpc unavailable" },
  }));
  const from = vi.fn(() => ({
    select: vi.fn(() => createParticipantChain()),
  }));

  return {
    rpc,
    from,
  } as unknown as SupabaseClient;
}

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
    const supabase = createFallbackParticipantSupabaseMock();

    const summaries = await loadActionParticipantSummaries(supabase, {
      actionIds: ["action-1"],
      userId: "user-1",
    });

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
