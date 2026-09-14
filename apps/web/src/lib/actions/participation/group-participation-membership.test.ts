import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendActionMetadataToNotes } from "../metadata";
import { joinActionParticipation } from "./group-participation-membership";

type ActionFixture = {
  status: "pending" | "approved" | "rejected";
  moderation_visibility: "visible" | "hidden" | null;
  action_phase: "pre_action" | "post_action_complete";
  action_date: string;
  event_start_time: string | null;
  published_at: string | null;
  notes: string | null;
};

function createActionSupabase(action: ActionFixture) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: action, error: null })),
  };
  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "actions") {
        throw new Error(`Unexpected mutation/read of ${table}`);
      }
      return chain;
    }),
  };
  return { supabase: supabase as unknown as SupabaseClient, from: supabase.from };
}

describe("joinActionParticipation eligibility boundary", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-09-14T09:00:00.000Z") }));
  afterEach(() => vi.useRealTimers());

  it.each([
    ["past", { action_date: "2026-09-13" }],
    ["rejected", { status: "rejected" as const }],
    ["hidden", { moderation_visibility: "hidden" as const }],
    ["unpublished", { published_at: null }],
    ["not a pre-action", { action_phase: "post_action_complete" as const }],
    [
      "closed group form",
      { notes: appendActionMetadataToNotes("Fermée", { groupJoinEnabled: false }) },
    ],
  ] as const)("fails closed and does not mutate a %s action", async (_label, override) => {
    const action: ActionFixture = {
      status: "approved",
      moderation_visibility: "visible",
      action_phase: "pre_action",
      action_date: "2026-09-15",
      event_start_time: "10:00",
      published_at: "2026-09-01T10:00:00.000Z",
      notes: appendActionMetadataToNotes("Ouverte", { groupJoinEnabled: true }),
      ...override,
    };
    const { supabase, from } = createActionSupabase(action);

    await expect(
      joinActionParticipation(supabase, {
        actionId: "action-ineligible",
        userId: "user-1",
        isAdminLike: false,
      }),
    ).rejects.toMatchObject({ name: "NotFoundError" });

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("actions");
  });
});
