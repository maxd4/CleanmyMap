import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpogomiRosterRow } from "./types";

type TicketImport = {
  id: string;
  created_at?: string | null;
};

type TicketParticipant = {
  id: string;
  external_reference: string | null;
  roster_import_id: string | null;
  order_reference: string | null;
  order_alternative_reference: string | null;
  ticket_status: string | null;
  ticket_deleted: boolean;
  display_name: string | null;
  identity_status: string;
  attendance_status: string;
  account_link_status: string;
  clerk_id: string | null;
  team_id: string | null;
  registration_status: string;
};

const CANCELLATION_PATTERN = /annul|cancel|supprim|deleted|refus|refund/i;

function isCancelled(status: string | null, deleted: boolean): boolean {
  return deleted || CANCELLATION_PATTERN.test(status ?? "");
}

function conflict(message: string): Error {
  return new Error(`Conflict: ${message}`);
}

async function loadPriorTicketRows(
  supabase: SupabaseClient,
  eventId: string,
  references: string[],
): Promise<Map<string, TicketParticipant>> {
  const result = await supabase.from("spogomi_participants")
    .select("id, external_reference, roster_import_id, order_reference, order_alternative_reference, ticket_status, ticket_deleted, display_name, identity_status, attendance_status, account_link_status, clerk_id, team_id, registration_status")
    .eq("event_id", eventId)
    .eq("source_system", "cachan_ticketing")
    .in("external_reference", references);
  if (result.error) throw result.error;
  return new Map((result.data ?? []).map((row) => [String(row.external_reference), row as TicketParticipant]));
}

async function loadPriorImportDates(
  supabase: SupabaseClient,
  eventId: string,
  priorRows: Map<string, TicketParticipant>,
): Promise<Map<string, number>> {
  const importIds = [...new Set([...priorRows.values()].map((row) => row.roster_import_id).filter((id): id is string => Boolean(id)))];
  if (!importIds.length) return new Map();
  const result = await supabase.from("spogomi_roster_imports").select("id, created_at").eq("event_id", eventId).in("id", importIds);
  if (result.error) throw result.error;
  return new Map((result.data ?? []).map((row) => [String(row.id), Date.parse(String(row.created_at))]));
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
  const references = params.rows.map((row) => row.externalReference).filter((reference): reference is string => Boolean(reference));
  const priorByReference = await loadPriorTicketRows(params.supabase, params.eventId, references);
  const createdAtByImportId = await loadPriorImportDates(params.supabase, params.eventId, priorByReference);
  const reservedCreatedAt = Date.parse(String(params.rosterImport.created_at ?? ""));
  const participantIdsByReference = new Map<string, string>();

  for (const row of params.rows) {
    if (!row.externalReference) throw conflict("une référence de billet est nécessaire pour réconcilier la place.");
    const previous = priorByReference.get(row.externalReference);
    const previousImportId = previous?.roster_import_id ?? null;
    const staleReplay = Boolean(previousImportId && previousImportId !== params.rosterImport.id && Number.isFinite(reservedCreatedAt) && (createdAtByImportId.get(previousImportId) ?? 0) > reservedCreatedAt);
    const patch = buildTicketParticipantPatch(params.rosterImport.id, row);
    if (previous && staleReplay) {
      participantIdsByReference.set(row.externalReference, previous.id);
      continue;
    }
    if (previous) {
      const updated = await params.supabase.from("spogomi_participants")
        .update(patch)
        .eq("id", previous.id)
        .eq("event_id", params.eventId)
        .select("id")
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) throw conflict("la place a changé pendant la réconciliation.");
      participantIdsByReference.set(row.externalReference, String(updated.data.id));
      continue;
    }
    const inserted = await params.supabase.from("spogomi_participants").insert({
      ...patch,
      group_preference: row.groupPreference,
      identity_status: row.name ? "identified" : "unknown",
      display_name: row.name,
      registration_status: isCancelled(row.ticketStatus, row.ticketDeleted) ? "withdrawn" : "registered",
      attendance_status: "unknown",
      account_link_status: "unlinked",
    }).select("id").maybeSingle();
    if (!inserted.error && inserted.data) {
      participantIdsByReference.set(row.externalReference, String(inserted.data.id));
      continue;
    }
    if (inserted.error?.code !== "23505") throw inserted.error ?? conflict("la place n'a pas pu être créée.");
    const raced = await params.supabase.from("spogomi_participants")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("source_system", "cachan_ticketing")
      .eq("external_reference", row.externalReference)
      .maybeSingle();
    if (raced.error) throw raced.error;
    if (!raced.data) throw conflict("la place a été créée par une opération concurrente mais reste introuvable.");
    const reconciled = await params.supabase.from("spogomi_participants")
      .update(patch)
      .eq("id", raced.data.id)
      .eq("event_id", params.eventId)
      .select("id")
      .maybeSingle();
    if (reconciled.error) throw reconciled.error;
    if (!reconciled.data) throw conflict("la place a changé pendant la réconciliation concurrente.");
    participantIdsByReference.set(row.externalReference, String(reconciled.data.id));
  }

  const changes = params.rows.flatMap((row) => {
    if (!row.externalReference) return [];
    const previous = priorByReference.get(row.externalReference);
    if (!previous) return [];
    const previousImportId = previous.roster_import_id ?? null;
    if (previousImportId && previousImportId !== params.rosterImport.id && Number.isFinite(reservedCreatedAt) && (createdAtByImportId.get(previousImportId) ?? 0) > reservedCreatedAt) return [];
    const cancellationChanged = isCancelled(previous.ticket_status, previous.ticket_deleted) !== isCancelled(row.ticketStatus, row.ticketDeleted);
    const humanDecision = previous.attendance_status !== "unknown" || previous.account_link_status === "verified" || Boolean(previous.clerk_id) || previous.identity_status === "identified" || Boolean(previous.team_id) || previous.registration_status !== "registered";
    const snapshots = { previous_snapshot: previous, current_snapshot: row };
    const kinds = [
      cancellationChanged ? (isCancelled(row.ticketStatus, row.ticketDeleted) ? "ticket_cancelled" : "ticket_reactivated") : null,
      previous.ticket_status !== row.ticketStatus ? "ticket_status_changed" : null,
      previous.order_reference !== row.orderReference ? "ticket_order_changed" : null,
      previous.order_alternative_reference !== row.orderAlternativeReference ? "ticket_advanced_order_changed" : null,
      (previous.display_name ?? null) !== row.name ? "ticket_identity_changed" : null,
      cancellationChanged && humanDecision ? "ticket_cancellation_conflict" : null,
    ].filter((kind): kind is "ticket_status_changed" | "ticket_cancelled" | "ticket_reactivated" | "ticket_order_changed" | "ticket_advanced_order_changed" | "ticket_identity_changed" | "ticket_cancellation_conflict" => Boolean(kind));
    return kinds.map((change_kind) => ({ event_id: params.eventId, roster_import_id: params.rosterImport.id, participant_id: participantIdsByReference.get(row.externalReference ?? "") ?? previous.id, change_kind, ...snapshots }));
  });
  if (changes.length) {
    const recorded = await params.supabase.from("spogomi_roster_import_changes").upsert(changes, { onConflict: "roster_import_id,participant_id,change_kind" });
    if (recorded.error) throw recorded.error;
  }

  const historyRows = params.rows.map((row) => ({
    event_id: params.eventId,
    roster_import_id: params.rosterImport.id,
    participant_id: participantIdsByReference.get(row.externalReference ?? ""),
    source_row_number: row.rowNumber,
    source_row_id: row.sourceRowId,
    source_fingerprint: row.sourceFingerprint,
    source_snapshot: row,
  }));
  if (historyRows.some((row) => !row.participant_id)) throw conflict("la preuve historique ne référence pas toutes les places importées.");
  const recordedRows = await params.supabase.from("spogomi_roster_import_rows").upsert(historyRows, { onConflict: "roster_import_id,source_row_number", ignoreDuplicates: true });
  if (recordedRows.error) throw recordedRows.error;
}
