import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createGroupJoinAction,
  createGroupJoinParticipant,
  createGroupJoinSupabaseMock,
  groupJoinMocks,
  postActionGroupJoin,
  seedGroupJoinTestDefaults,
  seedApprovedActionParticipants,
  type GroupJoinParticipantRow,
  type GroupJoinAuditEntry,
} from "@/__tests__/support/group-join-action-id-route";

const captureActionParticipantImpactSnapshotMock = vi.hoisted(() => vi.fn());

const claimResponseSchema = z.object({
  participationStatus: z.string(),
  participationSource: z.string(),
  alreadyReviewed: z.boolean().optional(),
}).passthrough();

function lastAudit(): GroupJoinAuditEntry | undefined {
  return appendActionModerationAuditMock.mock.calls.at(-1)?.[0];
}

vi.mock("@/lib/actions/action-participant-impact-notifications", () => ({
  captureActionParticipantImpactSnapshot: captureActionParticipantImpactSnapshotMock,
  emitActionParticipantImpactNotifications: vi.fn(),
}));

const {
  authMock,
  getCurrentUserIdentityMock,
  getSupabaseServerClientMock,
  appendActionModerationAuditMock,
  rebuildUserGamificationBadgesMock,
  refreshProgressionProfileMock,
} = groupJoinMocks;

function createPostActionClaimParticipant(): GroupJoinParticipantRow {
  return createGroupJoinParticipant({
    id: "claim-1",
    action_id: "action-1",
    user_id: "user-2",
    created_at: "2026-09-12T10:00:00.000Z",
    participation_status: "pending",
    participation_source: "post_action_claim",
  });
}

describe("POST /api/actions/:actionId/group-join post-action claims", () => {
  beforeEach(() => {
    seedGroupJoinTestDefaults();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      role: "benevole",
      activeRole: "benevole",
    });
    appendActionModerationAuditMock.mockResolvedValue(undefined);
    refreshProgressionProfileMock.mockResolvedValue(undefined);
  });

  it.each([
    ["accept", "confirmed" as const],
    ["reject", "cancelled" as const],
  ])("lets the action owner %s a claim without changing group access", async (decision, expectedStatus) => {
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({
        createdByClerkId: "user-1",
        actionPhase: "post_action_complete",
        actionDate: "2026-09-13",
      }),
      participants: [createPostActionClaimParticipant()],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await postActionGroupJoin({ participantId: "claim-1", decision });
    const body = claimResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      participationStatus: expectedStatus,
      participationSource: "post_action_claim",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    if (decision === "accept") {
      expect(rebuildUserGamificationBadgesMock).toHaveBeenCalledWith(expect.anything(), "user-2");
      expect(refreshProgressionProfileMock).toHaveBeenCalledWith(expect.anything(), "user-2");
    } else {
      expect(rebuildUserGamificationBadgesMock).not.toHaveBeenCalled();
      expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
    }
    expect(lastAudit()).toMatchObject({
      operation: "post_action_claim_review",
      actorUserId: "user-1",
      targetUserId: "user-2",
      details: { decision },
    });
  });

  it("keeps a post-action claim separate from an ordinary future registration", async () => {
    const supabase = createGroupJoinSupabaseMock({
      action: createGroupJoinAction({
        createdByClerkId: "user-1",
        actionPhase: "post_action_complete",
        actionDate: "2026-09-13",
      }),
      participants: [createPostActionClaimParticipant()],
    });
    getSupabaseServerClientMock.mockReturnValue(supabase);

    const response = await postActionGroupJoin({
      participantId: "claim-1",
      decision: "reject",
      requestKind: "post_action_claim",
    });
    const body = claimResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.participationSource).toBe("post_action_claim");
    expect(body.participationStatus).toBe("cancelled");
    expect(body.participationSource).not.toBe("group_form");
  });

  it("refuses an outsider from reviewing an owner's post-action claim", async () => {
    authMock.mockResolvedValueOnce({ userId: "outsider-1" });
    getCurrentUserIdentityMock.mockResolvedValueOnce({ role: "benevole", activeRole: "benevole" });
    const participants = [createPostActionClaimParticipant()];
    seedApprovedActionParticipants(participants, {
      createdByClerkId: "owner-1",
      actionPhase: "post_action_complete",
    });

    const response = await postActionGroupJoin({
      participantId: "claim-1",
      decision: "accept",
      requestKind: "post_action_claim",
    });

    expect(response.status).toBe(403);
    expect(participants[0]?.participation_status).toBe("pending");
    expect(appendActionModerationAuditMock).not.toHaveBeenCalled();
  });

  it("does not review a claim after its action was rejected", async () => {
    const participants = [createPostActionClaimParticipant()];
    seedApprovedActionParticipants(participants, {
      status: "rejected",
      actionPhase: "post_action_complete",
    });

    const response = await postActionGroupJoin({
      participantId: "claim-1",
      decision: "accept",
      requestKind: "post_action_claim",
    });

    expect(response.status).toBe(404);
    expect(participants[0]?.participation_status).toBe("pending");
  });

  it("keeps a repeated claim review idempotent while retaining its audit context", async () => {
    const participant = createGroupJoinParticipant({
      ...createPostActionClaimParticipant(),
      participation_status: "confirmed",
    });
    seedApprovedActionParticipants([participant], {
      createdByClerkId: "user-1",
      actionPhase: "post_action_complete",
    });

    const response = await postActionGroupJoin({
      participantId: "claim-1",
      decision: "accept",
      requestKind: "post_action_claim",
    });
    const body = claimResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.alreadyReviewed).toBe(true);
    expect(appendActionModerationAuditMock).toHaveBeenCalledTimes(1);
    expect(lastAudit()).toMatchObject({
      operation: "post_action_claim_review",
      details: { participationStatus: "confirmed" },
    });
  });
});
