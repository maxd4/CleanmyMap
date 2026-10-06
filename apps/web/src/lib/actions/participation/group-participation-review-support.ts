import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countParticipantsForAction,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import { countActiveRegistrationsForAction } from "./registration-records";
import {
  runActionParticipationStep,
  type ParticipationAuditValue,
} from "./group-participation-contract";
import type { ParticipationRecord } from "./group-participation-persistence";

export function toParticipationAuditValue(record: ParticipationRecord): ParticipationAuditValue {
  return {
    participationStatus: record.status,
    participationSource: record.source,
    joinedAt: record.joined_at,
    updatedAt: record.updated_at ?? record.joined_at,
  };
}

export async function countReviewedParticipants(
  supabase: SupabaseClient,
  actionId: string,
  useRegistrations: boolean,
  partialMutation: boolean,
  targetUserId: string,
): Promise<number> {
  return runActionParticipationStep({
    stage: "post_update",
    partialMutation,
    targetUserId,
    operation: () =>
      useRegistrations
        ? countActiveRegistrationsForAction(supabase, actionId)
        : countParticipantsForAction(supabase, actionId),
  });
}

export type ParticipationMutationResult = {
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue | null;
  newValue: ParticipationAuditValue;
};
