import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";

export async function appendParticipationClaimAudit({
  actionId,
  userId,
  operationIdPrefix,
  claim,
}: {
  actionId: string;
  userId: string;
  operationIdPrefix: string;
  claim: {
    previousValue: unknown;
    newValue: unknown;
    participationSource: unknown;
    alreadyRequested: unknown;
    joinedAt: unknown;
  };
}) {
  await appendActionModerationAudit({
    operationId: `${operationIdPrefix}-${actionId}-${userId}-${Date.now()}`,
    actorUserId: userId,
    targetActionId: actionId,
    operation: "post_action_claim",
    outcome: "success",
    previousValue: claim.previousValue,
    newValue: claim.newValue,
    targetUserId: userId,
    details: {
      requesterUserId: userId,
      participationSource: claim.participationSource,
      alreadyRequested: claim.alreadyRequested,
      requestedAt: claim.joinedAt,
    },
  });
}
