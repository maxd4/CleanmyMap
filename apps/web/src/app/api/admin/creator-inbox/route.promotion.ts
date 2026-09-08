import { NextResponse } from "next/server";
import { getPromotionRequestById, updatePromotionRequestCreatorState } from "@/lib/admin/promotion-requests-store";
import { buildPromotionInboxItem } from "@/lib/community/creator-inbox";
import {
  buildAuditDetails,
  buildSnapshot,
  canonicalTargetUserId,
  mutationErrorResponse,
  type CreatorInboxAction,
  type DecisionAuditAppender,
  unknownSnapshot,
} from "./route.shared";

export async function handleCreatorInboxPromotion(params: {
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

  if (action === "delete") {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        previousValue: { source: "promotion" },
        newValue: { source: "promotion" },
        stage: "delete",
        partialMutation: false,
      }),
    });
    return NextResponse.json(
      { error: "Promotion requests can only be archived from the inbox." },
      { status: 409 },
    );
  }

  let current;
  try {
    current = await getPromotionRequestById(itemId);
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        previousValue: unknownSnapshot("promotion"),
        newValue: unknownSnapshot("promotion"),
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
        previousValue: unknownSnapshot("promotion"),
        newValue: unknownSnapshot("promotion"),
        stage: "lookup",
        partialMutation: false,
      }),
    });
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  const previousValue = buildSnapshot("promotion", current);
  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  let updated;
  try {
    updated = await updatePromotionRequestCreatorState({
      requestId: itemId,
      creatorState:
        action === "responded"
          ? "responded"
          : action === "mark_treated"
            ? "treated"
            : "archived",
    });
    if (!updated) {
      throw new Error("promotion creator state update did not persist");
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
        newValue: buildSnapshot("promotion", {
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
      newValue: buildSnapshot("promotion", updated),
    }),
  });
  return NextResponse.json({
    status: "ok",
    item: buildPromotionInboxItem(updated),
  });
}
