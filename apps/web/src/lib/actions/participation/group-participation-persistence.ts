import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createActionParticipationRecord,
  type ActionParticipationRecord,
} from "./group-participation-contract";
import {
  insertParticipantRecord,
  readParticipantRecord,
  readParticipantRecordById,
  updateParticipantRecord,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  insertActionRegistrationRecord,
  readActionRegistrationRecord,
  readActionRegistrationRecordById,
  updateActionRegistrationRecord,
} from "./registration-records";

export type ParticipationRecord = ActionParticipationRecord;

type ParticipationStoreRow = {
  id?: string;
  action_id: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  registered_at?: string | null;
  joined_at?: string | null;
  registration_status?: ParticipationStatus;
  registration_source?: ParticipationSource;
  participation_status?: ParticipationStatus;
  participation_source?: ParticipationSource;
};

function toParticipationRecord(row: ParticipationStoreRow, params: {
  userId?: string;
  status: ParticipationStatus;
  source: ParticipationSource;
  joinedAt: string;
}): ParticipationRecord {
  return createActionParticipationRecord({
    id: row.id ?? "",
    action_id: row.action_id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    user_id: params.userId ?? row.user_id,
    status: params.status,
    source: params.source,
    joined_at: params.joinedAt,
  });
}

function fromStoreRow(row: ParticipationStoreRow, userId?: string): ParticipationRecord {
  const registration = row.registration_status !== undefined;
  return toParticipationRecord(row, {
    userId,
    status: (registration ? row.registration_status : row.participation_status) as ParticipationStatus,
    source: (registration ? row.registration_source : row.participation_source) as ParticipationSource,
    joinedAt: registration
      ? row.registered_at ?? row.created_at
      : row.joined_at ?? row.created_at,
  });
}

export async function readParticipationRecordByIdForPhase(params: {
  supabase: SupabaseClient;
  useRegistrations: boolean;
  actionId: string;
  participantId: string;
  userId?: string;
}): Promise<ParticipationRecord | null> {
  const row = params.useRegistrations
    ? await readActionRegistrationRecordById(params.supabase, {
        actionId: params.actionId,
        registrationId: params.participantId,
      })
    : await readParticipantRecordById(params.supabase, {
        actionId: params.actionId,
        participantId: params.participantId,
      });
  return row ? fromStoreRow(row as ParticipationStoreRow, params.userId) : null;
}

export async function readParticipationRecordForPhase(params: {
  supabase: SupabaseClient;
  useRegistrations: boolean;
  actionId: string;
  userId: string;
}): Promise<ParticipationRecord | null> {
  const row = params.useRegistrations
    ? await readActionRegistrationRecord(params.supabase, params)
    : await readParticipantRecord(params.supabase, params);
  return row ? fromStoreRow(row as ParticipationStoreRow, params.userId) : null;
}

export async function updateParticipationRecordForPhase(params: {
  supabase: SupabaseClient;
  useRegistrations: boolean;
  actionId: string;
  userId: string;
  joinedAt: string;
  status: ParticipationStatus;
  source: ParticipationSource;
  recordId: string;
  expectedStatus?: ParticipationStatus;
}): Promise<ParticipationRecord> {
  const row = params.useRegistrations
    ? await updateActionRegistrationRecord(params.supabase, {
        actionId: params.actionId,
        userId: params.userId,
        registeredAt: params.joinedAt,
        registrationStatus: params.status,
        registrationSource: params.source as Parameters<typeof updateActionRegistrationRecord>[1]["registrationSource"],
        expectedRegistrationStatus: params.expectedStatus as Parameters<typeof updateActionRegistrationRecord>[1]["expectedRegistrationStatus"],
      })
    : await updateParticipantRecord(params.supabase, {
        actionId: params.actionId,
        userId: params.userId,
        joinedAt: params.joinedAt,
        participationStatus: params.status,
        participationSource: params.source,
        expectedParticipationStatus: params.expectedStatus,
      });
  return fromStoreRow({ ...row, id: params.recordId, user_id: params.userId } as ParticipationStoreRow, params.userId);
}

export async function insertParticipationRecordForPhase(params: {
  supabase: SupabaseClient;
  useRegistrations: boolean;
  actionId: string;
  userId: string;
  joinedAt: string;
  status: ParticipationStatus;
  source: ParticipationSource;
}): Promise<ParticipationRecord> {
  const row = params.useRegistrations
    ? await insertActionRegistrationRecord(params.supabase, {
        actionId: params.actionId,
        userId: params.userId,
        registeredAt: params.joinedAt,
        registrationStatus: params.status,
        registrationSource: params.source as Parameters<typeof insertActionRegistrationRecord>[1]["registrationSource"],
      })
    : await insertParticipantRecord(params.supabase, {
        actionId: params.actionId,
        userId: params.userId,
        joinedAt: params.joinedAt,
        participationStatus: params.status,
        participationSource: params.source,
      });
  return fromStoreRow({ ...row, id: "", user_id: params.userId } as ParticipationStoreRow, params.userId);
}
