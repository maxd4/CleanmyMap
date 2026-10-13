import { beforeEach, describe, expect, it, vi } from "vitest";

const appendActionModerationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/moderation-audit", () => ({
  appendActionModerationAudit: appendActionModerationAuditMock,
}));

import { appendParticipationClaimAudit } from "./claim-audit";

describe("appendParticipationClaimAudit", () => {
  beforeEach(() => {
    appendActionModerationAuditMock.mockReset();
    appendActionModerationAuditMock.mockResolvedValue(undefined);
  });

  it("keeps the canonical moderation audit and its essential claim fields", async () => {
    const claim = {
      previousValue: null,
      newValue: { participationStatus: "pending" },
      participationSource: "post_action_claim",
      alreadyRequested: false,
      joinedAt: "2026-10-13T10:00:00.000Z",
    };

    await appendParticipationClaimAudit({
      actionId: "action-1",
      userId: "user-2",
      operationIdPrefix: "action-post-claim",
      claim,
    });

    expect(appendActionModerationAuditMock).toHaveBeenCalledWith({
      operationId: expect.stringMatching(/^action-post-claim-action-1-user-2-\d+$/),
      actorUserId: "user-2",
      targetActionId: "action-1",
      operation: "post_action_claim",
      outcome: "success",
      previousValue: null,
      newValue: claim.newValue,
      targetUserId: "user-2",
      details: {
        requesterUserId: "user-2",
        participationSource: "post_action_claim",
        alreadyRequested: false,
        requestedAt: "2026-10-13T10:00:00.000Z",
      },
    });
  });
});
