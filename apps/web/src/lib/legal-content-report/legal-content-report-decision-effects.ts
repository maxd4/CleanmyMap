import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { applyCanonicalLegalContentMutation } from "@/lib/admin/moderation/legal-content-moderation";
import {
  updateLegalContentReportDecisionNotifications,
  updateLegalContentReportDecisionStates,
} from "./legal-content-report-decisions-store";
import { updateLegalContentReportState } from "./legal-content-report-store";
import {
  type LegalContentReportDecisionAction,
  type LegalContentReportDecisionExecutionErrorCode,
} from "./legal-content-report";
import {
  sendLegalContentReportDecisionToAuthor,
  sendLegalContentReportDecisionToNotifier,
} from "./legal-content-report-service";
import {
  type DecisionAuditState,
  type DecisionWorkflowParams,
  type DecisionWorkflowState,
  type Snapshot,
  type WorkflowAuditParams,
} from "./legal-content-report-decision-contract";

type ContentMutationAction = Extract<
  LegalContentReportDecisionAction,
  "content_restricted" | "content_removed"
>;

function isContentMutationAction(
  action: LegalContentReportDecisionAction,
): action is ContentMutationAction {
  return action === "content_restricted" || action === "content_removed";
}

function auditDetails(
  context: DecisionWorkflowParams["auditContext"],
  state: DecisionAuditState,
): Record<string, unknown> {
  return {
    operation: "legal_content_report_decision",
    ...context,
    beforeState: state.beforeState,
    afterState: state.afterState,
    executionStatus: state.executionStatus,
    executionErrorCode: state.executionErrorCode,
    ...(state.stage ? { stage: state.stage } : {}),
    ...(state.partialMutation === undefined
      ? {}
      : { partialMutation: state.partialMutation }),
    ...(state.notificationError
      ? { notificationError: state.notificationError }
      : {}),
  };
}

export async function appendDecisionAudit(
  params: WorkflowAuditParams,
  outcome: "success" | "error",
  auditState: DecisionAuditState,
): Promise<boolean> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "moderation",
      outcome,
      targetId: params.reportId,
      details: auditDetails(params.auditContext, auditState),
    });
    return true;
  } catch (error) {
    console.error("Legal content report decision audit failed", error);
    return false;
  }
}

export async function persistExecutionState(params: {
  decision: DecisionWorkflowState["decision"];
  executionStatus: DecisionWorkflowState["decision"]["executionStatus"];
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null;
  beforeState: Snapshot;
  afterState: Snapshot;
}) {
  const fallback = {
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
    return { decision: updated ?? fallback, persisted: Boolean(updated) };
  } catch {
    return { decision: fallback, persisted: false };
  }
}

export async function markExecutionFailed(
  state: DecisionWorkflowState,
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode,
): Promise<void> {
  const result = await persistExecutionState({
    decision: state.decision,
    executionStatus: "failed",
    executionErrorCode,
    beforeState: state.beforeState,
    afterState: state.afterState,
  });
  state.decision = result.decision;
}

export async function applyContentMutation(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
  contentMutationAction: ContentMutationAction,
): Promise<void> {
  let mutation: Awaited<ReturnType<typeof applyCanonicalLegalContentMutation>> | null = null;
  try {
    mutation = await applyCanonicalLegalContentMutation({
      action: contentMutationAction,
      contentType: params.report.contentType,
      contentId: params.report.contentId,
      actorUserId: params.actorUserId,
      reason: params.decisionInput.reason,
    });
  } catch {
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
    decision: state.decision,
    executionStatus: "applied",
    executionErrorCode: null,
    beforeState: state.beforeState,
    afterState: state.afterState,
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

export async function auditExecutionResult(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<boolean> {
  const executionFailed = state.decision.executionStatus === "failed";
  const projectionFailed =
    state.decisionProjectionFailed || state.reportProjectionFailed;
  return params.appendDecisionAudit(
    params,
    executionFailed || projectionFailed ? "error" : "success",
    {
      beforeState: state.beforeState,
      afterState: state.afterState,
      executionStatus: state.decision.executionStatus,
      executionErrorCode: state.decision.executionErrorCode,
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
}

type NotificationStatus = "not_requested" | "sent" | "failed";

async function notifyNotifier(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<NotificationStatus> {
  if (!state.report.notifierEmail) return "not_requested";
  try {
    const result = await sendLegalContentReportDecisionToNotifier({
      record: state.report,
      decision: state.decision,
      actorUserId: params.actorUserId,
    });
    const status: NotificationStatus =
      result && (result.status === "sent" || result.status === "mocked")
        ? "sent"
        : "failed";
    if (status === "failed") state.notificationErrors.push("notifier");
    return status;
  } catch {
    state.notificationErrors.push("notifier");
    return "failed";
  }
}

async function notifyAuthor(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<NotificationStatus> {
  if (
    !state.authorEmail ||
    state.decision.executionStatus !== "applied" ||
    !isContentMutationAction(state.decision.action)
  ) {
    return "not_requested";
  }
  try {
    const result = await sendLegalContentReportDecisionToAuthor({
      authorEmail: state.authorEmail,
      decision: state.decision,
      allegationReason: state.report.allegationReason,
      actorUserId: params.actorUserId,
    });
    const status: NotificationStatus =
      result && (result.status === "sent" || result.status === "mocked")
        ? "sent"
        : "failed";
    if (status === "failed") state.notificationErrors.push("author");
    return status;
  } catch {
    state.notificationErrors.push("author");
    return "failed";
  }
}

export async function notifyDecision(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<void> {
  const notifierStatus = await notifyNotifier(params, state);
  const authorStatus = await notifyAuthor(params, state);

  if (notifierStatus === "not_requested" && authorStatus === "not_requested") return;
  const notificationError =
    state.notificationErrors.length > 0
      ? state.notificationErrors.join(",")
      : null;
  await updateLegalContentReportDecisionNotifications({
    decisionId: state.decision.id,
    notifierNotificationStatus: notifierStatus,
    authorNotificationStatus: authorStatus,
    notificationError,
  });
  if (state.notificationErrors.length === 0) return;

  await params.appendDecisionAudit(params, "error", {
    beforeState: state.beforeState,
    afterState: state.afterState,
    executionStatus: state.decision.executionStatus,
    executionErrorCode: state.decision.executionErrorCode,
    stage: "notification",
    partialMutation: state.decision.executionStatus === "applied",
    notificationError: notificationError ?? undefined,
  });
}
