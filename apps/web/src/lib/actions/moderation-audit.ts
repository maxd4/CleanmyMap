import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";

export type ActionModerationAuditOutcome = "success" | "error";

export type ActionModerationAuditParams = {
  operationId: string;
  actorUserId: string;
  targetActionId: string;
  operation: string;
  outcome: ActionModerationAuditOutcome;
  reason?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  targetUserId?: string | null;
  details?: Record<string, unknown>;
};

const REQUIRED_REASON_OPERATIONS = new Set([
  "reject_action",
  "hide_action",
  "delete_content",
  "remove_participant_admin_override",
  "change_organizer",
  "correct_impact",
  "confirm_participant_admin_override",
  "correct_points",
  "restore_after_sanction",
  "admin_add_participant",
  "admin_remove_participant",
  "admin_review_reject",
]);

export function normalizeModerationReason(
  value: unknown,
  options?: { required?: boolean },
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (options?.required && normalized.length < 5) {
    return null;
  }

  return normalized;
}

export function isModerationReasonRequired(operation: string): boolean {
  return REQUIRED_REASON_OPERATIONS.has(operation);
}

export function buildActionModerationAuditDetails(
  params: ActionModerationAuditParams,
): Record<string, unknown> {
  const reason = normalizeModerationReason(params.reason, {
    required: isModerationReasonRequired(params.operation),
  });

  if (isModerationReasonRequired(params.operation) && !reason) {
    throw new Error(
      `A moderation reason of at least 5 characters is required for ${params.operation}.`,
    );
  }

  return {
    ...(params.details ?? {}),
    operation: params.operation,
    ...(reason ? { reason } : {}),
    ...(params.previousValue !== undefined
      ? { previousValue: params.previousValue }
      : {}),
    ...(params.newValue !== undefined ? { newValue: params.newValue } : {}),
    ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
  };
}

export async function appendActionModerationAudit(
  params: ActionModerationAuditParams,
): Promise<void> {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "moderation",
    outcome: params.outcome,
    targetId: params.targetActionId,
    details: buildActionModerationAuditDetails(params),
  });
}
