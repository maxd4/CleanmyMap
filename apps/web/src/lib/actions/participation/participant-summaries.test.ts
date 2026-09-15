import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadActionParticipantSummaries } from "./participant-summaries";

function createFallbackParticipantSupabaseMock() {
  const rows = [
    {
      action_id: "action-1",
      user_id: "user-1",
      registration_status: "confirmed",
      registration_source: "group_form",
      registered_at: "2026-06-01T12:00:00Z",
      updated_at: "2026-06-02T12:00:00Z",
    },
    {
      action_id: "action-1",
      user_id: "user-2",
      registration_status: "pending",
      registration_source: "admin",
      registered_at: "2026-06-03T12:00:00Z",
      updated_at: "2026-06-04T12:00:00Z",
    },
  ];

  const createParticipantChain = () => {
    const state = {
        registrationStatus: null as "confirmed" | "pending" | null,
    };
    const participantChain = {
      select: vi.fn(() => participantChain),
      eq: vi.fn((field: string, value: string) => {
        if (field === "registration_status") {
          state.registrationStatus = value as "confirmed" | "pending";
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
          count: state.registrationStatus ? 1 : 2,
          error: null,
        }).then(resolve, reject),
    };

    return participantChain;
  };

  const rpc = vi.fn(async () => ({
    data: null,
    error: { message: "rpc unavailable" },
  }));
  const from = vi.fn((table: string) => {
    if (table === "actions") {
      const actionChain = {
        select: vi.fn(() => actionChain),
        in: vi.fn(async () => ({
          data: [{ id: "action-1", action_phase: "pre_action" }],
          error: null,
        })),
      };
      return actionChain;
    }
    return {
      select: vi.fn(() => createParticipantChain()),
    };
  });

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

  it("falls back to a bounded action_registrations read for future actions when the RPC fails", async () => {
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

  it("keeps final participation summaries on action_participants after the action", async () => {
    const rows = [
      {
        action_id: "action-1",
        user_id: "user-1",
        participation_status: "confirmed",
        participation_source: "post_action_claim",
        joined_at: "2026-06-13T12:00:00Z",
        updated_at: "2026-06-14T12:00:00Z",
      },
      {
        action_id: "action-1",
        user_id: "user-2",
        participation_status: "confirmed",
        participation_source: "action_creator",
        joined_at: "2026-06-13T12:00:00Z",
        updated_at: "2026-06-13T12:00:00Z",
      },
      {
        action_id: "action-1",
        user_id: "user-3",
        participation_status: "pending",
        participation_source: "post_action_claim",
        joined_at: "2026-06-13T12:00:00Z",
        updated_at: "2026-06-13T12:00:00Z",
      },
      {
        action_id: "action-1",
        user_id: "user-4",
        participation_status: "cancelled",
        participation_source: "post_action_claim",
        joined_at: "2026-06-13T12:00:00Z",
        updated_at: "2026-06-13T12:00:00Z",
      },
    ];
    const rpc = vi.fn(async () => ({ data: null, error: { message: "rpc unavailable" } }));
    const supabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "actions") {
          const actionChain = {
            select: vi.fn(() => actionChain),
            in: vi.fn(async () => ({
              data: [{ id: "action-1", action_phase: "post_action_complete" }],
              error: null,
            })),
          };
          return actionChain;
        }
        if (table === "action_registrations") {
          throw new Error("future registrations must not back the final fallback");
        }
        if (table !== "action_participants") {
          throw new Error(`Unexpected table: ${table}`);
        }

        const state = { status: null as string | null, countRequested: false };
        const chain = {
          select: vi.fn((_: string, options?: { count?: string; head?: boolean }) => {
            state.countRequested = Boolean(options?.count || options?.head);
            return chain;
          }),
          eq: vi.fn((field: string, value: string) => {
            if (field === "participation_status") state.status = value;
            return chain;
          }),
          maybeSingle: vi.fn(async () => ({ data: rows[0], error: null })),
          then: (
            resolve: (value: { data: typeof rows | null; count?: number; error: null }) => void,
            reject: (reason: unknown) => void,
          ) =>
            Promise.resolve({
              data: state.countRequested ? null : rows,
              count: state.status ? rows.filter((row) => row.participation_status === state.status).length : rows.length,
              error: null,
            }).then(resolve, reject),
        };
        return chain;
      }),
    } as unknown as SupabaseClient;

    const summaries = await loadActionParticipantSummaries(supabase, {
      actionIds: ["action-1"],
      userId: "user-1",
    });

    expect(summaries[0]).toMatchObject({
      actionId: "action-1",
      activeCount: 2,
      myParticipationSource: "post_action_claim",
    });
    expect(summaries[0]?.totalCount).toBe(4);
  });
});
