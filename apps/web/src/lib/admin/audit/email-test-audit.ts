import { randomUUID } from "node:crypto";
import { appendAdminOperationAudit } from "./operation-audit";

export type EmailAuditRoute = "email_test" | "send";
export type EmailAuditStage = "configuration" | "validation" | "send";
export type EmailAuditErrorCode =
  | "email_not_configured"
  | "invalid_json"
  | "invalid_payload"
  | "email_quota_exceeded"
  | "send_failed";
export type EmailAuditDeliveryStatus = "sent" | "mocked" | "missing_config";

export type EmailTestAuditParams = {
  operationId: string;
  actorUserId: string;
  route: EmailAuditRoute;
  stage: EmailAuditStage;
  recipientCount?: number;
  deliveryStatus?: EmailAuditDeliveryStatus;
  code?: EmailAuditErrorCode;
};

export function createEmailTestAuditOperationId(
  route: EmailAuditRoute,
): string {
  return `email-test-${route}-${randomUUID()}`;
}

export async function appendEmailTestAudit(
  params: EmailTestAuditParams,
): Promise<void> {
  const details: Record<string, unknown> = {
    operation: "send_test_email",
    route: params.route,
    stage: params.stage,
  };

  if (
    params.recipientCount !== undefined &&
    Number.isSafeInteger(params.recipientCount) &&
    params.recipientCount >= 0 &&
    params.recipientCount <= 10
  ) {
    details.recipientCount = params.recipientCount;
  }

  if (params.deliveryStatus) {
    details.deliveryStatus = params.deliveryStatus;
  }

  if (params.code) {
    details.code = params.code;
  }

  await appendAdminOperationAudit({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "admin_operation",
    outcome: params.code ? "error" : "success",
    details,
  });
}
