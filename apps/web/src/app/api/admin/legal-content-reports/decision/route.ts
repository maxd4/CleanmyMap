import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity, requireAdminAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { applyCanonicalLegalContentMutation } from "@/lib/admin/moderation/legal-content-moderation";
import { buildLegalContentReportInboxItem } from "@/lib/community/creator-inbox";
import {
  getLegalContentReportById,
  updateLegalContentReportState,
} from "@/lib/legal-content-report/legal-content-report-store";
import {
  appendLegalContentReportDecision,
  updateLegalContentReportDecisionStates,
  updateLegalContentReportDecisionNotifications,
} from "@/lib/legal-content-report/legal-content-report-decisions-store";
import {
  LEGAL_CONTENT_REPORT_DECISION_ACTIONS,
  LEGAL_CONTENT_REPORT_DECISION_ORIGINS,
} from "@/lib/legal-content-report/legal-content-report";
import {
  sendLegalContentReportDecisionToAuthor,
  sendLegalContentReportDecisionToNotifier,
} from "@/lib/legal-content-report/legal-content-report-service";

export const runtime = "nodejs";

const decisionSchema = z
  .object({
    reportId: z.string().trim().min(1),
    action: z.enum(LEGAL_CONTENT_REPORT_DECISION_ACTIONS),
    origin: z.enum(LEGAL_CONTENT_REPORT_DECISION_ORIGINS),
    reason: z.string().trim().min(5).max(2000),
    automatedMeansUsed: z.boolean(),
    legalBasis: z.string().trim().max(1000).optional(),
    termsBasis: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    const hasLegalBasis = Boolean(value.legalBasis);
    const hasTermsBasis = Boolean(value.termsBasis);
    if (hasLegalBasis && hasTermsBasis) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalBasis"],
        message: "Choose legalBasis or termsBasis, not both.",
      });
    }
    if (
      (value.action === "content_restricted" || value.action === "content_removed") &&
      !hasLegalBasis &&
      !hasTermsBasis
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalBasis"],
        message: "A legal or terms basis is required for a content restriction.",
      });
    }
  });

type Snapshot = Record<string, unknown>;

function reportSnapshot(report: {
  status: string;
  creatorState: string;
  contentUrl: string;
  contentId: string | null;
}): Snapshot {
  return {
    source: "legal_content_report",
    status: report.status,
    creatorState: report.creatorState,
    contentUrl: report.contentUrl,
    contentId: report.contentId,
  };
}

function auditDetails(params: {
  action: string;
  origin: string;
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis: string | null;
  termsBasis: string | null;
  contentUrl: string;
  contentId: string | null;
  beforeState: Snapshot;
  afterState: Snapshot;
  stage?: string;
  partialMutation?: boolean;
  notificationError?: string;
}): Record<string, unknown> {
  return {
    operation: "legal_content_report_decision",
    action: params.action,
    origin: params.origin,
    reason: params.reason,
    automatedMeansUsed: params.automatedMeansUsed,
    legalBasis: params.legalBasis,
    termsBasis: params.termsBasis,
    contentUrl: params.contentUrl,
    contentId: params.contentId,
    beforeState: params.beforeState,
    afterState: params.afterState,
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.partialMutation === undefined
      ? {}
      : { partialMutation: params.partialMutation }),
    ...(params.notificationError
      ? { notificationError: params.notificationError }
      : {}),
  };
}

async function appendDecisionAudit(params: {
  operationId: string;
  actorUserId: string;
  reportId: string;
  outcome: "success" | "error";
  details: Record<string, unknown>;
}): Promise<boolean> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "moderation",
      outcome: params.outcome,
      targetId: params.reportId,
      details: params.details,
    });
    return true;
  } catch (error) {
    console.error("Legal content report decision audit failed", error);
    return false;
  }
}

function errorResponse(message: string, status: number, operationId: string) {
  return NextResponse.json(
    { error: message, operationId },
    { status },
  );
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return errorResponse(access.error, access.status, randomUUID());
  }

  const identity = await getCurrentUserIdentity({ userId: access.userId });
  if (!identity || identity.userId !== access.userId) {
    return errorResponse("Forbidden", 403, randomUUID());
  }

  const operationId = randomUUID();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON payload", 400, operationId);
  }
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
        operationId,
      },
      { status: 400 },
    );
  }

  const decisionInput = parsed.data;
  let report;
  try {
    report = await getLegalContentReportById(decisionInput.reportId);
  } catch {
    return errorResponse("Unable to load legal content report.", 500, operationId);
  }
  if (!report) return errorResponse("Legal content report not found.", 404, operationId);

  const beforeReportState = reportSnapshot(report);
  let beforeState = beforeReportState;
  let afterState = beforeReportState;
  let authorEmail: string | null = null;
  const contentMutationAction =
    decisionInput.action === "content_restricted" ||
    decisionInput.action === "content_removed"
      ? decisionInput.action
      : null;
  const isContentMutation = contentMutationAction !== null;

  if (
    isContentMutation &&
    (!["action", "actions"].includes(report.contentType?.trim().toLowerCase() ?? "") ||
      !report.contentId)
  ) {
    await appendDecisionAudit({
      operationId,
      actorUserId: identity.userId,
      reportId: report.id,
      outcome: "error",
      details: auditDetails({
        action: contentMutationAction,
        origin: decisionInput.origin,
        reason: decisionInput.reason,
        automatedMeansUsed: decisionInput.automatedMeansUsed,
        legalBasis: decisionInput.legalBasis ?? null,
        termsBasis: decisionInput.termsBasis ?? null,
        contentUrl: report.contentUrl,
        contentId: report.contentId,
        beforeState,
        afterState,
        stage: "capability_check",
        partialMutation: false,
      }),
    });
    return errorResponse(
      "A canonical content mutation is not available for this content type.",
      409,
      operationId,
    );
  }

  let decision;
  try {
    decision = await appendLegalContentReportDecision({
      reportId: report.id,
      actorAdminUserId: identity.userId,
      action: decisionInput.action,
      origin: decisionInput.origin,
      reason: decisionInput.reason,
      automatedMeansUsed: decisionInput.automatedMeansUsed,
      legalBasis: decisionInput.legalBasis ?? null,
      termsBasis: decisionInput.termsBasis ?? null,
      contentUrl: report.contentUrl,
      contentId: report.contentId,
      beforeState,
      afterState,
      auditOperationId: operationId,
    });
    if (!isContentMutation) {
      const updatedReport = await updateLegalContentReportState({
        reportId: report.id,
        creatorState: decisionInput.action,
      });
      if (!updatedReport) throw new Error("Legal report state projection did not persist");
      report = { ...updatedReport, latestDecision: decision };
    }
  } catch {
    await appendDecisionAudit({
      operationId,
      actorUserId: identity.userId,
      reportId: report.id,
      outcome: "error",
      details: auditDetails({
        action: decisionInput.action,
        origin: decisionInput.origin,
        reason: decisionInput.reason,
        automatedMeansUsed: decisionInput.automatedMeansUsed,
        legalBasis: decisionInput.legalBasis ?? null,
        termsBasis: decisionInput.termsBasis ?? null,
        contentUrl: report.contentUrl,
        contentId: report.contentId,
        beforeState,
        afterState,
        stage: "decision_persistence",
        partialMutation: decisionInput.action === "content_restricted" || decisionInput.action === "content_removed",
      }),
    });
    return errorResponse("Decision persistence is incomplete.", 500, operationId);
  }

  if (isContentMutation) {
    try {
      const mutation = await applyCanonicalLegalContentMutation({
        action: contentMutationAction,
        contentType: report.contentType,
        contentId: report.contentId,
        actorUserId: identity.userId,
        reason: decisionInput.reason,
      });
      if (!mutation.supported) {
        throw new Error("canonical content capability disappeared");
      }
      if (!mutation.found) {
        await appendDecisionAudit({
          operationId: randomUUID(),
          actorUserId: identity.userId,
          reportId: report.id,
          outcome: "error",
          details: auditDetails({
            action: decisionInput.action,
            origin: decisionInput.origin,
            reason: decisionInput.reason,
            automatedMeansUsed: decisionInput.automatedMeansUsed,
            legalBasis: decisionInput.legalBasis ?? null,
            termsBasis: decisionInput.termsBasis ?? null,
            contentUrl: report.contentUrl,
            contentId: report.contentId,
            beforeState: mutation.beforeState,
            afterState: mutation.afterState,
            stage: "content_lookup",
            partialMutation: false,
          }),
        });
        return errorResponse("Reported content not found.", 404, operationId);
      }
      beforeState = mutation.beforeState;
      afterState = mutation.afterState;
      authorEmail = mutation.authorEmail;
      decision = (await updateLegalContentReportDecisionStates({
        decisionId: decision.id,
        beforeState,
        afterState,
      })) ?? decision;
      const updatedReport = await updateLegalContentReportState({
        reportId: report.id,
        creatorState: decisionInput.action,
      });
      if (!updatedReport) throw new Error("Legal report state projection did not persist");
      report = { ...updatedReport, latestDecision: decision };
    } catch {
      await appendDecisionAudit({
        operationId: randomUUID(),
        actorUserId: identity.userId,
        reportId: report.id,
        outcome: "error",
        details: auditDetails({
          action: decisionInput.action,
          origin: decisionInput.origin,
          reason: decisionInput.reason,
          automatedMeansUsed: decisionInput.automatedMeansUsed,
          legalBasis: decisionInput.legalBasis ?? null,
          termsBasis: decisionInput.termsBasis ?? null,
          contentUrl: report.contentUrl,
          contentId: report.contentId,
          beforeState,
          afterState,
          stage: "content_mutation",
          partialMutation: false,
        }),
      });
      return errorResponse("Decision recorded but content mutation is incomplete.", 500, operationId);
    }
  }

  const auditSucceeded = await appendDecisionAudit({
    operationId,
    actorUserId: identity.userId,
    reportId: report.id,
    outcome: "success",
    details: auditDetails({
      action: decisionInput.action,
      origin: decisionInput.origin,
      reason: decisionInput.reason,
      automatedMeansUsed: decisionInput.automatedMeansUsed,
      legalBasis: decisionInput.legalBasis ?? null,
      termsBasis: decisionInput.termsBasis ?? null,
      contentUrl: report.contentUrl,
      contentId: report.contentId,
      beforeState,
      afterState,
    }),
  });
  if (!auditSucceeded) {
    return errorResponse("Decision recorded but audit is incomplete.", 500, operationId);
  }

  let notifierStatus: "not_requested" | "sent" | "failed" = "not_requested";
  let authorStatus: "not_requested" | "sent" | "failed" = "not_requested";
  const notificationErrors: string[] = [];
  if (report.notifierEmail) {
    try {
      const result = await sendLegalContentReportDecisionToNotifier({
        record: report,
        decision,
        actorUserId: identity.userId,
      });
      notifierStatus = result && (result.status === "sent" || result.status === "mocked") ? "sent" : "failed";
      if (notifierStatus === "failed") notificationErrors.push("notifier");
    } catch {
      notifierStatus = "failed";
      notificationErrors.push("notifier");
    }
  }
  if (authorEmail && (decisionInput.action === "content_restricted" || decisionInput.action === "content_removed")) {
    try {
      const result = await sendLegalContentReportDecisionToAuthor({
        authorEmail,
        decision,
        allegationReason: report.allegationReason,
        actorUserId: identity.userId,
      });
      authorStatus = result && (result.status === "sent" || result.status === "mocked") ? "sent" : "failed";
      if (authorStatus === "failed") notificationErrors.push("author");
    } catch {
      authorStatus = "failed";
      notificationErrors.push("author");
    }
  }

  if (notifierStatus !== "not_requested" || authorStatus !== "not_requested") {
    await updateLegalContentReportDecisionNotifications({
      decisionId: decision.id,
      notifierNotificationStatus: notifierStatus,
      authorNotificationStatus: authorStatus,
      notificationError: notificationErrors.length > 0 ? notificationErrors.join(",") : null,
    });
  }

  if (notificationErrors.length > 0) {
    await appendDecisionAudit({
      operationId: randomUUID(),
      actorUserId: identity.userId,
      reportId: report.id,
      outcome: "error",
      details: auditDetails({
        action: decisionInput.action,
        origin: decisionInput.origin,
        reason: decisionInput.reason,
        automatedMeansUsed: decisionInput.automatedMeansUsed,
        legalBasis: decisionInput.legalBasis ?? null,
        termsBasis: decisionInput.termsBasis ?? null,
        contentUrl: report.contentUrl,
        contentId: report.contentId,
        beforeState,
        afterState,
        stage: "notification",
        partialMutation: true,
        notificationError: notificationErrors.join(","),
      }),
    });
    return NextResponse.json(
      {
        status: "partial",
        operationId,
        warning: "Decision recorded; at least one notification failed.",
        item: buildLegalContentReportInboxItem(report),
      },
      { status: 207 },
    );
  }

  return NextResponse.json(
    { status: "ok", operationId, item: buildLegalContentReportInboxItem(report) },
    { status: 200 },
  );
}
