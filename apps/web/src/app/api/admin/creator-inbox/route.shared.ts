import { NextResponse } from "next/server";
import { z } from "zod";
import type { CreatorInboxSource } from "@/lib/community/creator-inbox";

export const actionSchema = z.object({
  source: z.enum(["feedback", "promotion", "partner"]),
  itemId: z.string().trim().min(1),
  action: z.enum(["mark_treated", "responded", "archive", "delete"]),
  reason: z.string().trim().min(5).max(500),
});

export type CreatorInboxAction = z.infer<typeof actionSchema>;
export type CreatorInboxMutationSource = Exclude<
  CreatorInboxSource,
  "event" | "legal_content_report"
>;

const AUDIT_OPERATION = "creator_inbox_update";

export type InboxSnapshot = {
  source: CreatorInboxMutationSource;
  status?: string;
  creatorState?: string;
};

export type ErrorStage =
  | "lookup"
  | "update"
  | "secondary_update"
  | "delete";

export function canonicalTargetUserId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized && normalized !== "unknown" ? normalized : undefined;
}

export function buildSnapshot(
  source: CreatorInboxMutationSource,
  record: { status?: string; creatorState: string },
): InboxSnapshot {
  return {
    source,
    ...(record.status ? { status: record.status } : {}),
    creatorState: record.creatorState,
  };
}

export function buildAuditDetails(params: {
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: ErrorStage;
  partialMutation?: boolean;
}) {
  return {
    operation: AUDIT_OPERATION,
    reason: params.reason,
    ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
    previousValue: params.previousValue,
    newValue: params.newValue,
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.partialMutation === undefined
      ? {}
      : { partialMutation: params.partialMutation }),
  };
}

export function unknownSnapshot(
  source: CreatorInboxMutationSource,
): InboxSnapshot {
  return { source, status: "unknown", creatorState: "unknown" };
}

export type DecisionAuditAppender = (params: {
  operationId: string;
  actorUserId: string;
  outcome: "success" | "error";
  targetId: string;
  details: ReturnType<typeof buildAuditDetails>;
}) => Promise<void>;

export type CreatorInboxAuditParams = {
  operationId: string;
  actorUserId: string;
  outcome: "success" | "error";
  targetId: string;
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: ErrorStage;
  partialMutation?: boolean;
};

export async function appendCreatorInboxAudit(
  appendDecisionAudit: DecisionAuditAppender,
  params: CreatorInboxAuditParams,
) {
  const {
    operationId,
    actorUserId,
    outcome,
    targetId,
    reason,
    targetUserId,
    previousValue,
    newValue,
    stage,
    partialMutation,
  } = params;

  await appendDecisionAudit({
    operationId,
    actorUserId,
    outcome,
    targetId,
    details: buildAuditDetails({
      reason,
      targetUserId,
      previousValue,
      newValue,
      stage,
      partialMutation,
    }),
  });
}

export type CreatorInboxAudit = (
  params: Omit<CreatorInboxAuditParams, "operationId" | "actorUserId">,
) => Promise<void>;

export type CreatorInboxMutationContext = {
  operationId: string;
  actorUserId: string;
  appendDecisionAudit: DecisionAuditAppender;
};

export type CreatorInboxHandlerParams = CreatorInboxMutationContext & {
  itemId: string;
  action: CreatorInboxAction["action"];
  reason: string;
};

export function createCreatorInboxAudit(
  params: CreatorInboxMutationContext,
): CreatorInboxAudit {
  return (auditParams) =>
    appendCreatorInboxAudit(params.appendDecisionAudit, {
      operationId: params.operationId,
      actorUserId: params.actorUserId,
      ...auditParams,
    });
}

export async function appendCreatorInboxErrorAudit(params: {
  audit: CreatorInboxAudit;
  targetId: string;
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage: ErrorStage;
  partialMutation: boolean;
}) {
  await params.audit({
    outcome: "error",
    targetId: params.targetId,
    reason: params.reason,
    targetUserId: params.targetUserId,
    previousValue: params.previousValue,
    newValue: params.newValue,
    stage: params.stage,
    partialMutation: params.partialMutation,
  });
}

export async function appendCreatorInboxSuccessAudit(params: {
  audit: CreatorInboxAudit;
  targetId: string;
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}) {
  await params.audit({
    outcome: "success",
    targetId: params.targetId,
    reason: params.reason,
    targetUserId: params.targetUserId,
    previousValue: params.previousValue,
    newValue: params.newValue,
  });
}

export async function appendCreatorInboxLookupError(params: {
  audit: CreatorInboxAudit;
  source: CreatorInboxMutationSource;
  targetId: string;
  reason: string;
}) {
  const snapshot = unknownSnapshot(params.source);
  await appendCreatorInboxErrorAudit({
    audit: params.audit,
    targetId: params.targetId,
    reason: params.reason,
    previousValue: snapshot,
    newValue: snapshot,
    stage: "lookup",
    partialMutation: false,
  });
}

export function mutationErrorResponse() {
  return NextResponse.json(
    { error: "Unable to update creator inbox item." },
    { status: 500 },
  );
}
