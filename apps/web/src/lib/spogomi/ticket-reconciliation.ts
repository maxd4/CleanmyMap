import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpogomiRosterRow } from "./types";
import { isCancelledCachanTicket as isCancelledCachanTicketStatus } from "./ticket-status";

type TicketImport = {
  id: string;
  created_at?: string | null;
};

export function isCancelledCachanTicket(status: string | null, deleted: boolean | null): boolean {
  return isCancelledCachanTicketStatus(status, deleted);
}

export function isCachanTicketCompositionEligible(input: {
  sourceSystem: string | null;
  ticketStatus: string | null;
  ticketDeleted: boolean;
  registrationStatus: string;
}): boolean {
  return input.sourceSystem !== "cachan_ticketing" || (
    input.registrationStatus === "registered" &&
    !isCancelledCachanTicket(input.ticketStatus, input.ticketDeleted)
  );
}

export function hasProtectedSpogomiHumanDecision(input: {
  attendanceStatus: string | null;
  accountLinkStatus: string | null;
  clerkId: string | null;
  identityStatus: string | null;
  teamId: string | null;
  registrationStatus: string | null;
  sourceWithdrawalProven: boolean;
}): boolean {
  return input.attendanceStatus !== "unknown" ||
    input.accountLinkStatus === "verified" ||
    Boolean(input.clerkId) ||
    input.identityStatus === "identified" ||
    Boolean(input.teamId) ||
    (input.registrationStatus !== "registered" && !input.sourceWithdrawalProven);
}

export async function readCachanCommercialWithdrawalProofs(params: {
  supabase: SupabaseClient;
  eventId: string;
  participants: Array<{ id: string; ticket_status: string | null; ticket_deleted: boolean }>;
}): Promise<Set<string>> {
  if (!params.participants.length) return new Set();
  const changes = await params.supabase.from("spogomi_roster_import_changes")
    .select("participant_id, current_snapshot")
    .eq("event_id", params.eventId)
    .eq("change_kind", "ticket_cancelled")
    .in("participant_id", params.participants.map((participant) => participant.id));
  if (changes.error) throw changes.error;
  const currentById = new Map(params.participants.map((participant) => [participant.id, participant]));
  return new Set((changes.data ?? []).filter((row) => {
    const current = currentById.get(String(row.participant_id));
    const snapshot = row.current_snapshot as Record<string, unknown> | null | undefined;
    return Boolean(current && snapshot) &&
      snapshot?.ticketStatus === current?.ticket_status &&
      Boolean(snapshot?.ticketDeleted) === current?.ticket_deleted;
  }).map((row) => String(row.participant_id)));
}

function conflict(message: string): Error {
  return new Error(`Conflict: ${message}`);
}

export function buildTicketParticipantPatch(importId: string, row: SpogomiRosterRow) {
  return {
    roster_import_id: importId,
    source_row_number: row.rowNumber,
    source_row_id: row.sourceRowId,
    source_fingerprint: row.sourceFingerprint,
    external_reference: row.externalReference,
    order_reference: row.orderReference,
    order_alternative_reference: row.orderAlternativeReference,
    source_system: row.sourceSystem,
    ticket_status: row.ticketStatus,
    ticket_deleted: row.ticketDeleted,
  };
}

export async function reconcileCachanTicketRows(params: {
  supabase: SupabaseClient;
  eventId: string;
  rosterImport: TicketImport;
  rows: SpogomiRosterRow[];
}) {
  if (params.rows.some((row) => !row.externalReference)) {
    throw conflict("une référence de billet est nécessaire pour réconcilier la place.");
  }
  const result = await params.supabase.rpc("spogomi_reconcile_cachan_ticket_rows", {
    p_event_id: params.eventId,
    p_roster_import_id: params.rosterImport.id,
    p_rows: params.rows,
  });
  if (result.error) throw result.error;
  const data = (result.data ?? {}) as {
    participantIdsByReference?: Record<string, string>;
    changedRows?: number[];
    conflictRows?: number[];
  };
  const participantIdsByReference = new Map(Object.entries(data.participantIdsByReference ?? {}));
  if (participantIdsByReference.size !== params.rows.length) {
    throw conflict("la preuve historique ne référence pas toutes les places importées.");
  }
  return {
    participantIdsByReference,
    changedRows: data.changedRows ?? [],
    conflictRows: data.conflictRows ?? [],
  };
}
