import { updateLegalContentReportState } from "./legal-content-report-store";
import { appendLegalContentReportDecision } from "./legal-content-report-decisions-store";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionRecord,
} from "./legal-content-report";
import {
  applyContentMutation,
  auditExecutionResult,
  notifyDecision,
  persistExecutionState,
} from "./legal-content-report-decision-effects";
import type {
  DecisionWorkflowParams,
  DecisionWorkflowResult,
  DecisionWorkflowState,
  Snapshot,
} from "./legal-content-report-decision-contract";

export { appendDecisionAudit } from "./legal-content-report-decision-effects";
export type {
  DecisionAuditContext,
  DecisionWorkflowResult,
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

async function checkMutationCapability(
  params: DecisionWorkflowParams,
  contentMutationAction: ContentMutationAction | null,
): Promise<DecisionWorkflowResult | null> {
  const hasCanonicalCapability =
    contentMutationAction &&
    ["action", "actions"].includes(
      params.report.contentType?.trim().toLowerCase() ?? "",
    ) &&
    Boolean(params.report.contentId);
  if (hasCanonicalCapability || !contentMutationAction) return null;

  await params.appendDecisionAudit(params, "error", {
    beforeState: reportSnapshot(params.report),
    afterState: reportSnapshot(params.report),
    executionStatus: "not_applicable",
    executionErrorCode: null,
    stage: "capability_check",
    partialMutation: false,
  });
  return {
    kind: "error",
    status: 409,
    operationId: params.operationId,
    message: "A canonical content mutation is not available for this content type.",
  };
}

async function persistInitialDecision(
  params: DecisionWorkflowParams,
  initialExecutionStatus: LegalContentReportDecisionRecord["executionStatus"],
): Promise<
  | { decision: LegalContentReportDecisionRecord }
  | { result: DecisionWorkflowResult }
> {
  const beforeState = reportSnapshot(params.report);
  try {
    const decision = await appendLegalContentReportDecision({
      reportId: params.report.id,
      actorAdminUserId: params.actorUserId,
      action: params.decisionInput.action,
      origin: params.decisionInput.origin,
      reason: params.decisionInput.reason,
      automatedMeansUsed: params.decisionInput.automatedMeansUsed,
      legalBasis: params.decisionInput.legalBasis ?? null,
      termsBasis: params.decisionInput.termsBasis ?? null,
      contentUrl: params.report.contentUrl,
      contentId: params.report.contentId,
      beforeState,
      afterState: beforeState,
      executionStatus: initialExecutionStatus,
      executionErrorCode: null,
      auditOperationId: params.operationId,
    });
    return { decision };
  } catch {
    await params.appendDecisionAudit(params, "error", {
      beforeState,
      afterState: beforeState,
      executionStatus: initialExecutionStatus,
      executionErrorCode: null,
      stage: "decision_persistence",
      partialMutation: false,
    });
    return {
      result: {
        kind: "error",
        status: 500,
        operationId: params.operationId,
        message: "Decision persistence is incomplete.",
      },
    };
  }
}

async function projectNonMutativeDecision(
  params: DecisionWorkflowParams,
  state: DecisionWorkflowState,
): Promise<DecisionWorkflowResult | null> {
  try {
    const updatedReport = await updateLegalContentReportState({
      reportId: state.report.id,
      creatorState: params.decisionInput.action,
    });
    if (!updatedReport) throw new Error("Legal report state projection did not persist");
    state.afterState = reportSnapshot(updatedReport);
    const projectedDecision = await persistExecutionState({
      decision: state.decision,
      executionStatus: "not_applicable",
      executionErrorCode: null,
      beforeState: state.beforeState,
      afterState: state.afterState,
    });
    state.decision = projectedDecision.decision;
    state.decisionProjectionFailed = !projectedDecision.persisted;
    state.report = { ...updatedReport, latestDecision: state.decision };
    return null;
  } catch {
    await params.appendDecisionAudit(params, "error", {
      beforeState: state.beforeState,
      afterState: state.afterState,
      executionStatus: state.decision.executionStatus,
      executionErrorCode: state.decision.executionErrorCode,
      stage: "report_projection",
      partialMutation: false,
    });
    return {
      kind: "error",
      status: 500,
      operationId: params.operationId,
      message: "Decision recorded but report projection is incomplete.",
    };
  }
}

export async function runDecisionWorkflow(
  params: DecisionWorkflowParams,
): Promise<DecisionWorkflowResult> {
  const contentMutationAction = isContentMutationAction(params.decisionInput.action)
    ? params.decisionInput.action
    : null;
  const capabilityResult = await checkMutationCapability(params, contentMutationAction);
  if (capabilityResult) return capabilityResult;

  const initialExecutionStatus = contentMutationAction ? "pending" : "not_applicable";
  const persisted = await persistInitialDecision(params, initialExecutionStatus);
  if ("result" in persisted) return persisted.result;

  const beforeState = reportSnapshot(params.report);
  const state: DecisionWorkflowState = {
    report: params.report,
    decision: persisted.decision,
    beforeState,
    afterState: beforeState,
    authorEmail: null,
    mutationApplied: false,
    decisionProjectionFailed: false,
    reportProjectionFailed: false,
    notificationErrors: [],
  };

  if (contentMutationAction) {
    await applyContentMutation(params, state, contentMutationAction);
  } else {
    const projectionResult = await projectNonMutativeDecision(params, state);
    if (projectionResult) return projectionResult;
  }
  state.report = { ...state.report, latestDecision: state.decision };
  if (!(await auditExecutionResult(params, state))) {
    return {
      kind: "error",
      status: 500,
      operationId: params.operationId,
      message: "Decision recorded but audit is incomplete.",
    };
  }
  await notifyDecision(params, state);
  return { kind: "completed", operationId: params.operationId, state };
}
