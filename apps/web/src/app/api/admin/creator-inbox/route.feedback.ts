import { NextResponse } from "next/server";
import { buildFeedbackInboxItem } from "@/lib/community/creator-inbox";
import {
  changeCommunityBugReportPriority,
  getCommunityBugReportById,
  qualifyCommunityBugReport,
  updateCommunityBugReportTracking,
  updateCommunityBugReportStatusTransactional,
  removeCommunityBugReportFromActiveQueue,
} from "@/lib/community/bug-reports-store";
import type { FeedbackTrackingStatus } from "@/lib/community/bug-reports-store";
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
  actorUserId: string;
  operationId: string;
};

type FeedbackQualificationParams = CreatorInboxHandlerParams & {
  qualification: {
    decision: "pending" | "needs_info" | "accepted" | "duplicate" | "rejected";
    duplicateFeedbackId: string | null;
  };
};

type FeedbackTrackingParams = CreatorInboxHandlerParams & {
  tracking: {
    status: FeedbackTrackingStatus;
    publicSummary: string | null;
    reference: string | null;
    shippedOn: string | null;
  };
};

async function qualifyFeedbackInboxItem(params: FeedbackQualificationParams) {
  let result: Awaited<ReturnType<typeof qualifyCommunityBugReport>>;
  try {
    result = await qualifyCommunityBugReport({
      reportId: params.itemId,
      decision: params.qualification.decision,
      reason: params.reason.trim() || null,
      duplicateFeedbackId: params.qualification.duplicateFeedbackId,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
    });
  } catch {
    return mutationErrorResponse();
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (result.status === "duplicate_not_found") {
    return NextResponse.json({ error: "Duplicate feedback not found" }, { status: 400 });
  }
  if (!result.record) {
    return mutationErrorResponse();
  }
  return NextResponse.json({
    status: "ok",
    qualificationStatus: result.status,
    item: buildFeedbackInboxItem(result.record),
  });
}

async function updateFeedbackTracking(params: FeedbackTrackingParams) {
  let result: Awaited<ReturnType<typeof updateCommunityBugReportTracking>>;
  try {
    result = await updateCommunityBugReportTracking({
      reportId: params.itemId,
      trackingStatus: params.tracking.status,
      publicSummary: params.tracking.publicSummary,
      reference: params.tracking.reference,
      shippedOn: params.tracking.shippedOn,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
    });
  } catch {
    return mutationErrorResponse();
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (!result.record) return mutationErrorResponse();
  return NextResponse.json({
    status: "ok",
    trackingStatus: result.status,
    item: buildFeedbackInboxItem(result.record),
  });
}

async function deleteFeedbackInboxItem(params: {
  itemId: string;
  current: FeedbackRecord;
  audit: CreatorInboxAudit;
  reason: string;
  actorUserId: string;
  operationId: string;
}) {
  const { itemId, current, audit, reason, actorUserId, operationId } = params;
  let result: Awaited<ReturnType<typeof removeCommunityBugReportFromActiveQueue>>;
  try {
    result = await removeCommunityBugReportFromActiveQueue({
      reportId: itemId,
      reason,
      actorUserId,
      operationId,
      expectedStatus: current.status,
      expectedCreatorState: current.creatorState,
    });
  } catch {
    await appendCreatorInboxErrorAudit({
      audit,
      targetId: itemId,
      reason,
      targetUserId: canonicalTargetUserId(current.submittedByUserId),
      previousValue: buildSnapshot("feedback", current),
      newValue: { source: "feedback", removed: true },
      stage: "delete",
      partialMutation: false,
    });
    return mutationErrorResponse();
  }
  if (result.status === "conflict") {
    return NextResponse.json({ error: "Feedback state changed concurrently." }, { status: 409 });
  }
  if (result.status === "not_found" || !result.record) {
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
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (!result.auditPersisted) {
    await appendCreatorInboxSuccessAudit({
      audit,
      targetId: itemId,
      reason,
      targetUserId: canonicalTargetUserId(current.submittedByUserId),
      previousValue: { source: "feedback", creatorState: current.creatorState },
      newValue: { deleted: true },
    });
  }
  return NextResponse.json({ status: "ok", deletedId: itemId, removed: true });
}

async function changeFeedbackPriority(params: {
  itemId: string;
  current: FeedbackRecord;
  reason: string;
  actorUserId: string;
  operationId: string;
  priority: "normal" | "high" | "critical";
}) {
  let result;
  try {
    result = await changeCommunityBugReportPriority({
      reportId: params.itemId,
      priority: params.priority,
      reason: params.reason,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
      expectedPriority: params.current.priority,
    });
  } catch {
    return mutationErrorResponse();
  }
  if (result.status === "conflict") {
    return NextResponse.json({ error: "Feedback priority changed concurrently." }, { status: 409 });
  }
  if (result.status === "not_found" || !result.record) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(result.record) });
}

async function markFeedbackTreated(params: FeedbackStateMutationParams) {
  const { itemId, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("feedback", current);
  let updated;
  let mutationResult: Awaited<ReturnType<typeof updateCommunityBugReportStatusTransactional>>;
  try {
    const result = await updateCommunityBugReportStatusTransactional({
      reportId: itemId,
      status: "treated",
      actorUserId: params.actorUserId,
      operationId: params.operationId,
      expectedStatus: current.status,
      expectedCreatorState: current.creatorState,
    });
    mutationResult = result;
    if (result.status === "conflict") {
      return NextResponse.json({ error: "Feedback state changed concurrently." }, { status: 409 });
    }
    updated = result.record;
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
  if (!mutationResult.auditPersisted) {
    await appendCreatorInboxSuccessAudit({
      audit,
      targetId: itemId,
      reason,
      targetUserId: canonicalTargetUserId(current.submittedByUserId),
      previousValue: buildSnapshot("feedback", current),
      newValue: buildSnapshot("feedback", updated),
    });
  }
  return NextResponse.json({
    status: "ok",
    item: buildFeedbackInboxItem(updated),
  });
}

async function archiveFeedbackInboxItem(params: FeedbackStateMutationParams) {
  const { itemId, current, audit, reason, targetUserId } = params;
  const previousValue = buildSnapshot("feedback", current);
  let finalRecord: FeedbackRecord;
  let mutationResult: Awaited<ReturnType<typeof updateCommunityBugReportStatusTransactional>>;
  try {
    const result = await updateCommunityBugReportStatusTransactional({
      reportId: itemId,
      status: "archived",
      actorUserId: params.actorUserId,
      operationId: params.operationId,
      expectedStatus: current.status,
      expectedCreatorState: current.creatorState,
    });
    mutationResult = result;
    if (result.status === "conflict") {
      return NextResponse.json({ error: "Feedback state changed concurrently." }, { status: 409 });
    }
    const archivedRecord = result.record;
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
      stage: "update",
      partialMutation: false,
    });
    return mutationErrorResponse();
  }

  if (!mutationResult.auditPersisted) {
    await appendCreatorInboxSuccessAudit({
      audit,
      targetId: finalRecord.id,
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("feedback", finalRecord),
    });
  }

  return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(finalRecord) });
}

async function loadFeedbackForAction(params: {
  itemId: string;
  reason: string;
  audit: CreatorInboxAudit;
}): Promise<{ current: FeedbackRecord } | { response: NextResponse }> {
  try {
    const current = await getCommunityBugReportById(params.itemId);
    if (current) return { current };
  } catch {
    await appendCreatorInboxLookupError({
      audit: params.audit,
      source: "feedback",
      targetId: params.itemId,
      reason: params.reason,
    });
    return { response: mutationErrorResponse() };
  }

  await appendCreatorInboxLookupError({
    audit: params.audit,
    source: "feedback",
    targetId: params.itemId,
    reason: params.reason,
  });
  return { response: NextResponse.json({ error: "Report not found" }, { status: 404 }) };
}

async function rejectRespondedFeedback(params: {
  itemId: string;
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  audit: CreatorInboxAudit;
}) {
  await params.audit({
    outcome: "error",
    targetId: params.itemId,
    reason: params.reason,
    targetUserId: params.targetUserId,
    previousValue: params.previousValue,
    newValue: params.previousValue,
    stage: "update",
    partialMutation: false,
  });
  return NextResponse.json(
    { error: "Un feedback ne peut être marqué répondu qu'après l'envoi d'un DM." },
    { status: 409 },
  );
}

export async function handleCreatorInboxFeedback(
  params: CreatorInboxHandlerParams | FeedbackQualificationParams | FeedbackTrackingParams,
) {
  const { itemId, action, reason } = params;

  if (action === "qualify" && "qualification" in params) {
    return qualifyFeedbackInboxItem(params);
  }
  if (action === "update_tracking" && "tracking" in params) {
    return updateFeedbackTracking(params as FeedbackTrackingParams);
  }

  const audit = createCreatorInboxAudit(params);
  const lookup = await loadFeedbackForAction({ itemId, reason, audit });
  if ("response" in lookup) return lookup.response;
  const { current } = lookup;

  if (action === "delete") {
    return deleteFeedbackInboxItem({
      itemId,
      current,
      audit,
      reason,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
    });
  }

  if (action === "change_priority" && "priority" in params && params.priority) {
    return changeFeedbackPriority({
      itemId,
      current,
      reason,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
      priority: params.priority,
    });
  }

  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  const previousValue = buildSnapshot("feedback", current);

  if (action === "responded") {
    return rejectRespondedFeedback({
      itemId,
      reason,
      targetUserId,
      previousValue,
      audit,
    });
  }

  if (action === "mark_treated") {
    return markFeedbackTreated({
      itemId,
      current,
      audit,
      reason,
      targetUserId,
      actorUserId: params.actorUserId,
      operationId: params.operationId,
    });
  }

  return archiveFeedbackInboxItem({
    itemId,
    current,
    audit,
    reason,
    targetUserId,
    actorUserId: params.actorUserId,
    operationId: params.operationId,
  });
}
