import { NextResponse } from "next/server";
import { buildFeedbackInboxItem } from "@/lib/community/creator-inbox";
import {
  deleteCommunityBugReport,
  getCommunityBugReportById,
  updateCommunityBugReportCreatorState,
  updateCommunityBugReportStatus,
} from "@/lib/community/bug-reports-store";
import {
  buildAuditDetails,
  buildSnapshot,
  canonicalTargetUserId,
  mutationErrorResponse,
  type CreatorInboxAction,
  type DecisionAuditAppender,
  unknownSnapshot,
} from "./route.shared";

export async function handleCreatorInboxFeedback(params: {
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
    current = await getCommunityBugReportById(itemId);
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId,
      outcome: "error",
      targetId: itemId,
      details: buildAuditDetails({
        reason,
        previousValue: unknownSnapshot("feedback"),
        newValue: unknownSnapshot("feedback"),
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
        previousValue: unknownSnapshot("feedback"),
        newValue: unknownSnapshot("feedback"),
        stage: "lookup",
        partialMutation: false,
      }),
    });
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "delete") {
    let deleted;
    try {
      deleted = await deleteCommunityBugReport(itemId);
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
            source: "feedback",
            creatorState: current.creatorState,
          },
          newValue: { source: "feedback" },
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
            source: "feedback",
            creatorState: current.creatorState,
          },
          newValue: { source: "feedback" },
          stage: "delete",
          partialMutation: false,
        }),
      });
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
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
          source: "feedback",
          creatorState: current.creatorState,
        },
        newValue: { deleted: true },
      }),
    });
    return NextResponse.json({ status: "ok", deletedId: itemId });
  }

  const targetUserId = canonicalTargetUserId(current.submittedByUserId);
  const previousValue = buildSnapshot("feedback", current);

  if (action === "mark_treated") {
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
      await appendDecisionAudit({
        operationId,
        actorUserId,
        outcome: "error",
        targetId: itemId,
        details: buildAuditDetails({
          reason,
          targetUserId,
          previousValue,
          newValue: buildSnapshot("feedback", {
            status: "treated",
            creatorState: "treated",
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
        newValue: buildSnapshot("feedback", updated),
      }),
    });
    return NextResponse.json({
      status: "ok",
      item: buildFeedbackInboxItem(updated),
    });
  }

  let creatorStateUpdated;
  try {
    creatorStateUpdated = await updateCommunityBugReportCreatorState({
      reportId: itemId,
      creatorState: action === "responded" ? "responded" : "archived",
    });
    if (!creatorStateUpdated) {
      throw new Error("feedback creator state update did not persist");
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
        newValue: buildSnapshot("feedback", {
          status: current.status,
          creatorState: action === "responded" ? "responded" : "archived",
        }),
        stage: "update",
        partialMutation: false,
      }),
    });
    return mutationErrorResponse();
  }

  let finalRecord: NonNullable<typeof creatorStateUpdated> = creatorStateUpdated;
  if (action === "archive") {
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
      await appendDecisionAudit({
        operationId,
        actorUserId,
        outcome: "error",
        targetId: itemId,
        details: buildAuditDetails({
          reason,
          targetUserId,
          previousValue,
          newValue: buildSnapshot("feedback", {
            status: "archived",
            creatorState: "archived",
          }),
          stage: "secondary_update",
          partialMutation: true,
        }),
      });
      return mutationErrorResponse();
    }
  }

  await appendDecisionAudit({
    operationId,
    actorUserId,
    outcome: "success",
    targetId: finalRecord.id,
    details: buildAuditDetails({
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("feedback", finalRecord),
    }),
  });
  return NextResponse.json({
    status: "ok",
    item: buildFeedbackInboxItem(finalRecord),
  });
}
