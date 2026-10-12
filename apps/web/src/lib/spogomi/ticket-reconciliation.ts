import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpogomiRosterRow } from "./types";

type TicketImport = {
  id: string;
  created_at?: string | null;
};

const CANCELLATION_PATTERN = /annul|cancel|supprim|deleted|refus|refund/i;

export function isCancelledCachanTicket(status: string | null, deleted: boolean): boolean {
  return deleted || CANCELLATION_PATTERN.test(status ?? "");
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
