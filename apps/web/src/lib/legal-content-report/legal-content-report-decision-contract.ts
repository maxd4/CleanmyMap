import type { getLegalContentReportById } from "./legal-content-report-store";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionExecutionErrorCode,
  LegalContentReportDecisionRecord,
} from "./legal-content-report";

export type Snapshot = Record<string, unknown>;

type DecisionInput = {
  reportId: string;
  action: LegalContentReportDecisionAction;
  origin: "received_notification" | "internal_initiative";
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis?: string;
  termsBasis?: string;
};

export type DecisionAuditContext = {
  action: string;
  origin: string;
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis: string | null;
  termsBasis: string | null;
  contentUrl: string;
  contentId: string | null;
};

export type DecisionAuditState = {
  beforeState: Snapshot;
  afterState: Snapshot;
  executionStatus: string;
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null;
  stage?: string;
  partialMutation?: boolean;
  notificationError?: string;
};

type LoadedLegalContentReport = NonNullable<
  Awaited<ReturnType<typeof getLegalContentReportById>>
>;

export type DecisionWorkflowState = {
  report: LoadedLegalContentReport;
  decision: LegalContentReportDecisionRecord;
  beforeState: Snapshot;
  afterState: Snapshot;
  authorEmail: string | null;
  mutationApplied: boolean;
  decisionProjectionFailed: boolean;
  reportProjectionFailed: boolean;
  notificationErrors: string[];
};

export type WorkflowAuditParams = {
  operationId: string;
  actorUserId: string;
  reportId: string;
  auditContext: DecisionAuditContext;
};

type DecisionAuditAppender = (
  params: WorkflowAuditParams,
  outcome: "success" | "error",
  auditState: DecisionAuditState,
) => Promise<boolean>;

export type DecisionWorkflowParams = WorkflowAuditParams & {
  decisionInput: DecisionInput;
  report: LoadedLegalContentReport;
  appendDecisionAudit: DecisionAuditAppender;
};

export type DecisionWorkflowResult =
  | { kind: "error"; operationId: string; status: 409 | 500; message: string }
  | { kind: "completed"; operationId: string; state: DecisionWorkflowState };
