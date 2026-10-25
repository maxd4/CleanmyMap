import { NextResponse } from "next/server";
import type { CreatorInboxSource } from "@/lib/community/creator-inbox";
import { z } from "zod";

const baseActionSchema = z.object({
  source: z.enum(["feedback", "promotion", "partner"]),
  itemId: z.string().trim().min(1),
  action: z.enum(["mark_treated", "responded", "archive", "delete", "qualify", "update_tracking"]),
  reason: z.string().trim().max(500).optional(),
  decision: z.enum(["pending", "needs_info", "accepted", "duplicate", "rejected"]).optional(),
  duplicateFeedbackId: z.string().trim().min(1).max(128).optional().nullable(),
  trackingStatus: z.enum(["not_planned", "under_study", "planned", "in_progress", "shipped"]).optional(),
  trackingPublicSummary: z.string().trim().max(1000).optional().nullable(),
  trackingReference: z.string().trim().max(240).optional().nullable(),
  trackingShippedOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const actionSchema = baseActionSchema.superRefine((value, context) => {
  if (value.action === "qualify") {
    validateQualificationAction(value, context);
    return;
  }

  if (value.action === "update_tracking") {
    validateTrackingAction(value, context);
    return;
  }

  validateStandardAction(value, context);
});

function validateQualificationAction(
  value: z.infer<typeof baseActionSchema>,
  context: z.RefinementCtx,
): void {
  addIssueIf(context, value.source !== "feedback", "source", "Qualification is limited to feedback.");
  addIssueIf(context, !value.decision, "decision", "Qualification decision is required.");
  addIssueIf(
    context,
    ["needs_info", "duplicate", "rejected"].includes(value.decision ?? "") && (value.reason?.length ?? 0) < 5,
    "reason",
    "A reason of at least 5 characters is required.",
  );
  addIssueIf(context, Boolean(value.reason && value.reason.length > 500), "reason", "Qualification reason is too long.");
  addIssueIf(context, value.decision === "duplicate" && !value.duplicateFeedbackId, "duplicateFeedbackId", "A duplicate feedback reference is required.");
  addIssueIf(context, value.decision !== "duplicate" && Boolean(value.duplicateFeedbackId), "duplicateFeedbackId", "Duplicate feedback reference is only valid for duplicate decisions.");
}

function validateTrackingAction(
  value: z.infer<typeof baseActionSchema>,
  context: z.RefinementCtx,
): void {
  addIssueIf(context, value.source !== "feedback", "source", "Product tracking is limited to feedback.");
  addIssueIf(context, !value.trackingStatus, "trackingStatus", "Tracking status is required.");
  if (value.trackingStatus === "shipped") {
    addIssueIf(context, (value.trackingPublicSummary?.length ?? 0) < 5, "trackingPublicSummary", "A public delivery summary is required.");
    addIssueIf(context, !value.trackingShippedOn, "trackingShippedOn", "A confirmed delivery date is required.");
  }
  addIssueIf(context, Boolean(value.decision || value.duplicateFeedbackId), "decision", "Qualification fields are not valid for tracking.");
}

function validateStandardAction(
  value: z.infer<typeof baseActionSchema>,
  context: z.RefinementCtx,
): void {
  addIssueIf(context, !value.reason || value.reason.length < 5, "reason", "A reason of at least 5 characters is required.");
  addIssueIf(context, Boolean(value.decision || value.duplicateFeedbackId), "decision", "Qualification fields are not valid for this action.");
}

function addIssueIf(
  context: z.RefinementCtx,
  condition: boolean,
  path: string,
  message: string,
): void {
  if (condition) context.addIssue({ code: "custom", path: [path], message });
}

export type CreatorInboxAction = z.infer<typeof actionSchema>;
export type CreatorInboxMutationSource = Exclude<
  CreatorInboxSource,
  "event" | "legal_content_report"
>;

const AUDIT_OPERATION = "creator_inbox_update";

type CreatorInboxAuditDetails = {
  operation: typeof AUDIT_OPERATION;
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: ErrorStage;
  partialMutation?: boolean;
};

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

function buildAuditDetails(params: {
  reason: string;
  targetUserId?: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  stage?: ErrorStage;
  partialMutation?: boolean;
}): CreatorInboxAuditDetails {
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

function unknownSnapshot(
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

type CreatorInboxAuditParams = {
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

async function appendCreatorInboxAudit(
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
