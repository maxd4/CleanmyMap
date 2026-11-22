import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readActionRegistrationRecord } from "./participation/registration-records";
import {
  ACTION_ACCESSIBILITY_NEEDS,
  type ActionAccessibilityCheckInUpdate,
  type ActionAccessibilityNeed,
  type ActionAccessibilitySupportRequest,
} from "./accessibility-support-contract";

export class AccessibilitySupportConflictError extends Error {
  constructor(message = "Accessibility support conflict.") {
    super(message);
    this.name = "AccessibilitySupportConflictError";
  }
}

export class AccessibilitySupportForbiddenError extends Error {
  constructor(message = "Accessibility support access forbidden.") {
    super(message);
    this.name = "AccessibilitySupportForbiddenError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeActionAccessibilityNeeds(value: unknown): ActionAccessibilityNeed[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set<string>(ACTION_ACCESSIBILITY_NEEDS);
  if (value.length === 0 || value.length > ACTION_ACCESSIBILITY_NEEDS.length) return null;
  if (value.some((item) => typeof item !== "string" || !allowed.has(item))) return null;
  const normalized = [...new Set(value as ActionAccessibilityNeed[])];
  return normalized.length > 0 && normalized.length <= ACTION_ACCESSIBILITY_NEEDS.length
    ? normalized
    : null;
}

function throwDatabaseError(error: { message?: string } | null): never {
  throw new Error(error?.message || "Accessibility support database operation failed.");
}

async function assertConfirmedRegistration(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
): Promise<void> {
  const registration = await readActionRegistrationRecord(supabase, { actionId, userId });
  if (registration?.registration_status !== "confirmed") {
    throw new AccessibilitySupportConflictError("Conflict: a confirmed registration is required before sharing these needs.");
  }
}

export async function loadOwnActionAccessibilitySupportRequest(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<ActionAccessibilitySupportRequest | null> {
  await assertConfirmedRegistration(supabase, params.actionId, params.userId);
  const result = await supabase
    .from("action_accessibility_support_requests")
    .select("id, action_id, requester_user_id, requested_needs, day_tracking_consent, arrival_status, contact_status, departure_status, retention_expires_at, created_at, updated_at")
    .eq("action_id", params.actionId)
    .eq("requester_user_id", params.userId)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  const request = result.data as ActionAccessibilitySupportRequest | null;
  if (!request) return null;
  if (Date.parse(request.retention_expires_at) <= Date.now()) {
    const deletion = await supabase.from("action_accessibility_support_requests").delete().eq("id", request.id);
    if (deletion.error) throwDatabaseError(deletion.error);
    return null;
  }
  return request;
}

export async function loadActionAccessibilitySupportRequestsForOrganizer(
  supabase: SupabaseClient,
  params: { actionId: string },
): Promise<ActionAccessibilitySupportRequest[]> {
  const result = await supabase
    .from("action_accessibility_support_requests")
    .select("id, action_id, requester_user_id, requested_needs, day_tracking_consent, arrival_status, contact_status, departure_status, retention_expires_at, created_at, updated_at")
    .eq("action_id", params.actionId)
    .gt("retention_expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (result.error) throwDatabaseError(result.error);
  return (result.data ?? []) as ActionAccessibilitySupportRequest[];
}

export async function saveActionAccessibilitySupportRequest(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string; body: unknown },
): Promise<ActionAccessibilitySupportRequest> {
  const body = isRecord(params.body) ? params.body : {};
  const requestedNeeds = normalizeActionAccessibilityNeeds(body.requestedNeeds);
  if (!requestedNeeds) throw new AccessibilitySupportConflictError("Invalid functional needs selection.");
  if (body.dayTrackingConsent !== undefined && typeof body.dayTrackingConsent !== "boolean") {
    throw new AccessibilitySupportConflictError("Invalid consent value; an explicit boolean is required.");
  }
  await assertConfirmedRegistration(supabase, params.actionId, params.userId);
  const result = await supabase
    .from("action_accessibility_support_requests")
    .upsert({
      action_id: params.actionId,
      requester_user_id: params.userId,
      requested_needs: requestedNeeds,
      day_tracking_consent: body.dayTrackingConsent === true,
      arrival_status: body.dayTrackingConsent === true ? undefined : null,
      contact_status: body.dayTrackingConsent === true ? undefined : null,
      departure_status: body.dayTrackingConsent === true ? undefined : null,
    }, { onConflict: "action_id,requester_user_id" })
    .select("id, action_id, requester_user_id, requested_needs, day_tracking_consent, arrival_status, contact_status, departure_status, retention_expires_at, created_at, updated_at")
    .single();
  if (result.error) throwDatabaseError(result.error);
  return result.data as ActionAccessibilitySupportRequest;
}

export async function deleteOwnActionAccessibilitySupportRequest(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<void> {
  const result = await supabase
    .from("action_accessibility_support_requests")
    .delete()
    .eq("action_id", params.actionId)
    .eq("requester_user_id", params.userId);
  if (result.error) throwDatabaseError(result.error);
}

export async function updateActionAccessibilityCheckIn(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    requestId: string;
    field: "arrival_status" | "contact_status" | "departure_status";
    status: ActionAccessibilityCheckInUpdate;
  },
): Promise<ActionAccessibilitySupportRequest> {
  const result = await supabase
    .from("action_accessibility_support_requests")
    .update({ [params.field]: params.status })
    .eq("id", params.requestId)
    .eq("action_id", params.actionId)
    .eq("day_tracking_consent", true)
    .gt("retention_expires_at", new Date().toISOString())
    .select("id, action_id, requester_user_id, requested_needs, day_tracking_consent, arrival_status, contact_status, departure_status, retention_expires_at, created_at, updated_at")
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  if (!result.data) throw new AccessibilitySupportForbiddenError("Forbidden: check-in tracking was not consented to or the request expired.");
  return result.data as ActionAccessibilitySupportRequest;
}
