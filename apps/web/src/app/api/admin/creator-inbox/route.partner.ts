import { NextResponse } from "next/server";
import {
  deletePartnerOnboardingRequest,
  getPartnerOnboardingRequestById,
  updatePartnerOnboardingRequestCreatorState,
} from "@/lib/partners/onboarding-requests-store";
import { buildPartnerInboxItem } from "@/lib/community/creator-inbox";
import {
  buildAuditDetails,
  buildSnapshot,
  canonicalTargetUserId,
  mutationErrorResponse,
  type CreatorInboxAction,
  type DecisionAuditAppender,
  unknownSnapshot,
} from "./route.shared";

export async function handleCreatorInboxPartner(params: {
  operationId: string;
  actorUserId: string;
  itemId: string;
  action: CreatorInboxAction["action"];
  reason: string;
  appendDecisionAudit: DecisionAuditAppender;
}) {
  const {
    operationId,
    actorUserId,
    itemId,
    action,
    reason,
    appendDecisionAudit,
  } = params;

  let current;
  try {
    current = await getPartnerOnboardingRequestById(itemId);
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        previousValue: unknownSnapshot("partner"),
        newValue: unknownSnapshot("partner"),
        stage: "lookup",
        partialMutation: false,
      }),
    });
    return mutationErrorResponse();
  }
  if (!current) {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        previousValue: unknownSnapshot("partner"),
        newValue: unknownSnapshot("partner"),
        stage: "lookup",
        partialMutation: false,
      }),
    });
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "delete") {
    if (current.status === "accepted") {
      await appendDecisionAudit({
        operationId,
        actorUserId,
        outcome: "error",
        targetId: itemId,
        details: buildAuditDetails({
          reason,
          targetUserId: canonicalTargetUserId(current.submittedByUserId),
          previousValue: {
            source: "partner",
            status: current.status,
            creatorState: current.creatorState,
          },
          newValue: {
            source: "partner",
            status: current.status,
            creatorState: current.creatorState,
          },
          stage: "delete",
          partialMutation: false,
        }),
      });
      return NextResponse.json(
        { error: "Accepted partner requests cannot be deleted." },
        { status: 409 },
      );
    }
    let deleted;
    try {
      deleted = await deletePartnerOnboardingRequest(itemId);
    } catch {
      await appendDecisionAudit({
        operationId,
        actorUserId,
        outcome: "error",
        targetId: itemId,
        details: buildAuditDetails({
          reason,
          targetUserId: canonicalTargetUserId(current.submittedByUserId),
          previousValue: {
            source: "partner",
            creatorState: current.creatorState,
          },
          newValue: { source: "partner" },
          stage: "delete",
          partialMutation: false,
        }),
      });
      return mutationErrorResponse();
    }
    if (!deleted) {
      await appendDecisionAudit({
        operationId,
        actorUserId,
        outcome: "error",
        targetId: itemId,
        details: buildAuditDetails({
          reason,
          targetUserId: canonicalTargetUserId(current.submittedByUserId),
          previousValue: {
            source: "partner",
            creatorState: current.creatorState,
          },
          newValue: { source: "partner" },
          stage: "delete",
          partialMutation: false,
        }),
      });
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "success",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        targetUserId: canonicalTargetUserId(current.submittedByUserId),
        previousValue: {
          source: "partner",
          creatorState: current.creatorState,
        },
        newValue: { deleted: true },
      }),
    });
    return NextResponse.json({ status: "ok", deletedId: itemId });
  }

  const previousValue = buildSnapshot("partner", current);
  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  let updated;
  try {
    updated = await updatePartnerOnboardingRequestCreatorState({
      requestId: itemId,
      creatorState:
        action === "responded"
          ? "responded"
          : action === "mark_treated"
            ? "treated"
            : "archived",
    });
    if (!updated) {
      throw new Error("partner creator state update did not persist");
    }
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        targetUserId,
        previousValue,
        newValue: buildSnapshot("partner", {
          status: current.status,
          creatorState:
            action === "responded"
              ? "responded"
              : action === "mark_treated"
                ? "treated"
                : "archived",
        }),
        stage: "update",
        partialMutation: false,
      }),
    });
    return mutationErrorResponse();
  }

  await appendDecisionAudit({
    operationId,
    actorUserId,
    outcome: "success",
    targetId: updated.id,
    details: buildAuditDetails({
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("partner", updated),
    }),
  });
  return NextResponse.json({
    status: "ok",
    item: buildPartnerInboxItem(updated),
  });
}
