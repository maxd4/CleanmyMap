import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActionRowById } from "./store-queries";
import { isActionStartInFuture, isPublishedFuturePreAction } from "./temporal";
import { readActionRegistrationRecord } from "./participation/registration-records";
import type {
  ActionBuddyAvailabilityRow,
  ActionBuddyProposalRow,
  ActionBuddyRequestRow,
  ActionRow,
} from "@/types/database";

const AVAILABILITY_COLUMNS = "action_id, mentor_user_id, created_at, updated_at";
const REQUEST_COLUMNS = "id, action_id, requester_user_id, status, matched_mentor_user_id, created_at, updated_at, matched_at";
const PROPOSAL_COLUMNS = "id, request_id, mentor_user_id, status, created_at, resolved_at";

export class ActionBuddyNotFoundError extends Error {
  constructor(message = "Action buddy resource not found.") {
    super(message);
    this.name = "ActionBuddyNotFoundError";
  }
}

export class ActionBuddyForbiddenError extends Error {
  constructor(message = "Action buddy access forbidden.") {
    super(message);
    this.name = "ActionBuddyForbiddenError";
  }
}

export class ActionBuddyConflictError extends Error {
  constructor(message = "Action buddy conflict.") {
    super(message);
    this.name = "ActionBuddyConflictError";
  }
}

export type ActionBuddyProposalView = Pick<ActionBuddyProposalRow, "id" | "status">;

type ActionBuddyAcceptanceResult = {
  status?: "matched" | "already_matched";
  request_id?: string;
  proposal_id?: string;
  mentor_user_id?: string;
  matched_at?: string | null;
};

export type ActionBuddyState = {
  actionId: string;
  availability: ActionBuddyAvailabilityRow | null;
  request: ActionBuddyRequestRow | null;
  proposals: ActionBuddyProposalView[];
  sentProposals: ActionBuddyProposalView[];
  receivedProposals: ActionBuddyProposalView[];
  openRequests: Array<Pick<ActionBuddyRequestRow, "id" | "created_at">>;
  matchedRequest: ActionBuddyRequestRow | null;
  matchedPartner: {
    userId: string;
    displayName: string;
    handle: string | null;
  } | null;
};

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}

function isNoRowsUpdate(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "PGRST116",
  );
}

function throwDatabaseError(error: { message?: string } | null): never {
  throw new Error(error?.message || "Action buddy database operation failed.");
}

function projectProposal(proposal: ActionBuddyProposalRow): ActionBuddyProposalView {
  return { id: proposal.id, status: proposal.status };
}

async function loadAction(supabase: SupabaseClient, actionId: string): Promise<ActionRow> {
  const action = await fetchActionRowById(supabase, actionId);
  if (!action) throw new ActionBuddyNotFoundError("Action buddy action not found.");
  return action;
}

function assertFutureBuddyAction(action: ActionRow): void {
  if (
    action.access_mode === "invite_link" ||
    !isPublishedFuturePreAction(action)
  ) {
    throw new ActionBuddyConflictError("Action buddy conflict: action is not eligible.");
  }
}

function assertActionNotStarted(action: ActionRow): void {
  if (!isActionStartInFuture(action)) {
    throw new ActionBuddyConflictError("Action buddy conflict: action has started.");
  }
}

async function assertConfirmedRegistration(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
): Promise<void> {
  const registration = await readActionRegistrationRecord(supabase, { actionId, userId });
  if (registration?.registration_status !== "confirmed") {
    throw new ActionBuddyConflictError("Action buddy conflict: confirmed registration required.");
  }
}

async function loadLatestRequest(
  supabase: SupabaseClient,
  actionId: string,
  requesterUserId: string,
): Promise<ActionBuddyRequestRow | null> {
  const result = await supabase
    .from("action_buddy_requests")
    .select(REQUEST_COLUMNS)
    .eq("action_id", actionId)
    .eq("requester_user_id", requesterUserId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  return result.data as ActionBuddyRequestRow | null;
}

async function loadRequestById(
  supabase: SupabaseClient,
  actionId: string,
  requestId: string,
): Promise<ActionBuddyRequestRow> {
  const result = await supabase
    .from("action_buddy_requests")
    .select(REQUEST_COLUMNS)
    .eq("id", requestId)
    .eq("action_id", actionId)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  if (!result.data) throw new ActionBuddyNotFoundError("Action buddy request not found.");
  return result.data as ActionBuddyRequestRow;
}

async function loadProposal(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<ActionBuddyProposalRow> {
  const result = await supabase
    .from("action_buddy_proposals")
    .select(PROPOSAL_COLUMNS)
    .eq("id", proposalId)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  if (!result.data) throw new ActionBuddyNotFoundError("Action buddy proposal not found.");
  return result.data as ActionBuddyProposalRow;
}

async function loadAvailability(
  supabase: SupabaseClient,
  actionId: string,
  mentorUserId: string,
): Promise<ActionBuddyAvailabilityRow | null> {
  const result = await supabase
    .from("action_buddy_availability")
    .select(AVAILABILITY_COLUMNS)
    .eq("action_id", actionId)
    .eq("mentor_user_id", mentorUserId)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  return result.data as ActionBuddyAvailabilityRow | null;
}

async function loadRequestProposals(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ActionBuddyProposalRow[]> {
  const result = await supabase
    .from("action_buddy_proposals")
    .select(PROPOSAL_COLUMNS)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (result.error) throwDatabaseError(result.error);
  return (result.data ?? []) as ActionBuddyProposalRow[];
}

async function loadMentorProposals(
  supabase: SupabaseClient,
  actionId: string,
  mentorUserId: string,
): Promise<ActionBuddyProposalRow[]> {
  const result = await supabase
    .from("action_buddy_proposals")
    .select(`${PROPOSAL_COLUMNS}, request:action_buddy_requests!inner(action_id)`)
    .eq("mentor_user_id", mentorUserId)
    .eq("request.action_id", actionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (result.error) throwDatabaseError(result.error);
  return (result.data ?? []).map((row) => {
    const proposal = { ...row } as ActionBuddyProposalRow & { request?: unknown };
    delete proposal.request;
    return proposal;
  });
}

async function loadOpenRequests(
  supabase: SupabaseClient,
  actionId: string,
  excludedRequesterUserId: string,
): Promise<Array<Pick<ActionBuddyRequestRow, "id" | "created_at">>> {
  const result = await supabase
    .from("action_buddy_requests")
    .select("id, created_at")
    .eq("action_id", actionId)
    .eq("status", "open")
    .neq("requester_user_id", excludedRequesterUserId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (result.error) throwDatabaseError(result.error);
  return (result.data ?? []) as Array<Pick<ActionBuddyRequestRow, "id" | "created_at">>;
}

async function loadMatchedRequestForMentor(
  supabase: SupabaseClient,
  actionId: string,
  mentorUserId: string,
): Promise<ActionBuddyRequestRow | null> {
  const result = await supabase
    .from("action_buddy_requests")
    .select(REQUEST_COLUMNS)
    .eq("action_id", actionId)
    .eq("status", "matched")
    .eq("matched_mentor_user_id", mentorUserId)
    .order("matched_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  return result.data as ActionBuddyRequestRow | null;
}

async function loadMatchedPartner(
  supabase: SupabaseClient,
  currentUserId: string,
  request: ActionBuddyRequestRow | null,
): Promise<ActionBuddyState["matchedPartner"]> {
  if (!request || request.status !== "matched" || !request.matched_mentor_user_id) return null;
  const partnerUserId = request.requester_user_id === currentUserId
    ? request.matched_mentor_user_id
    : request.requester_user_id;
  const result = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .eq("id", partnerUserId)
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  if (!result.data) return { userId: partnerUserId, displayName: "Membre", handle: null };
  return {
    userId: partnerUserId,
    displayName: typeof result.data.display_name === "string" && result.data.display_name.trim()
      ? result.data.display_name.trim()
      : "Membre",
    handle: typeof result.data.handle === "string" && result.data.handle.trim()
      ? result.data.handle.trim()
      : null,
  };
}

export async function loadActionBuddyState(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<ActionBuddyState> {
  const action = await loadAction(supabase, params.actionId);
  if (action.action_phase !== "pre_action") {
    throw new ActionBuddyNotFoundError("Action buddy action not found.");
  }
  await assertConfirmedRegistration(supabase, params.actionId, params.userId);

  const [availability, request, matchedRequestForMentor] = await Promise.all([
    loadAvailability(supabase, params.actionId, params.userId),
    loadLatestRequest(supabase, params.actionId, params.userId),
    loadMatchedRequestForMentor(supabase, params.actionId, params.userId),
  ]);
  const [requestProposals, mentorProposals, openRequests] = await Promise.all([
    request ? loadRequestProposals(supabase, request.id) : Promise.resolve([]),
    loadMentorProposals(supabase, params.actionId, params.userId),
    availability ? loadOpenRequests(supabase, params.actionId, params.userId) : Promise.resolve([]),
  ]);
  const receivedProposals = requestProposals.map(projectProposal);
  const sentProposals = mentorProposals.map(projectProposal);
  const proposals = [...new Map(
    [...receivedProposals, ...sentProposals].map((proposal) => [proposal.id, proposal]),
  ).values()];
  const matchedRequest = request?.status === "matched" ? request : matchedRequestForMentor;
  const matchedPartner = await loadMatchedPartner(supabase, params.userId, matchedRequest);
  return {
    actionId: params.actionId,
    availability,
    request,
    proposals,
    sentProposals,
    receivedProposals,
    openRequests,
    matchedRequest,
    matchedPartner,
  };
}

export async function createActionBuddyRequest(
  supabase: SupabaseClient,
  params: { actionId: string; requesterUserId: string },
): Promise<ActionBuddyRequestRow> {
  const action = await loadAction(supabase, params.actionId);
  assertFutureBuddyAction(action);
  await assertConfirmedRegistration(supabase, params.actionId, params.requesterUserId);

  const result = await supabase
    .from("action_buddy_requests")
    .insert({ action_id: params.actionId, requester_user_id: params.requesterUserId, status: "open" })
    .select(REQUEST_COLUMNS)
    .single();
  if (result.error) {
    if (isUniqueViolation(result.error)) throw new ActionBuddyConflictError("Action buddy conflict: active request already exists.");
    throwDatabaseError(result.error);
  }
  return result.data as ActionBuddyRequestRow;
}

export async function setActionBuddyAvailability(
  supabase: SupabaseClient,
  params: { actionId: string; mentorUserId: string },
): Promise<ActionBuddyAvailabilityRow> {
  const action = await loadAction(supabase, params.actionId);
  assertFutureBuddyAction(action);
  await assertConfirmedRegistration(supabase, params.actionId, params.mentorUserId);

  const result = await supabase
    .from("action_buddy_availability")
    .upsert(
      { action_id: params.actionId, mentor_user_id: params.mentorUserId },
      { onConflict: "action_id,mentor_user_id" },
    )
    .select(AVAILABILITY_COLUMNS)
    .single();
  if (result.error) throwDatabaseError(result.error);
  return result.data as ActionBuddyAvailabilityRow;
}

export async function removeActionBuddyAvailability(
  supabase: SupabaseClient,
  params: { actionId: string; mentorUserId: string },
): Promise<{ removed: boolean }> {
  await loadAction(supabase, params.actionId);
  const result = await supabase
    .from("action_buddy_availability")
    .delete()
    .eq("action_id", params.actionId)
    .eq("mentor_user_id", params.mentorUserId)
    .select("action_id")
    .maybeSingle();
  if (result.error) throwDatabaseError(result.error);
  return { removed: Boolean(result.data) };
}

export async function createActionBuddyProposal(
  supabase: SupabaseClient,
  params: { actionId: string; requestId: string; mentorUserId: string },
): Promise<ActionBuddyProposalRow> {
  const action = await loadAction(supabase, params.actionId);
  assertFutureBuddyAction(action);
  const request = await loadRequestById(supabase, params.actionId, params.requestId);
  if (request.status !== "open") {
    throw new ActionBuddyConflictError("Action buddy conflict: request is not open.");
  }
  if (request.requester_user_id === params.mentorUserId) {
    throw new ActionBuddyConflictError("Action buddy conflict: self-match is forbidden.");
  }
  await assertConfirmedRegistration(supabase, params.actionId, request.requester_user_id);
  await assertConfirmedRegistration(supabase, params.actionId, params.mentorUserId);
  if (!await loadAvailability(supabase, params.actionId, params.mentorUserId)) {
    throw new ActionBuddyConflictError("Action buddy conflict: mentor is not available.");
  }

  const result = await supabase
    .from("action_buddy_proposals")
    .insert({ request_id: params.requestId, mentor_user_id: params.mentorUserId, status: "pending" })
    .select(PROPOSAL_COLUMNS)
    .single();
  if (result.error) {
    if (isUniqueViolation(result.error)) throw new ActionBuddyConflictError("Action buddy conflict: pending proposal already exists.");
    if (result.error.message?.includes("request_not_open")) throw new ActionBuddyConflictError("Action buddy conflict: request is not open.");
    throwDatabaseError(result.error);
  }
  return result.data as ActionBuddyProposalRow;
}

export async function cancelActionBuddyRequest(
  supabase: SupabaseClient,
  params: { actionId: string; requesterUserId: string },
): Promise<{ request: ActionBuddyRequestRow; alreadyCancelled: boolean }> {
  const action = await loadAction(supabase, params.actionId);
  const request = await loadLatestRequest(supabase, params.actionId, params.requesterUserId);
  if (!request) throw new ActionBuddyNotFoundError("Action buddy request not found.");
  if (request.status === "cancelled") return { request, alreadyCancelled: true };
  assertActionNotStarted(action);

  const result = await supabase
    .from("action_buddy_requests")
    .update({ status: "cancelled" })
    .eq("id", request.id)
    .in("status", ["open", "matched"])
    .select(REQUEST_COLUMNS)
    .maybeSingle();
  if (result.error) {
    if (isNoRowsUpdate(result.error)) {
      throw new ActionBuddyConflictError("Action buddy conflict: request changed while cancelling.");
    }
    throwDatabaseError(result.error);
  }
  if (!result.data) {
    throw new ActionBuddyConflictError("Action buddy conflict: request changed while cancelling.");
  }
  return { request: result.data as ActionBuddyRequestRow, alreadyCancelled: false };
}

async function resolveOwnedProposal(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; mentorUserId: string },
): Promise<{ action: ActionRow; request: ActionBuddyRequestRow; proposal: ActionBuddyProposalRow }> {
  const action = await loadAction(supabase, params.actionId);
  const proposal = await loadProposal(supabase, params.proposalId);
  const request = await loadRequestById(supabase, params.actionId, proposal.request_id);
  if (proposal.mentor_user_id !== params.mentorUserId) throw new ActionBuddyForbiddenError();
  return { action, request, proposal };
}

export async function withdrawActionBuddyProposal(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; mentorUserId: string },
): Promise<{ proposal: ActionBuddyProposalRow; alreadyWithdrawn: boolean }> {
  const { proposal } = await resolveOwnedProposal(supabase, params);
  if (proposal.status === "withdrawn") return { proposal, alreadyWithdrawn: true };
  if (proposal.status !== "pending") throw new ActionBuddyConflictError("Action buddy conflict: proposal is already resolved.");
  const result = await supabase
    .from("action_buddy_proposals")
    .update({ status: "withdrawn", resolved_at: new Date().toISOString() })
    .eq("id", params.proposalId)
    .eq("status", "pending")
    .select(PROPOSAL_COLUMNS)
    .maybeSingle();
  if (result.error) {
    if (isNoRowsUpdate(result.error)) {
      throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while withdrawing.");
    }
    throwDatabaseError(result.error);
  }
  if (!result.data) {
    throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while withdrawing.");
  }
  return { proposal: result.data as ActionBuddyProposalRow, alreadyWithdrawn: false };
}

export async function declineActionBuddyProposal(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; mentorUserId: string },
): Promise<{ proposal: ActionBuddyProposalRow; alreadyDeclined: boolean }> {
  const { request, proposal } = await resolveOwnedProposal(supabase, params);
  if (proposal.status === "declined") return { proposal, alreadyDeclined: true };
  if (request.status !== "open" || proposal.status !== "pending") {
    throw new ActionBuddyConflictError("Action buddy conflict: proposal is not actionable.");
  }
  const result = await supabase
    .from("action_buddy_proposals")
    .update({ status: "declined", resolved_at: new Date().toISOString() })
    .eq("id", params.proposalId)
    .eq("status", "pending")
    .select(PROPOSAL_COLUMNS)
    .maybeSingle();
  if (result.error) {
    if (isNoRowsUpdate(result.error)) {
      throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while declining.");
    }
    throwDatabaseError(result.error);
  }
  if (!result.data) {
    throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while declining.");
  }
  return { proposal: result.data as ActionBuddyProposalRow, alreadyDeclined: false };
}

export async function rejectActionBuddyProposal(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; requesterUserId: string },
): Promise<{ proposal: ActionBuddyProposalRow; alreadyDeclined: boolean }> {
  const proposal = await loadProposal(supabase, params.proposalId);
  const request = await loadRequestById(supabase, params.actionId, proposal.request_id);
  if (request.requester_user_id !== params.requesterUserId) throw new ActionBuddyForbiddenError();
  if (proposal.status === "declined") return { proposal, alreadyDeclined: true };
  if (request.status !== "open" || proposal.status !== "pending") {
    throw new ActionBuddyConflictError("Action buddy conflict: proposal is not actionable.");
  }
  const result = await supabase
    .from("action_buddy_proposals")
    .update({ status: "declined", resolved_at: new Date().toISOString() })
    .eq("id", params.proposalId)
    .eq("status", "pending")
    .select(PROPOSAL_COLUMNS)
    .maybeSingle();
  if (result.error) {
    if (isNoRowsUpdate(result.error)) {
      throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while declining.");
    }
    throwDatabaseError(result.error);
  }
  if (!result.data) throw new ActionBuddyConflictError("Action buddy conflict: proposal changed while declining.");
  return { proposal: result.data as ActionBuddyProposalRow, alreadyDeclined: false };
}

export async function acceptActionBuddyProposal(
  supabase: SupabaseClient,
  params: { actionId: string; proposalId: string; requesterUserId: string },
): Promise<ActionBuddyAcceptanceResult> {
  const proposal = await loadProposal(supabase, params.proposalId);
  const request = await loadRequestById(supabase, params.actionId, proposal.request_id);
  if (request.requester_user_id !== params.requesterUserId) throw new ActionBuddyForbiddenError();
  if (request.status !== "open" && !(proposal.status === "accepted" && request.status === "matched")) {
    throw new ActionBuddyConflictError("Action buddy conflict: request is not actionable.");
  }

  const result = await supabase.rpc("accept_action_buddy_proposal", {
    p_proposal_id: params.proposalId,
  });
  if (result.error) {
    if (result.error.message?.includes("not_found")) throw new ActionBuddyNotFoundError();
    if (result.error.message?.includes("action_buddy_conflict")) throw new ActionBuddyConflictError(result.error.message);
    throwDatabaseError(result.error);
  }
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as ActionBuddyAcceptanceResult | null;
  return row ?? {};
}

export async function resolveActionBuddyContact(
  supabase: SupabaseClient,
  params: { actionId: string; requestId: string; userId: string },
): Promise<{ request: ActionBuddyRequestRow; recipientUserId: string }> {
  const request = await loadRequestById(supabase, params.actionId, params.requestId);
  if (request.status !== "matched" || !request.matched_mentor_user_id) {
    throw new ActionBuddyConflictError("Action buddy contact is not authorized.");
  }
  if (request.requester_user_id === params.userId) {
    return { request, recipientUserId: request.matched_mentor_user_id };
  }
  if (request.matched_mentor_user_id === params.userId) {
    return { request, recipientUserId: request.requester_user_id };
  }
  throw new ActionBuddyForbiddenError("Action buddy contact belongs to another participant.");
}
