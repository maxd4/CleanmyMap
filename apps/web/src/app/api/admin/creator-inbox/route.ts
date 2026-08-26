import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireCreatorAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import {
  getPromotionRequestById,
  updatePromotionRequestCreatorState,
} from "@/lib/admin/promotion-requests-store";
import {
  deleteCommunityBugReport,
  getCommunityBugReportById,
  updateCommunityBugReportCreatorState,
  updateCommunityBugReportStatus,
} from "@/lib/community/bug-reports-store";
import {
  buildFeedbackInboxItem,
  buildPartnerInboxItem,
  buildPromotionInboxItem,
  type CreatorInboxSource,
} from "@/lib/community/creator-inbox";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import {
  deletePartnerOnboardingRequest,
  getPartnerOnboardingRequestById,
  updatePartnerOnboardingRequestCreatorState,
} from "@/lib/partners/onboarding-requests-store";

export const runtime = "nodejs";

const actionSchema = z
  .object({
    source: z.enum(["feedback", "promotion", "partner"]),
    itemId: z.string().trim().min(1),
    action: z.enum(["mark_treated", "responded", "archive", "delete"]),
    reason: z.string().trim().min(5).max(500),
  });

const AUDIT_OPERATION = "creator_inbox_update";

type InboxSnapshot = {
  source: CreatorInboxSource;
  status?: string;
  creatorState?: string;
};

type ErrorStage =
  | "lookup"
  | "update"
  | "secondary_update"
  | "delete";

function canonicalTargetUserId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized && normalized !== "unknown" ? normalized : undefined;
}

function buildSnapshot(
  source: Exclude<CreatorInboxSource, "event">,
  record: { status?: string; creatorState: string },
): InboxSnapshot {
  return {
    source,
    ...(record.status ? { status: record.status } : {}),
    creatorState: record.creatorState,
  };
}

function buildAuditDetails(params: {
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: ErrorStage;
  partialMutation?: boolean;
}) {
  return {
    operation: AUDIT_OPERATION,
    reason: params.reason,
    ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
    previousValue: params.previousValue,
    newValue: params.newValue,
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.partialMutation === undefined
      ? {}
      : { partialMutation: params.partialMutation }),
  };
}

function unknownSnapshot(source: Exclude<CreatorInboxSource, "event">) {
  return { source, status: "unknown", creatorState: "unknown" };
}

async function appendDecisionAudit(params: {
  operationId: string;
  actorUserId: string;
  outcome: "success" | "error";
  targetId: string;
  details: ReturnType<typeof buildAuditDetails>;
}) {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "admin_operation",
    outcome: params.outcome,
    targetId: params.targetId,
    details: params.details,
  });
}

function mutationErrorResponse() {
  return NextResponse.json(
    { error: "Unable to update creator inbox item." },
    { status: 500 },
  );
}

export async function GET() {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  try {
    const items = await loadCreatorInboxItems();
    return NextResponse.json({ status: "ok", count: items.length, items });
  } catch {
    return NextResponse.json(
      { error: "Unable to load creator inbox." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const operationId = randomUUID();
  const { source, itemId, action } = parsed.data;
  const reason = parsed.data.reason;

  if (source === "feedback") {
    let current;
    try {
      current = await getCommunityBugReportById(itemId);
    } catch {
      await appendDecisionAudit({
        operationId,
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
          actorUserId: identity.userId,
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
          actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
          actorUserId: identity.userId,
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
        actorUserId: identity.userId,
        outcome: "success",
        targetId: updated.id,
        details: buildAuditDetails({
          reason,
          targetUserId,
          previousValue,
          newValue: buildSnapshot("feedback", updated),
        }),
      });
      return NextResponse.json({ status: "ok", item: buildFeedbackInboxItem(updated) });
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
        actorUserId: identity.userId,
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
          actorUserId: identity.userId,
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
      actorUserId: identity.userId,
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

  if (source === "promotion") {
    if (action === "delete") {
      await appendDecisionAudit({
        operationId,
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
      actorUserId: identity.userId,
      outcome: "success",
      targetId: updated.id,
      details: buildAuditDetails({
        reason,
        targetUserId,
        previousValue,
        newValue: buildSnapshot("promotion", updated),
      }),
    });
    return NextResponse.json({ status: "ok", item: buildPromotionInboxItem(updated) });
  }

  let current;
  try {
    current = await getPartnerOnboardingRequestById(itemId);
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId: identity.userId,
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
      actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
        actorUserId: identity.userId,
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
      actorUserId: identity.userId,
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
      actorUserId: identity.userId,
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
    actorUserId: identity.userId,
    outcome: "success",
    targetId: updated.id,
    details: buildAuditDetails({
      reason,
      targetUserId,
      previousValue,
      newValue: buildSnapshot("partner", updated),
    }),
  });
  return NextResponse.json({ status: "ok", item: buildPartnerInboxItem(updated) });
}
