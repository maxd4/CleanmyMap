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
  updateLegalContentReportDecisionNotifications,
  updateLegalContentReportDecisionStates,
} from "@/lib/legal-content-report/legal-content-report-decisions-store";
import {
  LEGAL_CONTENT_REPORT_DECISION_ACTIONS,
  LEGAL_CONTENT_REPORT_DECISION_ORIGINS,
  type LegalContentReportDecisionAction,
  type LegalContentReportDecisionExecutionErrorCode,
  type LegalContentReportDecisionRecord,
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

function isContentMutationAction(
  action: LegalContentReportDecisionAction,
): action is Extract<LegalContentReportDecisionAction, "content_restricted" | "content_removed"> {
  return action === "content_restricted" || action === "content_removed";
}

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
  executionStatus: string;
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null;
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
    executionStatus: params.executionStatus,
    executionErrorCode: params.executionErrorCode,
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

async function persistExecutionState(params: {
  decision: LegalContentReportDecisionRecord;
  executionStatus: LegalContentReportDecisionRecord["executionStatus"];
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null;
  beforeState: Snapshot;
  afterState: Snapshot;
}) {
  const fallback: LegalContentReportDecisionRecord = {
    ...params.decision,
    beforeState: params.beforeState,
    afterState: params.afterState,
    executionStatus: params.executionStatus,
    executionErrorCode: params.executionErrorCode,
  };
  try {
    const updated = await updateLegalContentReportDecisionStates({
      decisionId: params.decision.id,
      beforeState: params.beforeState,
      afterState: params.afterState,
      executionStatus: params.executionStatus,
      executionErrorCode: params.executionErrorCode,
    });
    return {
      decision: updated ?? fallback,
      persisted: Boolean(updated),
    };
  } catch {
    return { decision: fallback, persisted: false };
  }
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

  const contentMutationAction = isContentMutationAction(decisionInput.action)
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
        action: decisionInput.action,
        origin: decisionInput.origin,
        reason: decisionInput.reason,
        automatedMeansUsed: decisionInput.automatedMeansUsed,
        legalBasis: decisionInput.legalBasis ?? null,
        termsBasis: decisionInput.termsBasis ?? null,
        contentUrl: report.contentUrl,
        contentId: report.contentId,
        beforeState: reportSnapshot(report),
        afterState: reportSnapshot(report),
        executionStatus: "not_applicable",
        executionErrorCode: null,
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

  const initialExecutionStatus = isContentMutation ? "pending" : "not_applicable";
  let decision: LegalContentReportDecisionRecord;
  const beforeReportState = reportSnapshot(report);
  let beforeState = beforeReportState;
  let afterState = beforeReportState;
  let authorEmail: string | null = null;
  let decisionProjectionFailed = false;
  let reportProjectionFailed = false;
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
      executionStatus: initialExecutionStatus,
      executionErrorCode: null,
      auditOperationId: operationId,
    });
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
        executionStatus: initialExecutionStatus,
        executionErrorCode: null,
        stage: "decision_persistence",
        partialMutation: false,
      }),
    });
    return errorResponse("Decision persistence is incomplete.", 500, operationId);
  }

  if (!isContentMutation) {
    try {
      const updatedReport = await updateLegalContentReportState({
        reportId: report.id,
        creatorState: decisionInput.action,
      });
      if (!updatedReport) throw new Error("Legal report state projection did not persist");
      report = { ...updatedReport, latestDecision: decision };
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
          executionStatus: decision.executionStatus,
          executionErrorCode: decision.executionErrorCode,
          stage: "report_projection",
          partialMutation: false,
        }),
      });
      return errorResponse("Decision recorded but report projection is incomplete.", 500, operationId);
    }
  } else {
    let mutation: Awaited<ReturnType<typeof applyCanonicalLegalContentMutation>> | null = null;
    let mutationError = false;
    let mutationApplied = false;

    try {
      mutation = await applyCanonicalLegalContentMutation({
        action: contentMutationAction,
        contentType: report.contentType,
        contentId: report.contentId,
        actorUserId: identity.userId,
        reason: decisionInput.reason,
      });
    } catch {
      mutationError = true;
    }

    const markExecutionFailed = async (
      executionErrorCode: LegalContentReportDecisionExecutionErrorCode,
    ) => {
      const result = await persistExecutionState({
        decision,
        executionStatus: "failed",
        executionErrorCode,
        beforeState,
        afterState,
      });
      decision = result.decision;
      return result.persisted;
    };

    if (mutationError) {
      await markExecutionFailed("mutation_failed");
    } else if (!mutation?.supported) {
      await markExecutionFailed("capability_unavailable");
    } else if (!mutation.found) {
      beforeState = mutation.beforeState;
      afterState = mutation.afterState;
      await markExecutionFailed("content_not_found");
    } else {
      beforeState = mutation.beforeState;
      afterState = mutation.afterState;
      authorEmail = mutation.authorEmail;
      mutationApplied = true;

      const appliedState = await persistExecutionState({
        decision,
        executionStatus: "applied",
        executionErrorCode: null,
        beforeState,
        afterState,
      });
      decision = appliedState.decision;
      decisionProjectionFailed = !appliedState.persisted;

      try {
        const updatedReport = await updateLegalContentReportState({
          reportId: report.id,
          creatorState: decisionInput.action,
        });
        if (!updatedReport) throw new Error("Legal report state projection did not persist");
        report = { ...updatedReport, latestDecision: decision };
      } catch {
        reportProjectionFailed = true;
      }
    }

    report = { ...report, latestDecision: decision };
    const executionFailed = decision.executionStatus !== "applied";
    const projectionFailed = decisionProjectionFailed || reportProjectionFailed;
    const auditSucceeded = await appendDecisionAudit({
      operationId,
      actorUserId: identity.userId,
      reportId: report.id,
      outcome: executionFailed || projectionFailed ? "error" : "success",
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
        executionStatus: decision.executionStatus,
        executionErrorCode: decision.executionErrorCode,
        stage: executionFailed
          ? "execution"
          : reportProjectionFailed
            ? "report_projection"
            : decisionProjectionFailed
              ? "decision_projection"
              : undefined,
        partialMutation: mutationApplied,
      }),
    });
    if (!auditSucceeded) {
      return errorResponse("Decision recorded but audit is incomplete.", 500, operationId);
    }
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
  if (authorEmail && decision.executionStatus === "applied" && isContentMutationAction(decision.action)) {
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
        executionStatus: decision.executionStatus,
        executionErrorCode: decision.executionErrorCode,
        stage: "notification",
        partialMutation: decision.executionStatus === "applied",
        notificationError: notificationErrors.join(","),
      }),
    });
  }

  const partialWarnings: string[] = [];
  if (reportProjectionFailed) {
    partialWarnings.push("The content measure was applied but the report projection failed.");
  }
  if (decisionProjectionFailed) {
    partialWarnings.push("The content measure was applied but its execution state projection failed.");
  }
  if (notificationErrors.length > 0) {
    partialWarnings.push("Decision recorded; at least one notification failed.");
  }
  if (partialWarnings.length > 0) {
    return NextResponse.json(
      {
        status: "partial",
        operationId,
        warning: partialWarnings.join(" "),
        item: buildLegalContentReportInboxItem(report),
      },
      { status: 207 },
    );
  }

  if (decision.executionStatus === "failed") {
    return NextResponse.json(
      {
        status: "failed",
        operationId,
        executionStatus: decision.executionStatus,
        executionErrorCode: decision.executionErrorCode,
        item: buildLegalContentReportInboxItem(report),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { status: "ok", operationId, item: buildLegalContentReportInboxItem(report) },
    { status: 200 },
  );
}
