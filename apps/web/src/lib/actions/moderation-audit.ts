import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";

export type ActionModerationAuditOutcome = "success" | "error";

export async function appendActionModerationAudit(params: {
  operationId: string;
  actorUserId: string;
  targetActionId: string;
  operation: string;
  outcome: ActionModerationAuditOutcome;
  details?: Record<string, unknown>;
}): Promise<void> {
  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "moderation",
    outcome: params.outcome,
    targetId: params.targetActionId,
    details: {
      operation: params.operation,
      ...(params.details ?? {}),
    },
  });
}
