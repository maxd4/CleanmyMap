import type { ActionPhase } from "@/lib/actions/types";
import type {
  ActionParticipantImpactAttribution,
  IndividualImpactMeasurement,
} from "./individual-impact";
import type { ActionParticipantRow, ActionRegistrationRow } from "@/types/database";
import {
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";

type JoinableParticipationSource =
  | ParticipationSource
  | ActionParticipantRow["participation_source"]
  | ActionRegistrationRow["registration_source"];

export type ParticipationAuditValue = {
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
};

export function createParticipationAuditValue(params: {
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
}): ParticipationAuditValue {
  return params;
}

export type ActionParticipationRecord = {
  id: string;
  action_id: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  status: ParticipationStatus;
  source: ParticipationSource;
  joined_at: string;
};

export function createActionParticipationRecord(
  params: ActionParticipationRecord,
): ActionParticipationRecord {
  return params;
}

export type ActionParticipationMutationResult = {
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  participationUpdatedAt: string | null;
  participantsCount: number;
};

export function createActionParticipationMutationResult(
  params: ActionParticipationMutationResult,
): ActionParticipationMutationResult {
  return params;
}

type ActionParticipationErrorStage =
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

export type JoinableActionItem = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  /** Read-only display metadata; participation mutations do not depend on it. */
  actionTitle?: string | null;
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
  participationSource: JoinableParticipationSource | null;
  participationUpdatedAt: string | null;
  groupJoinEnabled: boolean;
  pendingRequestsCount: number;
};

export type JoinableActionHistoryItem = JoinableActionItem & {
  individualImpact?: IndividualImpactMeasurement | null;
  personalImpactAttribution?: ActionParticipantImpactAttribution | null;
};

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
  individualImpact: IndividualImpactMeasurement | null;
  personalImpactAttribution?: ActionParticipantImpactAttribution | null;
};

export type ActionParticipationSearchItem = {
  userId: string;
  displayName: string;
  handle: string | null;
};
