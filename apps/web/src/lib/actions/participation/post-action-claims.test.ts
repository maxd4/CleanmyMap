import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimFinishedActionParticipation } from "./post-action-claims";

function createActionChain(action: Record<string, unknown>) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: action, error: null })),
  };
  return chain;
}

function createSupabase(action: Record<string, unknown>, rpc = vi.fn()) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "actions") throw new Error(`Unexpected table: ${table}`);
      return createActionChain(action);
    }),
    rpc,
  } as unknown as SupabaseClient;
}

describe("claimFinishedActionParticipation private access boundary", () => {
  const privateAction = {
    access_mode: "invite_link",
    status: "approved",
    moderation_visibility: "visible",
    published_at: "2026-10-10T10:00:00.000Z",
    action_phase: "post_action_complete",
    action_date: "2026-10-01",
    event_start_time: "09:00:00",
  };

  it("refuses a private action when only the action id is available", async () => {
    const rpc = vi.fn();
    const supabase = createSupabase(privateAction, rpc);

    await expect(claimFinishedActionParticipation(supabase, {
      actionId: "action-private-1",
      userId: "user-1",
    })).rejects.toMatchObject({ name: "NotFoundError" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the invitation hash to the atomic RPC and keeps the request pending", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        action_id: "action-private-1",
        participant_user_id: "user-1",
        participation_status: "pending",
        participation_source: "post_action_claim",
        joined_at: "2026-10-19T10:00:00.000Z",
        updated_at: "2026-10-19T10:00:00.000Z",
        already_requested: false,
      }],
      error: null,
    });
    const supabase = createSupabase(privateAction, rpc);

    await expect(claimFinishedActionParticipation(supabase, {
      actionId: "action-private-1",
      userId: "user-1",
      tokenHash: "a".repeat(64),
    })).resolves.toMatchObject({
      actionId: "action-private-1",
      participantUserId: "user-1",
      participationStatus: "pending",
      participationSource: "post_action_claim",
      alreadyRequested: false,
      previousValue: null,
    });
    expect(rpc).toHaveBeenCalledWith("claim_private_action_participation", {
      p_action_id: "action-private-1",
      p_user_id: "user-1",
      p_token_hash: "a".repeat(64),
    });
  });

  it("keeps revoked or already refused private requests terminal", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "private_post_action_claim_invitation_invalid" } })
      .mockResolvedValueOnce({ data: null, error: { message: "private_post_action_claim_already_decided" } });
    const supabase = createSupabase(privateAction, rpc);
    const params = { actionId: "action-private-1", userId: "user-1", tokenHash: "b".repeat(64) };

    await expect(claimFinishedActionParticipation(supabase, params)).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(claimFinishedActionParticipation(supabase, params)).rejects.toMatchObject({
      name: "ValidationError",
      message: "Cette demande a déjà été refusée ou annulée.",
    });
  });
});
