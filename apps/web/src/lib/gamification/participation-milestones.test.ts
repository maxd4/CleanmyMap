import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  awardRecoveredParticipationMilestone,
  findRecoveredParticipationProof,
} from "./participation-milestones";

function createSupabase(rows: readonly Record<string, unknown>[]) {
  const inserted: Array<Record<string, unknown>> = [];
  const participantChain = {
    select: vi.fn(() => participantChain),
    eq: vi.fn(() => participantChain),
    order: vi.fn(() => participantChain),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  };
  const events = {
    insert: vi.fn(async (row: Record<string, unknown>) => {
      const key = [row.user_id, row.event_type, row.source_id, row.status_phase].join(":");
      if (inserted.some((existing) =>
        [existing.user_id, existing.event_type, existing.source_id, existing.status_phase].join(":") === key,
      )) {
        return { error: { code: "23505", message: "duplicate progression event" } };
      }
      inserted.push(row);
      return { error: null };
    }),
  };
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "action_participants") return participantChain;
      if (table === "progression_events") return events;
      if (table === "action_registrations") {
        throw new Error("action_registrations must never be consulted for participation");
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;

  return { supabase, inserted, participantChain };
}

describe("Participation retrouvée", () => {
  it("qualifies only a confirmed post-action claim", () => {
    expect(findRecoveredParticipationProof([
      {
        action_id: "action-pending",
        participation_status: "pending",
        participation_source: "post_action_claim",
      },
      {
        action_id: "action-registration-like",
        participation_status: "confirmed",
        participation_source: "group_form",
      },
      {
        action_id: "action-confirmed",
        participation_status: "confirmed",
        participation_source: "post_action_claim",
      },
    ])?.action_id).toBe("action-confirmed");
  });

  it("does not award pending or ordinary confirmed participation", async () => {
    const pending = createSupabase([{
      action_id: "action-1",
      participation_status: "pending",
      participation_source: "post_action_claim",
    }]);
    await expect(awardRecoveredParticipationMilestone(pending.supabase, "user-1"))
      .resolves.toBe(false);
    expect(pending.inserted).toHaveLength(0);

    const ordinary = createSupabase([{
      action_id: "action-2",
      participation_status: "confirmed",
      participation_source: "group_form",
    }]);
    await expect(awardRecoveredParticipationMilestone(ordinary.supabase, "user-1"))
      .resolves.toBe(false);
    expect(ordinary.inserted).toHaveLength(0);
  });

  it("records zero XP once and remains idempotent on replay", async () => {
    const fixture = createSupabase([{
      action_id: "action-recovered",
      participation_status: "confirmed",
      participation_source: "post_action_claim",
      joined_at: "2026-09-27T10:00:00.000Z",
    }]);

    await expect(awardRecoveredParticipationMilestone(fixture.supabase, "user-1"))
      .resolves.toBe(true);
    await expect(awardRecoveredParticipationMilestone(fixture.supabase, "user-1"))
      .resolves.toBe(false);
    await expect(awardRecoveredParticipationMilestone(fixture.supabase, "user-2"))
      .resolves.toBe(true);

    expect(fixture.inserted).toHaveLength(2);
    expect(fixture.inserted[0]).toMatchObject({
      event_type: "action_participation_recovered",
      source_table: "action_participants",
      source_id: "participation-retrieved:user-1",
      status_phase: "validated",
      xp_base: 0,
      xp_awarded: 0,
      metadata: {
        actionId: "action-recovered",
        participationSource: "post_action_claim",
      },
    });
    expect(fixture.participantChain.eq).toHaveBeenCalledWith("participation_status", "confirmed");
  });
});
