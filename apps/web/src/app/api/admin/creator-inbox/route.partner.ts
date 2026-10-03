import { NextResponse } from "next/server";
import {
  deletePartnerOnboardingRequest,
  getPartnerOnboardingRequestById,
  updatePartnerOnboardingRequestCreatorState,
} from "@/lib/partners/onboarding-requests-store";
import { buildPartnerInboxItem } from "@/lib/community/creator-inbox";
import {
  appendCreatorInboxErrorAudit,
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

type PartnerRecord = NonNullable<
  Awaited<ReturnType<typeof getPartnerOnboardingRequestById>>
>;

async function deletePartnerInboxItem(params: {
  itemId: string;
  current: PartnerRecord;
  audit: CreatorInboxAudit;
  reason: string;
}) {
  const { itemId, current, audit, reason } = params;
  if (current.status === "accepted") {
    await audit({
      outcome: "error",
      targetId: itemId,
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
    });
    return NextResponse.json(
      { error: "Accepted partner requests cannot be deleted." },
      { status: 409 },
    );
  }

  let deleted;
  let deletionFailed = false;
  try {
    deleted = await deletePartnerOnboardingRequest(itemId);
  } catch {
    deletionFailed = true;
  }
  if (!deleted) {
    await appendCreatorInboxErrorAudit({
      audit,
      targetId: itemId,
      reason,
      targetUserId: canonicalTargetUserId(current.submittedByUserId),
      previousValue: { source: "partner", creatorState: current.creatorState },
      newValue: { source: "partner" },
      stage: "delete",
      partialMutation: false,
    });
    if (deletionFailed) return mutationErrorResponse();
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  await appendCreatorInboxSuccessAudit({
    audit,
    targetId: itemId,
    reason,
    targetUserId: canonicalTargetUserId(current.submittedByUserId),
    previousValue: { source: "partner", creatorState: current.creatorState },
    newValue: { deleted: true },
  });
  return NextResponse.json({ status: "ok", deletedId: itemId });
}

async function updatePartnerCreatorState(params: {
  itemId: string;
  action: CreatorInboxAction["action"];
  current: PartnerRecord;
  audit: CreatorInboxAudit;
  reason: string;
  targetUserId?: string;
}) {
  const { itemId, action, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("partner", current);
  const creatorState =
    action === "responded"
      ? "responded"
      : action === "mark_treated"
        ? "treated"
        : "archived";
  let updated;
  try {
    updated = await updatePartnerOnboardingRequestCreatorState({
      requestId: itemId,
      creatorState,
    });
    if (!updated) {
      throw new Error("partner creator state update did not persist");
    }
  } catch {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("partner", {
        status: current.status,
        creatorState,
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
    newValue: buildSnapshot("partner", updated),
  });
  return NextResponse.json({ status: "ok", item: buildPartnerInboxItem(updated) });
}

export async function handleCreatorInboxPartner(
  params: CreatorInboxHandlerParams,
) {
  const { itemId, action, reason } = params;

  const audit = createCreatorInboxAudit(params);

  let current;
  try {
    current = await getPartnerOnboardingRequestById(itemId);
  } catch {
    await appendCreatorInboxLookupError({
      audit,
      source: "partner",
      targetId: itemId,
      reason,
    });
    return mutationErrorResponse();
  }
  if (!current) {
    await appendCreatorInboxLookupError({
      audit,
      source: "partner",
      targetId: itemId,
      reason,
    });
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "delete") {
    return deletePartnerInboxItem({ itemId, current, audit, reason });
  }

  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  return updatePartnerCreatorState({
    itemId,
    action,
    current,
    audit,
    reason,
    targetUserId,
  });
}
