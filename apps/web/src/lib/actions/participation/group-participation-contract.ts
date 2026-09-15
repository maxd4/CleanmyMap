import type { ActionPhase } from "@/lib/actions/types";
import {
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  type ActionParticipantStatusRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";

export type ParticipationAuditValue = {
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
};

export type ActionParticipationErrorStage =
  | "lookup"
  | "participation_update"
  | "post_update";

export class ActionParticipationOperationError extends Error {
  readonly stage: ActionParticipationErrorStage;
  readonly partialMutation: boolean;
  readonly targetUserId: string | null;

  constructor(params: {
    stage: ActionParticipationErrorStage;
    partialMutation: boolean;
    targetUserId?: string | null;
  }) {
    super("Participation operation failed.");
    this.name = "ActionParticipationOperationError";
    this.stage = params.stage;
    this.partialMutation = params.partialMutation;
    this.targetUserId = params.targetUserId ?? null;
  }
}

export async function runActionParticipationStep<T>(params: {
  stage: ActionParticipationErrorStage;
  partialMutation: boolean;
  targetUserId?: string | null;
  operation: () => Promise<T>;
}): Promise<T> {
  try {
    return await params.operation();
  } catch {
    throw new ActionParticipationOperationError(params);
  }
}

export function buildParticipationAuditValue(
  row: Pick<
    ActionParticipantStatusRow,
    | "created_at"
    | "joined_at"
    | "updated_at"
    | "participation_status"
    | "participation_source"
  >,
): ParticipationAuditValue {
  return {
    participationStatus: row.participation_status,
    participationSource: row.participation_source,
    joinedAt: resolveJoinedAt(row),
    updatedAt: resolveParticipationUpdatedAt(row),
  };
}

export type JoinableActionItem = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  actionPhase: ActionPhase;
  participantsCount: number;
  joined: boolean;
  awaitingApproval: boolean;
  joinedAt: string | null;
  participationStatus: ParticipationStatus | null;
  participationSource: ParticipationSource | null;
  participationUpdatedAt: string | null;
  groupJoinEnabled: boolean;
  pendingRequestsCount: number;
};

export type JoinableActionHistoryItem = JoinableActionItem;

export type ActionParticipationReviewItem = {
  id: string;
  actionId: string;
  displayName: string;
  handle: string | null;
  joinedAt: string;
  updatedAt: string | null;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  /** Context-only signal; it never accepts a claim or proves field presence. */
  wasRegisteredBeforeAction: boolean;
};

export type ActionParticipationSearchItem = {
  userId: string;
  displayName: string;
  handle: string | null;
};
