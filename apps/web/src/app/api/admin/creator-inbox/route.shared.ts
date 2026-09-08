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

export const AUDIT_OPERATION = "creator_inbox_update";

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

export function mutationErrorResponse() {
  return NextResponse.json(
    { error: "Unable to update creator inbox item." },
    { status: 500 },
  );
}
