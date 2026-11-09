import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SpogomiVolunteerHelpProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type SpogomiVolunteerHelpProposal = {
  id: string;
  eventId: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  helpType: string;
  motivation: string;
  usefulSkills: string;
  cleanwalkExperience: string;
  status: SpogomiVolunteerHelpProposalStatus;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type SpogomiVolunteerHelpProposalOrganizerView = SpogomiVolunteerHelpProposal & {
  requesterClerkId: string;
  decidedByClerkId: string | null;
};

export type SpogomiVolunteerHelpProposalWithdrawalView = Pick<SpogomiVolunteerHelpProposal, "id" | "eventId" | "status" | "decisionNote" | "decidedAt" | "createdAt">;

export class SpogomiVolunteerHelpProposalError extends Error {
  constructor(
    message: string,
    public readonly kind: "unavailable" | "conflict" | "forbidden" | "validation",
  ) {
    super(message);
    this.name = "SpogomiVolunteerHelpProposalError";
  }
}
const REQUESTER_COLUMNS = "id, event_id, contact_first_name, contact_last_name, contact_email, contact_phone, help_type, motivation, useful_skills, cleanwalk_experience, status, decision_note, decided_at, created_at";
const ORGANIZER_COLUMNS = `${REQUESTER_COLUMNS}, requester_clerk_id, decided_by_clerk_id`;

function errorCode(error: unknown): string | null {
  return error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";
}

function mapError(error: unknown): SpogomiVolunteerHelpProposalError {
  const code = errorCode(error);
  const message = errorMessage(error);
  if (code === "P0002") return new SpogomiVolunteerHelpProposalError("Cette édition n’est plus disponible pour une proposition d’aide.", "unavailable");
  if (code === "22023" && message.includes("idempotency_conflict")) return new SpogomiVolunteerHelpProposalError("Cette clé de rejeu est déjà associée à un autre contenu. Utilisez une nouvelle proposition.", "conflict");
  if (code === "23505") return new SpogomiVolunteerHelpProposalError("Une proposition d’aide active existe déjà pour cette édition.", "conflict");
  if (code === "40001") return new SpogomiVolunteerHelpProposalError("Cette proposition a déjà été traitée.", "conflict");
  if (code === "42501") {
    if (message.includes("organizer_required")) return new SpogomiVolunteerHelpProposalError("Seule l’organisation habilitée peut traiter cette proposition.", "forbidden");
    if (message.includes("requester_required")) return new SpogomiVolunteerHelpProposalError("Vous ne pouvez retirer que votre propre proposition.", "forbidden");
    return new SpogomiVolunteerHelpProposalError("Cette opération n’est pas autorisée.", "forbidden");
  }
  if (code === "22023") return new SpogomiVolunteerHelpProposalError("Les informations de la proposition sont invalides.", "validation");
  return new SpogomiVolunteerHelpProposalError("La proposition d’aide n’a pas pu être traitée.", "validation");
}

function asStatus(value: unknown): SpogomiVolunteerHelpProposalStatus {
  return value === "accepted" || value === "rejected" || value === "withdrawn" ? value : "pending";
}

function mapProposal(row: Record<string, unknown>): SpogomiVolunteerHelpProposal {
  return {
    id: String(row.id ?? ""),
    eventId: String(row.event_id ?? ""),
    contactFirstName: String(row.contact_first_name ?? ""),
    contactLastName: String(row.contact_last_name ?? ""),
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    contactPhone: typeof row.contact_phone === "string" ? row.contact_phone : null,
    helpType: String(row.help_type ?? ""),
    motivation: String(row.motivation ?? ""),
    usefulSkills: String(row.useful_skills ?? ""),
    cleanwalkExperience: String(row.cleanwalk_experience ?? ""),
    status: asStatus(row.status),
    decisionNote: typeof row.decision_note === "string" ? row.decision_note : null,
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function mapOrganizerProposal(row: Record<string, unknown>): SpogomiVolunteerHelpProposalOrganizerView {
  return {
    ...mapProposal(row),
    requesterClerkId: String(row.requester_clerk_id ?? ""),
    decidedByClerkId: typeof row.decided_by_clerk_id === "string" ? row.decided_by_clerk_id : null,
  };
}

function mapWithdrawalProposal(row: Record<string, unknown>): SpogomiVolunteerHelpProposalWithdrawalView {
  return {
    id: String(row.id ?? ""),
    eventId: String(row.event_id ?? ""),
    status: asStatus(row.status),
    decisionNote: typeof row.decision_note === "string" ? row.decision_note : null,
    decidedAt: typeof row.decided_at === "string" ? row.decided_at : null,
    createdAt: String(row.created_at ?? ""),
  };
}

function rpcRow(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new SpogomiVolunteerHelpProposalError("La proposition n’a pas pu être relue après son enregistrement.", "validation");
  return data as Record<string, unknown>;
}

export async function createSpogomiVolunteerHelpProposal(params: {
  supabase: SupabaseClient;
  eventId: string;
  requesterClerkId: string;
  clientRequestId: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  helpType: string;
  motivation: string;
  usefulSkills: string;
  cleanwalkExperience: string;
}): Promise<SpogomiVolunteerHelpProposal> {
  const result = await params.supabase.rpc("create_spogomi_volunteer_help_proposal", {
    p_event_id: params.eventId,
    p_requester_clerk_id: params.requesterClerkId,
    p_client_request_id: params.clientRequestId,
    p_contact_first_name: params.contactFirstName,
    p_contact_last_name: params.contactLastName,
    p_contact_email: params.contactEmail,
    p_contact_phone: params.contactPhone,
    p_help_type: params.helpType,
    p_motivation: params.motivation,
    p_useful_skills: params.usefulSkills,
    p_cleanwalk_experience: params.cleanwalkExperience,
  });
  if (result.error) throw mapError(result.error);
  return mapProposal(rpcRow(result.data));
}

export async function listSpogomiVolunteerHelpProposalsForRequester(supabase: SupabaseClient, params: { eventId: string; requesterClerkId: string }) {
  const result = await supabase.from("spogomi_volunteer_help_proposals").select(REQUESTER_COLUMNS).eq("event_id", params.eventId).eq("requester_clerk_id", params.requesterClerkId).order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapProposal(row as Record<string, unknown>));
}

export async function listSpogomiVolunteerHelpProposalsForOrganizer(supabase: SupabaseClient, eventId: string) {
  const result = await supabase.from("spogomi_volunteer_help_proposals").select(ORGANIZER_COLUMNS).eq("event_id", eventId).order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => mapOrganizerProposal(row as Record<string, unknown>));
}

export async function transitionSpogomiVolunteerHelpProposal(params: {
  supabase: SupabaseClient;
  proposalId: string;
  eventId: string;
  targetStatus: "accepted" | "rejected" | "withdrawn";
  actorClerkId: string;
  decisionNote?: string | null;
}): Promise<SpogomiVolunteerHelpProposalWithdrawalView | SpogomiVolunteerHelpProposalOrganizerView> {
  const result = await params.supabase.rpc("transition_spogomi_volunteer_help_proposal", {
    p_proposal_id: params.proposalId,
    p_event_id: params.eventId,
    p_target_status: params.targetStatus,
    p_actor_clerk_id: params.actorClerkId,
    p_decision_note: params.decisionNote?.trim() || null,
  });
  if (result.error) throw mapError(result.error);
  const row = rpcRow(result.data);
  return params.targetStatus === "withdrawn" ? mapWithdrawalProposal(row) : mapOrganizerProposal(row);
}
