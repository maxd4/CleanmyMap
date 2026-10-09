import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRegistrationRow } from "@/types/database";

export type ActionRegistrationStatus = ActionRegistrationRow["registration_status"];
export type ActionRegistrationSource = ActionRegistrationRow["registration_source"];
export type ActionRegistrationCancellationReason = NonNullable<
  ActionRegistrationRow["registration_cancellation_reason"]
>;

export type ActionRegistrationStatusRow = Pick<
  ActionRegistrationRow,
  | "action_id"
  | "created_at"
  | "registered_at"
  | "updated_at"
  | "registration_status"
  | "registration_source"
  | "registration_cancellation_reason"
  | "manual_invitation_version"
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
  | "registration_cancellation_reason"
  | "manual_invitation_version"
>;

const REGISTRATION_STATUS_COLUMNS =
  "action_id, created_at, registered_at, updated_at, registration_status, registration_source, registration_cancellation_reason, manual_invitation_version";
const REGISTRATION_REVIEW_COLUMNS =
  "id, action_id, created_at, registered_at, updated_at, user_id, registration_status, registration_source, registration_cancellation_reason, manual_invitation_version";

function normalizeRegistrationUserIds(rows: readonly { user_id?: string | null }[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => String(row.user_id ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );
}

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
    expectedRegistrationStatus?: ActionRegistrationStatus;
    registrationCancellationReason?: ActionRegistrationCancellationReason | null;
  },
): Promise<ActionRegistrationStatusRow> {
  const updateData: Record<string, string | null> = {
    registered_at: params.registeredAt,
    registration_status: params.registrationStatus,
    registration_source: params.registrationSource,
  };
  if (params.registrationCancellationReason !== undefined) {
    updateData.registration_cancellation_reason = params.registrationCancellationReason;
  }
  let query = supabase
    .from("action_registrations")
    .update(updateData)
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId);
  if (params.expectedRegistrationStatus) {
    query = query.eq("registration_status", params.expectedRegistrationStatus);
  }
  const result = await query.select(REGISTRATION_STATUS_COLUMNS).single();

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

  return normalizeRegistrationUserIds(result.data ?? []);
}
