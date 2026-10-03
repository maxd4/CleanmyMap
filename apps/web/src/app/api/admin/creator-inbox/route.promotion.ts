import { NextResponse } from "next/server";
import { getPromotionRequestById, updatePromotionRequestCreatorState } from "@/lib/admin/promotion-requests-store";
import { buildPromotionInboxItem } from "@/lib/community/creator-inbox";
import {
  appendCreatorInboxLookupError,
  appendCreatorInboxSuccessAudit,
  buildSnapshot,
  canonicalTargetUserId,
  createCreatorInboxAudit,
  mutationErrorResponse,
  type CreatorInboxAction,
  type CreatorInboxAudit,
  type CreatorInboxHandlerParams,
} from "./route.shared";

type PromotionRecord = NonNullable<
  Awaited<ReturnType<typeof getPromotionRequestById>>
>;

async function updatePromotionCreatorState(params: {
  itemId: string;
  action: CreatorInboxAction["action"];
  current: PromotionRecord;
  audit: CreatorInboxAudit;
  reason: string;
  targetUserId?: string;
}) {
  const { itemId, action, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("promotion", current);
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
    await audit({
      outcome: "error",
      targetId: itemId,
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
    });
    return mutationErrorResponse();
  }

  await appendCreatorInboxSuccessAudit({
    audit,
    targetId: updated.id,
    reason,
    targetUserId,
    previousValue,
    newValue: buildSnapshot("promotion", updated),
  });
  return NextResponse.json({
    status: "ok",
    item: buildPromotionInboxItem(updated),
  });
}

export async function handleCreatorInboxPromotion(
  params: CreatorInboxHandlerParams,
) {
  const { itemId, action, reason } = params;

  const audit = createCreatorInboxAudit(params);

  if (action === "delete") {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      previousValue: { source: "promotion" },
      newValue: { source: "promotion" },
      stage: "delete",
      partialMutation: false,
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
    await appendCreatorInboxLookupError({
      audit,
      source: "promotion",
      targetId: itemId,
      reason,
    });
    return mutationErrorResponse();
  }
  if (!current) {
    await appendCreatorInboxLookupError({
      audit,
      source: "promotion",
      targetId: itemId,
      reason,
    });
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  return updatePromotionCreatorState({
    itemId,
    action,
    current,
    audit,
    reason,
    targetUserId,
  });
}
