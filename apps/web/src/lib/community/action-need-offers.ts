import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTION_NEED_OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "withdrawn",
] as const;

export type ActionNeedOfferStatus = (typeof ACTION_NEED_OFFER_STATUSES)[number];
export const ACTION_NEED_OFFER_OPERATIONS = ["accept", "decline", "withdraw"] as const;
export type ActionNeedOfferOperation = (typeof ACTION_NEED_OFFER_OPERATIONS)[number];

export const ACTION_NEED_OFFER_MESSAGE_MAX_LENGTH = 300;

export type ActionNeedOfferRow = {
  id: string;
  need_id: string;
  offered_by_clerk_id: string;
  message: string | null;
  status: ActionNeedOfferStatus;
  created_at: string;
  updated_at: string;
};

export type ActionNeedOfferItem = {
  id: string;
  needId: string;
  message: string | null;
  status: ActionNeedOfferStatus;
  createdAt: string;
  updatedAt: string;
  offeredByClerkId?: string;
};

export type ActionNeedOfferMutationResult = {
  status: ActionNeedOfferStatus;
  offer: ActionNeedOfferRow;
  notificationId: string | null;
};

export const ACTION_NEED_OFFER_SELECT_FIELDS =
  "id, need_id, offered_by_clerk_id, message, status, created_at, updated_at";

export function toActionNeedOfferItem(
  row: ActionNeedOfferRow,
  includeOfferedByClerkId = false,
): ActionNeedOfferItem {
  return {
    id: row.id,
    needId: row.need_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(includeOfferedByClerkId ? { offeredByClerkId: row.offered_by_clerk_id } : {}),
  };
}

function readMutationResult(value: unknown): ActionNeedOfferMutationResult {
  if (!value || typeof value !== "object" || !("offer" in value)) {
    throw new Error("Supabase returned an invalid action need offer.");
  }
  return value as ActionNeedOfferMutationResult;
}

export function getActionNeedOfferErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

export async function listActionNeedOffers(
  supabase: SupabaseClient,
  needId: string,
  viewerId: string,
  includeAll: boolean,
): Promise<ActionNeedOfferRow[]> {
  let query = supabase
    .from("action_need_offers")
    .select(ACTION_NEED_OFFER_SELECT_FIELDS)
    .eq("need_id", needId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (!includeAll) query = query.eq("offered_by_clerk_id", viewerId);

  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as ActionNeedOfferRow[];
}

export async function createActionNeedOffer(
  supabase: SupabaseClient,
  needId: string,
  offeredByClerkId: string,
  message: string | null,
): Promise<ActionNeedOfferMutationResult> {
  const result = await supabase.rpc("create_action_need_offer", {
    p_need_id: needId,
    p_offered_by_clerk_id: offeredByClerkId,
    p_message: message,
  });
  if (result.error) throw result.error;
  return readMutationResult(result.data);
}

export async function transitionActionNeedOffer(
  supabase: SupabaseClient,
  needId: string,
  offerId: string,
  actorClerkId: string,
  operation: ActionNeedOfferOperation,
): Promise<ActionNeedOfferMutationResult> {
  const result = await supabase.rpc("transition_action_need_offer", {
    p_need_id: needId,
    p_offer_id: offerId,
    p_actor_clerk_id: actorClerkId,
    p_operation: operation,
  });
  if (result.error) throw result.error;
  return readMutationResult(result.data);
}
