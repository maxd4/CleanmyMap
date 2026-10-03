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
type DecisionAuditContext = {
  action: string; origin: string; reason: string; automatedMeansUsed: boolean;
  legalBasis: string | null; termsBasis: string | null; contentUrl: string; contentId: string | null;
};
type DecisionAuditState = {
  beforeState: Snapshot; afterState: Snapshot; executionStatus: string;
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null; stage?: string;
  partialMutation?: boolean; notificationError?: string;
};

function isContentMutationAction(
  action: LegalContentReportDecisionAction,
): action is Extract<LegalContentReportDecisionAction, "content_restricted" | "content_removed"> {
  return action === "content_restricted" || action === "content_removed";
}

function reportSnapshot(report: { status: string; creatorState: string; contentUrl: string; contentId: string | null }): Snapshot {
  return { source: "legal_content_report", status: report.status, creatorState: report.creatorState, contentUrl: report.contentUrl, contentId: report.contentId };
}

function auditDetails(context: DecisionAuditContext, state: DecisionAuditState): Record<string, unknown> {
  return {
    operation: "legal_content_report_decision",
    ...context,
    beforeState: state.beforeState, afterState: state.afterState,
    executionStatus: state.executionStatus, executionErrorCode: state.executionErrorCode,
    ...(state.stage ? { stage: state.stage } : {}),
    ...(state.partialMutation === undefined ? {} : { partialMutation: state.partialMutation }),
    ...(state.notificationError ? { notificationError: state.notificationError } : {}),
  };
}

function errorResponse(message: string, status: number, operationId: string) {
  return NextResponse.json({ error: message, operationId }, { status });
}

async function persistExecutionState(params: { decision: LegalContentReportDecisionRecord; executionStatus: LegalContentReportDecisionRecord["executionStatus"]; executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null; beforeState: Snapshot; afterState: Snapshot }) {
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

type DecisionInput = z.infer<typeof decisionSchema>;
type LoadedLegalContentReport = NonNullable<Awaited<ReturnType<typeof getLegalContentReportById>>>;
type ContentMutationAction = Extract<LegalContentReportDecisionAction, "content_restricted" | "content_removed">;

type DecisionWorkflowParams = {
  operationId: string; actorUserId: string; decisionInput: DecisionInput; report: LoadedLegalContentReport;
  auditContext: DecisionAuditContext; appendDecisionAudit: typeof appendDecisionAudit;
};
type DecisionWorkflowState = {
  report: LoadedLegalContentReport; decision: LegalContentReportDecisionRecord;
  beforeState: Snapshot; afterState: Snapshot; authorEmail: string | null; mutationApplied: boolean;
  decisionProjectionFailed: boolean; reportProjectionFailed: boolean; notificationErrors: string[];
};

async function appendDecisionAudit(
  params: DecisionWorkflowParams,
  outcome: "success" | "error",
  auditState: DecisionAuditState,
): Promise<boolean> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId, at: new Date().toISOString(), actorUserId: params.actorUserId,
      operationType: "moderation", outcome, targetId: params.report.id,
      details: auditDetails(params.auditContext, auditState),
    });
    return true;
  } catch (error) {
    console.error("Legal content report decision audit failed", error);
    return false;
  }
}

async function checkMutationCapability(
  params: DecisionWorkflowParams,
  contentMutationAction: ContentMutationAction | null,
): Promise<NextResponse | null> {
  const hasCanonicalCapability =
    contentMutationAction &&
    ["action", "actions"].includes(params.report.contentType?.trim().toLowerCase() ?? "") &&
    Boolean(params.report.contentId);
  if (hasCanonicalCapability) return null;
  if (!contentMutationAction) return null;

  await params.appendDecisionAudit(params, "error", {
    beforeState: reportSnapshot(params.report), afterState: reportSnapshot(params.report),
    executionStatus: "not_applicable", executionErrorCode: null,
    stage: "capability_check", partialMutation: false,
  });
  return errorResponse("A canonical content mutation is not available for this content type.", 409, params.operationId);
}

async function persistInitialDecision(
  params: DecisionWorkflowParams,
  initialExecutionStatus: LegalContentReportDecisionRecord["executionStatus"],
): Promise<{ decision: LegalContentReportDecisionRecord } | { response: NextResponse }> {
  const beforeState = reportSnapshot(params.report);
  try {
    const decision = await appendLegalContentReportDecision({
      reportId: params.report.id, actorAdminUserId: params.actorUserId,
      action: params.decisionInput.action, origin: params.decisionInput.origin,
      reason: params.decisionInput.reason, automatedMeansUsed: params.decisionInput.automatedMeansUsed,
      legalBasis: params.decisionInput.legalBasis ?? null, termsBasis: params.decisionInput.termsBasis ?? null,
      contentUrl: params.report.contentUrl, contentId: params.report.contentId,
      beforeState, afterState: beforeState, executionStatus: initialExecutionStatus,
      executionErrorCode: null, auditOperationId: params.operationId,
    });
    return { decision };
  } catch {
    await params.appendDecisionAudit(params, "error", {
      beforeState, afterState: beforeState, executionStatus: initialExecutionStatus,
      executionErrorCode: null, stage: "decision_persistence", partialMutation: false,
    });
    return { response: errorResponse("Decision persistence is incomplete.", 500, params.operationId) };
  }
}

async function projectNonMutativeDecision(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<NextResponse | null> {
  try {
    const updatedReport = await updateLegalContentReportState({
      reportId: state.report.id,
      creatorState: params.decisionInput.action,
    });
    if (!updatedReport) throw new Error("Legal report state projection did not persist");
    state.afterState = reportSnapshot(updatedReport);
    const projectedDecision = await persistExecutionState({
      decision: state.decision, executionStatus: "not_applicable", executionErrorCode: null,
      beforeState: state.beforeState, afterState: state.afterState,
    });
    state.decision = projectedDecision.decision;
    state.decisionProjectionFailed = !projectedDecision.persisted;
    state.report = { ...updatedReport, latestDecision: state.decision };
    return null;
  } catch {
    await params.appendDecisionAudit(params, "error", {
      beforeState: state.beforeState, afterState: state.afterState,
      executionStatus: state.decision.executionStatus,
      executionErrorCode: state.decision.executionErrorCode, stage: "report_projection", partialMutation: false,
    });
    return errorResponse("Decision recorded but report projection is incomplete.", 500, params.operationId);
  }
}

async function markExecutionFailed(
  state: DecisionWorkflowState,
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode,
): Promise<void> {
  const result = await persistExecutionState({
    decision: state.decision, executionStatus: "failed", executionErrorCode,
    beforeState: state.beforeState, afterState: state.afterState,
  });
  state.decision = result.decision;
}

async function applyContentMutation(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
  contentMutationAction: ContentMutationAction,
): Promise<void> {
  let mutation: Awaited<ReturnType<typeof applyCanonicalLegalContentMutation>> | null = null;
  let mutationError = false;
  try {
    mutation = await applyCanonicalLegalContentMutation({
      action: contentMutationAction, contentType: params.report.contentType,
      contentId: params.report.contentId, actorUserId: params.actorUserId,
      reason: params.decisionInput.reason,
    });
  } catch {
    mutationError = true;
  }

  if (mutationError) {
    await markExecutionFailed(state, "mutation_failed");
    return;
  }
  if (!mutation?.supported) {
    await markExecutionFailed(state, "capability_unavailable");
    return;
  }
  if (!mutation.found) {
    state.beforeState = mutation.beforeState;
    state.afterState = mutation.afterState;
    await markExecutionFailed(state, "content_not_found");
    return;
  }

  state.beforeState = mutation.beforeState;
  state.afterState = mutation.afterState;
  state.authorEmail = mutation.authorEmail;
  state.mutationApplied = true;
  const appliedState = await persistExecutionState({
    decision: state.decision, executionStatus: "applied", executionErrorCode: null,
    beforeState: state.beforeState, afterState: state.afterState,
  });
  state.decision = appliedState.decision;
  state.decisionProjectionFailed = !appliedState.persisted;

  try {
    const updatedReport = await updateLegalContentReportState({
      reportId: state.report.id,
      creatorState: params.decisionInput.action,
    });
    if (!updatedReport) throw new Error("Legal report state projection did not persist");
    state.report = { ...updatedReport, latestDecision: state.decision };
  } catch {
    state.reportProjectionFailed = true;
  }
}

async function auditExecutionResult(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<NextResponse | null> {
  const executionFailed = state.decision.executionStatus === "failed";
  const projectionFailed = state.decisionProjectionFailed || state.reportProjectionFailed;
  const auditSucceeded = await params.appendDecisionAudit(
    params,
    executionFailed || projectionFailed ? "error" : "success",
    {
      beforeState: state.beforeState, afterState: state.afterState,
      executionStatus: state.decision.executionStatus, executionErrorCode: state.decision.executionErrorCode,
      stage: executionFailed
        ? "execution"
        : state.reportProjectionFailed
          ? "report_projection"
          : state.decisionProjectionFailed
            ? "decision_projection"
            : undefined,
      partialMutation: state.mutationApplied,
    },
  );
  return auditSucceeded
    ? null
    : errorResponse("Decision recorded but audit is incomplete.", 500, params.operationId);
}

async function notifyDecision(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<void> {
  let notifierStatus: "not_requested" | "sent" | "failed" = "not_requested";
  let authorStatus: "not_requested" | "sent" | "failed" = "not_requested";
  if (state.report.notifierEmail) {
    try {
      const result = await sendLegalContentReportDecisionToNotifier({
        record: state.report,
        decision: state.decision,
        actorUserId: params.actorUserId,
      });
      notifierStatus = result && (result.status === "sent" || result.status === "mocked") ? "sent" : "failed";
      if (notifierStatus === "failed") state.notificationErrors.push("notifier");
    } catch {
      notifierStatus = "failed";
      state.notificationErrors.push("notifier");
    }
  }
  if (state.authorEmail && state.decision.executionStatus === "applied" && isContentMutationAction(state.decision.action)) {
    try {
      const result = await sendLegalContentReportDecisionToAuthor({
        authorEmail: state.authorEmail,
        decision: state.decision,
        allegationReason: state.report.allegationReason,
        actorUserId: params.actorUserId,
      });
      authorStatus = result && (result.status === "sent" || result.status === "mocked") ? "sent" : "failed";
      if (authorStatus === "failed") state.notificationErrors.push("author");
    } catch {
      authorStatus = "failed";
      state.notificationErrors.push("author");
    }
  }

  if (notifierStatus === "not_requested" && authorStatus === "not_requested") return;
  const notificationError = state.notificationErrors.length > 0 ? state.notificationErrors.join(",") : null;
  await updateLegalContentReportDecisionNotifications({
    decisionId: state.decision.id, notifierNotificationStatus: notifierStatus,
    authorNotificationStatus: authorStatus, notificationError,
  });
  if (state.notificationErrors.length === 0) return;

  await params.appendDecisionAudit(params, "error", {
    beforeState: state.beforeState, afterState: state.afterState,
    executionStatus: state.decision.executionStatus, executionErrorCode: state.decision.executionErrorCode,
    stage: "notification", partialMutation: state.decision.executionStatus === "applied",
    notificationError: notificationError ?? undefined,
  });
}

function finalDecisionResponse(
  operationId: string,
  state: DecisionWorkflowState,
): NextResponse {
  const partialWarnings: string[] = [];
  if (state.reportProjectionFailed) {
    partialWarnings.push("The content measure was applied but the report projection failed.");
  }
  if (state.decisionProjectionFailed) {
    partialWarnings.push(
      state.mutationApplied
        ? "The content measure was applied but its execution state projection failed."
        : "The report was projected but its decision state projection failed.",
    );
  }
  if (state.notificationErrors.length > 0) {
    partialWarnings.push("Decision recorded; at least one notification failed.");
  }
  if (partialWarnings.length > 0) {
    return NextResponse.json({
      status: "partial", operationId, warning: partialWarnings.join(" "),
      item: buildLegalContentReportInboxItem(state.report),
    }, { status: 207 });
  }
  if (state.decision.executionStatus === "failed") {
    return NextResponse.json({
      status: "failed", operationId, executionStatus: state.decision.executionStatus,
      executionErrorCode: state.decision.executionErrorCode,
      item: buildLegalContentReportInboxItem(state.report),
    }, { status: 500 });
  }
  return NextResponse.json(
    { status: "ok", operationId, item: buildLegalContentReportInboxItem(state.report) }, { status: 200 },
  );
}

async function runDecisionWorkflow(
  params: DecisionWorkflowParams,
): Promise<NextResponse> {
  const contentMutationAction = isContentMutationAction(params.decisionInput.action)
    ? params.decisionInput.action
    : null;
  const capabilityResponse = await checkMutationCapability(params, contentMutationAction);
  if (capabilityResponse) return capabilityResponse;

  const initialExecutionStatus = contentMutationAction ? "pending" : "not_applicable";
  const persisted = await persistInitialDecision(params, initialExecutionStatus);
  if ("response" in persisted) return persisted.response;
  const beforeState = reportSnapshot(params.report);
  const state: DecisionWorkflowState = {
    report: params.report, decision: persisted.decision, beforeState, afterState: beforeState,
    authorEmail: null, mutationApplied: false, decisionProjectionFailed: false,
    reportProjectionFailed: false, notificationErrors: [],
  };

  if (contentMutationAction) {
    await applyContentMutation(params, state, contentMutationAction);
  } else {
    const projectionResponse = await projectNonMutativeDecision(params, state);
    if (projectionResponse) return projectionResponse;
  }
  state.report = { ...state.report, latestDecision: state.decision };
  const auditResponse = await auditExecutionResult(params, state);
  if (auditResponse) return auditResponse;
  await notifyDecision(params, state);
  return finalDecisionResponse(params.operationId, state);
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
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors, operationId },
      { status: 400 },
    );
  }

  const decisionInput = parsed.data;
  let report: LoadedLegalContentReport;
  try {
    const loadedReport = await getLegalContentReportById(decisionInput.reportId);
    if (!loadedReport) return errorResponse("Legal content report not found.", 404, operationId);
    report = loadedReport;
  } catch {
    return errorResponse("Unable to load legal content report.", 500, operationId);
  }

  const auditContext: DecisionAuditContext = {
    action: decisionInput.action, origin: decisionInput.origin, reason: decisionInput.reason,
    automatedMeansUsed: decisionInput.automatedMeansUsed,
    legalBasis: decisionInput.legalBasis ?? null, termsBasis: decisionInput.termsBasis ?? null,
    contentUrl: report.contentUrl, contentId: report.contentId,
  };

  return runDecisionWorkflow({
    operationId,
    actorUserId: identity.userId,
    decisionInput,
    report,
    auditContext,
    appendDecisionAudit,
  });
}
