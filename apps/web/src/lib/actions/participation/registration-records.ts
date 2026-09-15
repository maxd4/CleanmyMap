import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRegistrationRow } from "@/types/database";
import type { ParticipationAuditValue } from "./group-participation-contract";

export type ActionRegistrationStatus = ActionRegistrationRow["registration_status"];
export type ActionRegistrationSource = ActionRegistrationRow["registration_source"];

export type ActionRegistrationStatusRow = Pick<
  ActionRegistrationRow,
  | "action_id"
  | "created_at"
  | "registered_at"
  | "updated_at"
  | "registration_status"
  | "registration_source"
>;

export type ActionRegistrationReviewRow = Pick<
  ActionRegistrationRow,
  | "id"
  | "action_id"
  | "created_at"
  | "registered_at"
  | "updated_at"
  | "user_id"
  | "registration_status"
  | "registration_source"
>;

const REGISTRATION_STATUS_COLUMNS =
  "action_id, created_at, registered_at, updated_at, registration_status, registration_source";
const REGISTRATION_REVIEW_COLUMNS =
  "id, action_id, created_at, registered_at, updated_at, user_id, registration_status, registration_source";

export function resolveRegisteredAt(
  row: Pick<ActionRegistrationRow, "created_at" | "registered_at">,
): string {
  return row.registered_at ?? row.created_at;
}

export function resolveRegistrationUpdatedAt(
  row: Pick<ActionRegistrationRow, "created_at" | "registered_at" | "updated_at">,
): string {
  return row.updated_at ?? row.registered_at ?? row.created_at;
}

export function buildRegistrationAuditValue(
  row: Pick<
    ActionRegistrationRow,
    | "created_at"
    | "registered_at"
    | "updated_at"
    | "registration_status"
    | "registration_source"
  >,
): ParticipationAuditValue {
  return {
    participationStatus: row.registration_status,
    participationSource: row.registration_source,
    joinedAt: resolveRegisteredAt(row),
    updatedAt: resolveRegistrationUpdatedAt(row),
  };
}

export async function countActiveRegistrationsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<number> {
  const result = await supabase
    .from("action_registrations")
    .select("id", { count: "exact", head: true })
    .eq("action_id", actionId)
    .eq("registration_status", "confirmed");

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

export async function countRegistrationsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<number> {
  const result = await supabase
    .from("action_registrations")
    .select("id", { count: "exact", head: true })
    .eq("action_id", actionId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

export async function readActionRegistrationRecord(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<ActionRegistrationStatusRow | null> {
  const result = await supabase
    .from("action_registrations")
    .select(REGISTRATION_STATUS_COLUMNS)
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionRegistrationStatusRow | null;
}

export async function readActionRegistrationRecordById(
  supabase: SupabaseClient,
  params: { actionId: string; registrationId: string },
): Promise<ActionRegistrationReviewRow | null> {
  const result = await supabase
    .from("action_registrations")
    .select(REGISTRATION_REVIEW_COLUMNS)
    .eq("action_id", params.actionId)
    .eq("id", params.registrationId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionRegistrationReviewRow | null;
}

export async function updateActionRegistrationRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    registeredAt: string;
    registrationStatus: ActionRegistrationStatus;
    registrationSource: ActionRegistrationSource;
  },
): Promise<ActionRegistrationStatusRow> {
  const result = await supabase
    .from("action_registrations")
    .update({
      registered_at: params.registeredAt,
      registration_status: params.registrationStatus,
      registration_source: params.registrationSource,
    })
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .select(REGISTRATION_STATUS_COLUMNS)
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionRegistrationStatusRow;
}

export async function insertActionRegistrationRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    registeredAt: string;
    registrationStatus: ActionRegistrationStatus;
    registrationSource: ActionRegistrationSource;
  },
): Promise<ActionRegistrationStatusRow> {
  const result = await supabase
    .from("action_registrations")
    .insert({
      action_id: params.actionId,
      user_id: params.userId,
      registered_at: params.registeredAt,
      registration_status: params.registrationStatus,
      registration_source: params.registrationSource,
    })
    .select(REGISTRATION_STATUS_COLUMNS)
    .single();

  if (result.error) {
    const error = new Error(result.error.message);
    if ("code" in result.error && typeof result.error.code === "string") {
      Object.assign(error, { code: result.error.code });
    }
    throw error;
  }

  return result.data as ActionRegistrationStatusRow;
}

export async function loadActionRegistrationIdsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<string[]> {
  const result = await supabase
    .from("action_registrations")
    .select("user_id, registration_status")
    .eq("action_id", actionId)
    .neq("registration_status", "cancelled");

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Array.from(
    new Set(
      (result.data ?? [])
        .map((row) => String((row as { user_id?: string }).user_id ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );
}

export async function loadManualRegistrationIdsForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<string[]> {
  const result = await supabase
    .from("action_registrations")
    .select("user_id")
    .eq("action_id", actionId)
    .eq("registration_source", "manual_add")
    .neq("registration_status", "cancelled");

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Array.from(
    new Set(
      (result.data ?? [])
        .map((row) => String((row as { user_id?: string }).user_id ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );
}
