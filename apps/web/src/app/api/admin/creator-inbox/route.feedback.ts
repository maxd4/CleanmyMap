import { NextResponse } from "next/server";
import { buildFeedbackInboxItem } from "@/lib/community/creator-inbox";
import {
  deleteCommunityBugReport,
  getCommunityBugReportById,
  updateCommunityBugReportCreatorState,
  updateCommunityBugReportStatus,
} from "@/lib/community/bug-reports-store";
import {
  appendCreatorInboxErrorAudit,
  appendCreatorInboxLookupError,
  appendCreatorInboxSuccessAudit,
  buildSnapshot,
  canonicalTargetUserId,
  createCreatorInboxAudit,
  mutationErrorResponse,
  type CreatorInboxAudit,
  type CreatorInboxHandlerParams,
} from "./route.shared";

type FeedbackRecord = NonNullable<
  Awaited<ReturnType<typeof getCommunityBugReportById>>
>;

type FeedbackStateMutationParams = {
  itemId: string;
  current: FeedbackRecord;
  audit: CreatorInboxAudit;
  reason: string;
  targetUserId?: string;
};

async function deleteFeedbackInboxItem(params: {
  itemId: string;
  current: FeedbackRecord;
  audit: CreatorInboxAudit;
  reason: string;
}) {
  const { itemId, current, audit, reason } = params;
  let deleted;
  let deletionFailed = false;
  try {
    deleted = await deleteCommunityBugReport(itemId);
  } catch {
    deletionFailed = true;
  }
  if (!deleted) {
    await appendCreatorInboxErrorAudit({
      audit,
      targetId: itemId,
      reason,
      targetUserId: canonicalTargetUserId(current.submittedByUserId),
      previousValue: { source: "feedback", creatorState: current.creatorState },
      newValue: { source: "feedback" },
      stage: "delete",
      partialMutation: false,
    });
    if (deletionFailed) return mutationErrorResponse();
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  await appendCreatorInboxSuccessAudit({
    audit,
    targetId: itemId,
    reason,
    targetUserId: canonicalTargetUserId(current.submittedByUserId),
    previousValue: { source: "feedback", creatorState: current.creatorState },
    newValue: { deleted: true },
  });
  return NextResponse.json({ status: "ok", deletedId: itemId });
}

async function markFeedbackTreated(params: FeedbackStateMutationParams) {
  const { itemId, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("feedback", current);
  let updated;
  try {
    updated = await updateCommunityBugReportStatus({
      reportId: itemId,
      status: "treated",
    });
    if (!updated) {
      throw new Error("feedback status update did not persist");
    }
  } catch {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("feedback", {
        status: "treated",
        creatorState: "treated",
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
    newValue: buildSnapshot("feedback", updated),
  });
  return NextResponse.json({
    status: "ok",
    item: buildFeedbackInboxItem(updated),
  });
}

async function archiveFeedbackInboxItem(params: FeedbackStateMutationParams) {
  const { itemId, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("feedback", current);
  let creatorStateUpdated;
  try {
    creatorStateUpdated = await updateCommunityBugReportCreatorState({
      reportId: itemId,
      creatorState: "archived",
    });
    if (!creatorStateUpdated) {
      throw new Error("feedback creator state update did not persist");
    }
  } catch {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("feedback", {
        status: current.status,
        creatorState: "archived",
      }),
      stage: "update",
      partialMutation: false,
    });
    return mutationErrorResponse();
  }

  let finalRecord: FeedbackRecord;
  try {
    const archivedRecord = await updateCommunityBugReportStatus({
      reportId: itemId,
      status: "archived",
    });
    if (!archivedRecord) {
      throw new Error("feedback archive status update did not persist");
    }
    finalRecord = archivedRecord;
  } catch {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("feedback", {
        status: "archived",
        creatorState: "archived",
      }),
      stage: "secondary_update",
      partialMutation: true,
    });
    return mutationErrorResponse();
  }

  await appendCreatorInboxSuccessAudit({
    audit,
    targetId: finalRecord.id,
    reason,
    targetUserId,
    previousValue,
    newValue: buildSnapshot("feedback", finalRecord),
  });
  return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(finalRecord) });
}

export async function handleCreatorInboxFeedback(
  params: CreatorInboxHandlerParams,
) {
  const { itemId, action, reason } = params;

  const audit = createCreatorInboxAudit(params);

  let current;
  try {
    current = await getCommunityBugReportById(itemId);
  } catch {
    await appendCreatorInboxLookupError({
      audit,
      source: "feedback",
      targetId: itemId,
      reason,
    });
    return mutationErrorResponse();
  }
  if (!current) {
    await appendCreatorInboxLookupError({
      audit,
      source: "feedback",
      targetId: itemId,
      reason,
    });
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "delete") {
    return deleteFeedbackInboxItem({
      itemId,
      current,
      audit,
      reason,
    });
  }

  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  const previousValue = buildSnapshot("feedback", current);

  if (action === "responded") {
    await audit({
      outcome: "error",
      targetId: itemId,
      reason,
      targetUserId,
      previousValue,
      newValue: previousValue,
      stage: "update",
      partialMutation: false,
    });
    return NextResponse.json(
      { error: "Un feedback ne peut être marqué répondu qu'après l'envoi d'un DM." },
      { status: 409 },
    );
  }

  if (action === "mark_treated") {
    return markFeedbackTreated({
      itemId,
      current,
      audit,
      reason,
      targetUserId,
    });
  }

  return archiveFeedbackInboxItem({
    itemId,
    current,
    audit,
    reason,
    targetUserId,
  });
}
