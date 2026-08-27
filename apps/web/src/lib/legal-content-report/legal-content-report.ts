import { isPlaceholderHost } from "@/lib/security/validation";

export const LEGAL_CONTENT_REPORT_PATH = "/signaler-contenu-illicite";
export const LEGAL_CONTENT_REPORT_SOURCE = "legal_content_report" as const;
export const LEGAL_CONTENT_REPORT_MAX_URL_LENGTH = 2048;
export const LEGAL_CONTENT_REPORT_MAX_REASON_LENGTH = 5000;
export const LEGAL_CONTENT_REPORT_MAX_IDENTITY_EXCEPTION_REASON_LENGTH = 1000;

export type LegalContentReportStatus = "open" | "treated" | "archived";
export type LegalContentReportCreatorState =
  | "new"
  | "responded"
  | "treated"
  | "archived"
  | "reviewing"
  | "no_action"
  | "content_restricted"
  | "content_removed"
  | "closed";

export const LEGAL_CONTENT_REPORT_DECISION_ACTIONS = [
  "reviewing",
  "no_action",
  "content_restricted",
  "content_removed",
  "closed",
] as const;

export type LegalContentReportDecisionAction =
  (typeof LEGAL_CONTENT_REPORT_DECISION_ACTIONS)[number];

export const LEGAL_CONTENT_REPORT_DECISION_ORIGINS = [
  "received_notification",
  "internal_initiative",
] as const;

export type LegalContentReportDecisionOrigin =
  (typeof LEGAL_CONTENT_REPORT_DECISION_ORIGINS)[number];

export const LEGAL_CONTENT_REPORT_DECISION_EXECUTION_STATUSES = [
  "not_applicable",
  "pending",
  "applied",
  "failed",
] as const;

export type LegalContentReportDecisionExecutionStatus =
  (typeof LEGAL_CONTENT_REPORT_DECISION_EXECUTION_STATUSES)[number];

export const LEGAL_CONTENT_REPORT_DECISION_EXECUTION_ERROR_CODES = [
  "capability_unavailable",
  "content_not_found",
  "mutation_failed",
  "projection_failed",
  "legacy_execution_unknown",
] as const;

export type LegalContentReportDecisionExecutionErrorCode =
  (typeof LEGAL_CONTENT_REPORT_DECISION_EXECUTION_ERROR_CODES)[number];

export type LegalContentReportNotificationStatus =
  | "not_requested"
  | "sent"
  | "failed";

export type LegalContentReportDecisionRecord = {
  id: string;
  reportId: string;
  createdAt: string;
  actorAdminUserId: string;
  action: LegalContentReportDecisionAction;
  origin: LegalContentReportDecisionOrigin;
  reason: string;
  automatedMeansUsed: boolean;
  legalBasis: string | null;
  termsBasis: string | null;
  contentUrl: string;
  contentId: string | null;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  executionStatus: LegalContentReportDecisionExecutionStatus;
  executionErrorCode: LegalContentReportDecisionExecutionErrorCode | null;
  auditOperationId: string;
  notifierNotificationStatus: LegalContentReportNotificationStatus;
  authorNotificationStatus: LegalContentReportNotificationStatus;
  notificationError: string | null;
};

export type LegalContentReportInput = {
  submittedByUserId: string | null;
  notifierName: string | null;
  notifierEmail: string | null;
  identityExceptionReason: string | null;
  contentUrl: string;
  contentType: string | null;
  contentId: string | null;
  allegationReason: string;
  goodFaithConfirmed: true;
};

export type LegalContentReportRecord = LegalContentReportInput & {
  id: string;
  createdAt: string;
  status: LegalContentReportStatus;
  creatorState: LegalContentReportCreatorState;
  latestDecision?: LegalContentReportDecisionRecord | null;
};

export function isLegalContentReportDecisionAction(
  value: unknown,
): value is LegalContentReportDecisionAction {
  return (
    typeof value === "string" &&
    (LEGAL_CONTENT_REPORT_DECISION_ACTIONS as readonly string[]).includes(value)
  );
}

export function isLegalContentReportDecisionOrigin(
  value: unknown,
): value is LegalContentReportDecisionOrigin {
  return (
    typeof value === "string" &&
    (LEGAL_CONTENT_REPORT_DECISION_ORIGINS as readonly string[]).includes(value)
  );
}

export function isLegalContentReportDecisionExecutionStatus(
  value: unknown,
): value is LegalContentReportDecisionExecutionStatus {
  return (
    typeof value === "string" &&
    (LEGAL_CONTENT_REPORT_DECISION_EXECUTION_STATUSES as readonly string[]).includes(value)
  );
}

export function isLegalContentReportDecisionExecutionErrorCode(
  value: unknown,
): value is LegalContentReportDecisionExecutionErrorCode {
  return (
    typeof value === "string" &&
    (LEGAL_CONTENT_REPORT_DECISION_EXECUTION_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function formatLegalContentReportExecutionStatus(
  status: LegalContentReportDecisionExecutionStatus,
): string {
  return {
    not_applicable: "Non applicable",
    pending: "En attente d'exécution",
    applied: "Appliquée",
    failed: "Échec d'exécution",
  }[status];
}

export function normalizeLegalContentReportUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LEGAL_CONTENT_REPORT_MAX_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      isPlaceholderHost(parsed.hostname)
    ) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function normalizeOptionalReportText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}
