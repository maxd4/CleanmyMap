import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import { buildDeterministicTeamFormation, validateProposedTeamFormation } from "./preparation";
import { previewRosterFile } from "./preparation";
import type { SpogomiEventMode, SpogomiRosterColumnMapping, SpogomiRosterPreview, SpogomiTeamFormation } from "./types";
import type { SpogomiRosterPreviewOptions } from "./preparation-import";
import { hasProtectedSpogomiHumanDecision, isCachanTicketCompositionEligible, isCancelledCachanTicket, readCachanCommercialWithdrawalProofs, reconcileCachanTicketRows } from "./ticket-reconciliation";
import { isCancelledCachanTicketStatus } from "./ticket-status";
import { teamCompositionFingerprint } from "./team-composition";
import { verifyImportedRosterCompleteness, verifyImportedRosterSelection } from "./import-completeness";
export { verifyImportedRosterCompleteness, verifyImportedRosterSelection } from "./import-completeness";
export { SpogomiCompositionProtectionError, lockSpogomiTeams, moveParticipantToTeam } from "./composition-mutation-service";
export { createSpogomiEvent } from "./preparation-creation-service";
export { attachOfficialGpx } from "./preparation-gpx-service";

export type EventRow = {
  id: string;
  action_id: string;
  created_by_clerk_id: string;
  name: string;
  location_label: string;
  mode: SpogomiEventMode;
  state: string;
  starts_at: string;
  ends_at: string | null;
  team_size_config: { casual?: { minMembers?: number | null; maxMembers?: number | null } };
  creation_state: string;
  event_slug: string | null;
  public_visibility: "private" | "published";
  public_results_visibility: "hidden" | "provisional" | "certified";
  composition_revision?: number;
};

function actionIdentity(identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>): ActionPermissionIdentity {
  return { userId: identity?.userId ?? "", role: identity?.role ?? null, activeRole: identity?.activeRole ?? null };
}

async function canManageEvent(supabase: SupabaseClient, event: EventRow): Promise<boolean> {
  const organizers = await supabase.from("action_organizers").select("organizer_clerk_id").eq("action_id", event.action_id);
  if (organizers.error) throw organizers.error;
  const identity = await getCurrentUserIdentity();
  return canManageAction(actionIdentity(identity), { createdByClerkId: event.created_by_clerk_id }, [
    ...(organizers.data ?? []).map((row) => String(row.organizer_clerk_id)),
  ]);
}

export async function loadSpogomiEventForOrganizer(supabase: SupabaseClient, eventId: string, userId: string) {
  return loadOrganizerEventByFilter(supabase, "id", eventId, userId);
}

export async function loadSpogomiEventBySlugForOrganizer(
  supabase: SupabaseClient,
  slug: string,
  userId: string,
) {
  return loadOrganizerEventByFilter(supabase, "event_slug", slug, userId);
}

async function loadOrganizerEventByFilter(
  supabase: SupabaseClient,
  column: "id" | "event_slug",
  value: string,
  userId: string,
) {
  const result = await supabase
    .from("spogomi_events")
    .select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision")
    .eq(column, value)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const event = result.data as EventRow;
  const identity = await getCurrentUserIdentity({ userId });
  if (!identity || identity.userId !== userId) return false;
  if (!(await canManageEvent(supabase, event))) return false;
  return event;
}

export async function updateSpogomiEvent(params: {
  supabase: SupabaseClient;
  event: EventRow;
  actorClerkId: string;
  input: {
    name?: string;
    locationLabel?: string;
    startsAt?: string;
    endsAt?: string | null;
    mode?: SpogomiEventMode;
    casualTeamSize?: number | null;
    publicVisibility?: "private" | "published";
    publicResultsVisibility?: "hidden" | "provisional" | "certified";
  };
}) {
  const { event, input, supabase, actorClerkId } = params;
  const name = input.name?.trim() || event.name;
  const locationLabel = input.locationLabel?.trim() || event.location_label;
  if (!name || !locationLabel) throw new Error("Validation: nom et lieu obligatoires.");
  const startsAt = input.startsAt ?? event.starts_at;
  const endsAt = input.endsAt === undefined ? event.ends_at : input.endsAt;
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    throw new Error("Validation: la fin doit être postérieure au début.");
  }
  if (input.publicVisibility === "published" && (!event.event_slug || !startsAt || !locationLabel)) {
    throw new Error("Validation: un événement publié doit avoir un identifiant, une date et un lieu.");
  }
  if (input.publicVisibility === "published" && event.state === "draft") {
    throw new Error("Validation: un brouillon doit d'abord quitter l'état draft avant publication.");
  }
  const currentCasual = event.team_size_config?.casual ?? {};
  const teamSizeConfig = input.casualTeamSize === undefined
    ? event.team_size_config
    : {
      ...event.team_size_config,
      casual: {
        ...currentCasual,
        minMembers: input.casualTeamSize,
        maxMembers: input.casualTeamSize,
      },
    };
  const result = await supabase.rpc("spogomi_update_event_metadata", {
    p_event_id: event.id,
    p_expected_revision: Number(event.composition_revision ?? 0),
    p_actor_clerk_id: actorClerkId,
    p_name: name,
    p_location_label: locationLabel,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_mode: input.mode ?? event.mode,
    p_team_size_config: teamSizeConfig,
    p_public_visibility: input.publicVisibility ?? event.public_visibility,
    p_public_results_visibility: input.publicResultsVisibility ?? event.public_results_visibility,
  });
  if (result.error) throw result.error;
  return result.data as EventRow;
}

const IMPORT_LEASE_MS = 2 * 60 * 1000;

type RosterImport = Record<string, unknown> & {
  id: string;
  status: string;
  source_row_count: number;
  column_mapping: SpogomiRosterColumnMapping;
  processing_token: string | null;
  processing_started_at: string | null;
  source_proof_status?: "pending" | "complete" | "legacy_unavailable" | "incomplete";
};

function conflict(message: string): Error {
  return new Error(`Conflict: ${message}`);
}


function canonicalImportColumns(mapping: SpogomiRosterColumnMapping): string {
  return JSON.stringify(["name", "group", "sourceRowId", "ticketReference", "orderReference", "orderAlternativeReference", "ticketStatus", "ticketDeleted"].filter((key) => mapping[key as keyof SpogomiRosterColumnMapping] !== undefined).map((key) => [key, mapping[key as keyof SpogomiRosterColumnMapping]]));
}

function canonicalImportMapping(mapping: SpogomiRosterColumnMapping, options?: Pick<SpogomiRosterPreview, "sheetName" | "headerRow">): string {
  return JSON.stringify({
    columns: canonicalImportColumns(mapping),
    sheetName: options?.sheetName ?? null,
    headerRow: options?.headerRow ?? null,
  });
}

function importMappingMatches(stored: SpogomiRosterColumnMapping, preview: SpogomiRosterPreview): boolean {
  if (canonicalImportColumns(stored) !== canonicalImportColumns(preview.mapping)) return false;
  const metadata = stored as Record<string, string>;
  if (!metadata.__sheetName && !metadata.__headerRow) return true;
  return canonicalImportMapping(stored, { sheetName: String(metadata.__sheetName ?? ""), headerRow: Number(metadata.__headerRow ?? 0) }) === canonicalImportMapping(preview.mapping, preview);
}

export async function previewRosterImportChanges(
  supabase: SupabaseClient,
  event: EventRow,
  preview: SpogomiRosterPreview,
): Promise<SpogomiRosterPreview> {
  if (preview.sourceSystem !== "cachan_ticketing") {
    const errorsByRow = new Set(preview.errors.map((error) => error.rowNumber));
    const rowEffects: NonNullable<SpogomiRosterPreview["rowEffects"]> = Object.fromEntries(preview.rows.map((row) => [String(row.rowNumber), errorsByRow.has(row.rowNumber) ? "excluded" : "created"]));
    return { ...preview, rowEffects, importSummary: { created: preview.rows.filter((row) => !errorsByRow.has(row.rowNumber)).length, unchanged: 0, changed: 0, conflicts: preview.errors.length, excluded: preview.ignoredRowNumbers.length } };
  }
  const references = preview.rows.map((row) => row.externalReference).filter((reference): reference is string => Boolean(reference));
  if (!references.length) return { ...preview, rowEffects: {}, importSummary: { created: 0, unchanged: 0, changed: 0, conflicts: preview.errors.length, excluded: preview.ignoredRowNumbers.length } };
  const existing = await supabase.from("spogomi_participants")
    .select("id, external_reference, source_system, order_reference, order_alternative_reference, ticket_status, ticket_deleted, display_name, identity_status, attendance_status, account_link_status, clerk_id, team_id, registration_status")
    .eq("event_id", event.id)
    .eq("source_system", preview.sourceSystem)
    .in("external_reference", references);
  if (existing.error) throw existing.error;
  const byReference = new Map((existing.data ?? []).map((row) => [String(row.external_reference), row]));
  const existingParticipantIds = [...byReference.values()].map((row) => String(row.id));
  const protectedCancellations = existingParticipantIds.length
    ? await supabase.from("spogomi_roster_import_changes")
      .select("participant_id")
      .eq("event_id", event.id)
      .in("change_kind", ["ticket_cancellation_conflict", "ticket_composition_lock_conflict"])
      .in("participant_id", existingParticipantIds)
    : { data: [], error: null };
  if (protectedCancellations.error) throw protectedCancellations.error;
  const protectedCancellationIds = new Set((protectedCancellations.data ?? []).map((row) => String(row.participant_id)));
  const sourceWithdrawalIds = await readCachanCommercialWithdrawalProofs({
    supabase,
    eventId: event.id,
    participants: [...byReference.values()].map((row) => ({ id: String(row.id), ticket_status: row.ticket_status, ticket_deleted: Boolean(row.ticket_deleted) })),
  });
  const changedRowNumbers: number[] = [];
  const conflictRowNumbers: number[] = [];
  const errorsByRow = new Set(preview.errors.map((error) => error.rowNumber));
  const rowEffects: Record<string, "created" | "unchanged" | "changed" | "conflict" | "excluded"> = {};
  let unchanged = 0;
  let created = 0;
  for (const row of preview.rows) {
    const current = row.externalReference ? byReference.get(row.externalReference) : undefined;
    if (errorsByRow.has(row.rowNumber)) {
      rowEffects[String(row.rowNumber)] = "excluded";
      continue;
    }
    if (!current) {
      created += 1;
      rowEffects[String(row.rowNumber)] = "created";
    }
    else {
      const changed = current.order_reference !== row.orderReference ||
        current.order_alternative_reference !== row.orderAlternativeReference ||
        current.ticket_status !== row.ticketStatus ||
        Boolean(current.ticket_deleted) !== row.ticketDeleted ||
        (current.display_name ?? null) !== row.name;
      const cancellationChanged = Boolean(current.ticket_deleted) !== row.ticketDeleted ||
        isCancelledCachanTicketStatus(current.ticket_status) !== isCancelledCachanTicketStatus(row.ticketStatus);
      const hasHumanDecision = hasProtectedSpogomiHumanDecision({
        attendanceStatus: current.attendance_status,
        accountLinkStatus: current.account_link_status,
        clerkId: current.clerk_id,
        identityStatus: current.identity_status,
        teamId: current.team_id,
        registrationStatus: current.registration_status,
        sourceWithdrawalProven: sourceWithdrawalIds.has(String(current.id)),
      });
      if (changed) changedRowNumbers.push(row.rowNumber);
      else unchanged += 1;
      if ((cancellationChanged && hasHumanDecision) || (
        protectedCancellationIds.has(String(current.id))
      )) {
        conflictRowNumbers.push(row.rowNumber);
        rowEffects[String(row.rowNumber)] = "conflict";
      } else if (changed) rowEffects[String(row.rowNumber)] = "changed";
      else rowEffects[String(row.rowNumber)] = "unchanged";
    }
  }
  const conflicts = preview.errors.filter((error) => error.code === "ticket_reference_collision" || error.code === "ambiguous_identifier" || error.code === "ambiguous_mapping").length + conflictRowNumbers.length;
  return { ...preview, changedRowNumbers, conflictRowNumbers, rowEffects, importSummary: { created, unchanged, changed: changedRowNumbers.length, conflicts, excluded: preview.ignoredRowNumbers.length } };
}

export async function confirmRosterImport(params: { supabase: SupabaseClient; event: EventRow; userId: string; file: File; mapping?: SpogomiRosterColumnMapping; importOptions?: Pick<SpogomiRosterPreviewOptions, "sheetName" | "headerRow">; acceptedRowNumbers?: number[] }) {
  const { supabase, event, userId } = params;
  const preview = await previewRosterImportChanges(supabase, event, await previewRosterFile(params.file, params.importOptions ? { mapping: params.mapping, ...params.importOptions } : params.mapping));
  if (preview.requiresExplicitSelection) throw new Error("Validation: sélectionnez explicitement la feuille et les correspondances ambiguës avant confirmation.");
  const errorsByRow = new Set(preview.errors.map((error) => error.rowNumber));
  const eligibleRows = preview.rows.filter((row) => !errorsByRow.has(row.rowNumber));
  const selectedRowNumbers = params.acceptedRowNumbers ?? eligibleRows.map((row) => row.rowNumber);
  if (!selectedRowNumbers.length && eligibleRows.length) throw new Error("Validation: sélectionnez explicitement les lignes admissibles avant confirmation.");
  if (selectedRowNumbers.some((rowNumber) => errorsByRow.has(rowNumber) || !preview.rows.some((row) => row.rowNumber === rowNumber))) throw new Error("Validation: une ligne sélectionnée est invalide ou absente de l’aperçu.");
  const selectedRows = preview.rows.filter((row) => selectedRowNumbers.includes(row.rowNumber));
  if (!selectedRows.length && preview.rows.length) throw new Error("Validation: aucune ligne admissible sélectionnée.");
  const selectedConflictRows = (preview.conflictRowNumbers ?? []).filter((rowNumber) => selectedRowNumbers.includes(rowNumber));
  if (preview.sourceSystem === "cachan_ticketing" && selectedConflictRows.length) {
    throw conflict(`les lignes ${selectedConflictRows.join(", ")} nécessitent une résolution organisateur avant confirmation.`);
  }
  const existing = await supabase.from("spogomi_roster_imports").select("*").eq("event_id", event.id).eq("content_sha256", preview.contentHash).maybeSingle();
  if (existing.error) throw existing.error;
  let imported = existing.data as RosterImport | null;
  if (imported && !importMappingMatches(imported.column_mapping ?? {}, preview)) throw conflict("le même fichier a déjà été présenté avec une autre correspondance de colonnes.");
  const token = randomUUID();
  let ownsInitialReservation = false;
  if (!imported) {
    const created = await supabase.from("spogomi_roster_imports").insert({
      event_id: event.id,
      content_sha256: preview.contentHash,
      import_key: preview.importKey,
      file_name: preview.fileName,
      format: preview.format,
      column_mapping: { ...preview.mapping, __sheetName: preview.sheetName, __headerRow: String(preview.headerRow) },
      source_row_count: eligibleRows.length,
      imported_by_clerk_id: userId,
      status: "processing",
      processing_token: token,
      processing_started_at: new Date().toISOString(),
    }).select("*").maybeSingle();
    if (!created.error && created.data) {
      imported = created.data as RosterImport;
      ownsInitialReservation = true;
    }
    else if (created.error?.code === "23505") {
      const raced = await supabase.from("spogomi_roster_imports").select("*").eq("event_id", event.id).eq("content_sha256", preview.contentHash).single();
      if (raced.error) throw raced.error;
      const racedImport = raced.data as RosterImport;
      imported = racedImport;
    if (!importMappingMatches(racedImport.column_mapping ?? {}, preview)) throw conflict("le même fichier a déjà été présenté avec une autre correspondance de colonnes.");
    } else if (created.error) throw created.error;
  }
  if (!imported) throw conflict("l'import n'a pas pu être réservé.");
  const reservedImport = imported;
  const allowsPartialProof = reservedImport.source_proof_status === "incomplete";
  if (reservedImport.status === "confirmed") {
    const selectedAlreadyImported = await verifyImportedRosterSelection(supabase, event.id, reservedImport.id, selectedRows, selectedRows.length, preview.sourceSystem === "cachan_ticketing");
    if (selectedAlreadyImported) return { importId: reservedImport.id, importedRows: selectedRows.length, alreadyImported: true };
    if (!allowsPartialProof) throw conflict("l'import confirmé est incomplet et doit être repris.");
  }
  const activeSince = reservedImport.processing_started_at ? Date.parse(reservedImport.processing_started_at) : 0;
  if (reservedImport.processing_token && reservedImport.processing_token !== token && activeSince > Date.now() - IMPORT_LEASE_MS) throw conflict("un import est déjà en cours pour ce fichier.");
  if (!ownsInitialReservation) {
    const claimed = await supabase.from("spogomi_roster_imports").update({ status: "processing", processing_token: token, processing_started_at: new Date().toISOString(), source_row_count: eligibleRows.length, column_mapping: { ...preview.mapping, __sheetName: preview.sheetName, __headerRow: String(preview.headerRow) }, file_name: preview.fileName, format: preview.format }).eq("id", reservedImport.id).or(`processing_token.is.null,processing_started_at.is.null,processing_started_at.lt.${new Date(Date.now() - IMPORT_LEASE_MS).toISOString()}`).select("id").maybeSingle();
    if (claimed.error) throw claimed.error;
    if (!claimed.data) throw conflict("un import concurrent est déjà en cours pour ce fichier.");
  }
  const participantRows = selectedRows.map((row) => ({
    event_id: event.id,
    roster_import_id: reservedImport.id,
    source_row_number: row.rowNumber,
    source_row_id: row.sourceRowId,
    source_fingerprint: row.sourceFingerprint,
    group_preference: row.groupPreference,
    external_reference: row.externalReference ?? row.sourceRowId,
    order_reference: row.orderReference,
    order_alternative_reference: row.orderAlternativeReference,
    source_system: row.sourceSystem,
    ticket_status: row.ticketStatus,
    ticket_deleted: row.ticketDeleted,
    identity_status: preview.sourceSystem === "cachan_ticketing" ? "unknown" : row.name ? "identified" : "unknown",
    display_name: row.name,
    registration_status: isCancelledCachanTicket(row.ticketStatus, row.ticketDeleted) ? "withdrawn" : "registered",
    attendance_status: "unknown",
    account_link_status: "unlinked",
  }));
  try {
    if (preview.sourceSystem === "cachan_ticketing") {
      const reconciliation = await reconcileCachanTicketRows({ supabase, eventId: event.id, rosterImport: reservedImport, rows: selectedRows });
      if (reconciliation.conflictRows.length) {
        throw conflict(`les lignes ${reconciliation.conflictRows.join(", ")} nécessitent une résolution organisateur avant confirmation.`);
      }
    } else {
      const inserted = await supabase.from("spogomi_participants").upsert(participantRows, {
        onConflict: "event_id,roster_import_id,source_row_number",
        ignoreDuplicates: false,
      });
      if (inserted.error) throw inserted.error;
    }
    if (!(await verifyImportedRosterSelection(supabase, event.id, reservedImport.id, selectedRows, selectedRows.length, preview.sourceSystem === "cachan_ticketing"))) throw conflict("l'import n'a pas produit toutes les lignes attendues.");
    const completeProof = await verifyImportedRosterCompleteness(supabase, event.id, reservedImport.id, eligibleRows, eligibleRows.length, preview.sourceSystem === "cachan_ticketing");
    const confirmed = await supabase.from("spogomi_roster_imports").update({ status: "confirmed", source_proof_status: completeProof ? "complete" : "incomplete", processing_token: null, processing_started_at: null }).eq("id", reservedImport.id).eq("processing_token", token).select("id").maybeSingle();
    if (confirmed.error) throw confirmed.error;
    if (!confirmed.data) throw conflict("la confirmation de l'import a été reprise par une autre opération.");
    return { importId: reservedImport.id, importedRows: participantRows.length, alreadyImported: false };
  } catch (error) {
    await supabase.from("spogomi_roster_imports").update({ status: "failed_recoverable", processing_token: null, processing_started_at: null }).eq("id", reservedImport.id).eq("processing_token", token);
    throw error instanceof Error && error.message.startsWith("Conflict:") ? error : new Error("Conflict: import non finalisé, reprise possible avec le même fichier et la même correspondance.");
  }
}

export type SpogomiTeamCompositionPreview = {
  formation: SpogomiTeamFormation;
  proposalFingerprint: string;
  expectedRevision: number;
  participantCount: number;
  assignedParticipantCount: number;
  preservedTeamIds: string[];
  explanation: string[];
};

export async function previewSpogomiTeams(supabase: SupabaseClient, event: EventRow): Promise<SpogomiTeamCompositionPreview> {
  if (event.state === "composition_locked") throw new Error("Validation: la composition est déjà verrouillée.");
  const participants = await supabase.from("spogomi_participants")
    .select("id, group_preference, source_row_number, team_id, registration_status, source_system, ticket_status, ticket_deleted")
    .eq("event_id", event.id)
    .eq("registration_status", "registered")
    .order("source_row_number", { ascending: true });
  if (participants.error) throw participants.error;
  const unresolvedTicketCancellations = (participants.data ?? []).filter((row) =>
    row.source_system === "cachan_ticketing" &&
    isCancelledCachanTicket(row.ticket_status, Boolean(row.ticket_deleted))
  );
  if (unresolvedTicketCancellations.length) {
    throw conflict("une place billetterie annulée ou supprimée reste enregistrée comme active ; une résolution organisateur est requise avant toute composition.");
  }
  const existingTeams = await supabase.from("spogomi_teams").select("id, team_number, composition_state").eq("event_id", event.id).order("team_number", { ascending: true });
  if (existingTeams.error) throw existingTeams.error;
  if ((existingTeams.data ?? []).some((team) => team.composition_state === "locked" || team.composition_state === "verified")) {
    throw new Error("Validation: une équipe possède déjà une composition verrouillée ou vérifiée.");
  }
  const participantRows = (participants.data ?? []).filter((row) => isCachanTicketCompositionEligible({
    sourceSystem: row.source_system,
    ticketStatus: row.ticket_status,
    ticketDeleted: Boolean(row.ticket_deleted),
    registrationStatus: String(row.registration_status),
  })).map((row) => ({
    id: String(row.id),
    sourceOrder: row.source_row_number ?? 0,
    groupPreference: row.group_preference,
    teamId: row.team_id,
    registrationStatus: String(row.registration_status),
  }));
  const teamRows = (existingTeams.data ?? []).map((row) => ({ id: String(row.id), teamNumber: Number(row.team_number), compositionState: String(row.composition_state) }));
  const formation = buildDeterministicTeamFormation({
    mode: event.mode,
    casualTeamSize: event.team_size_config?.casual?.maxMembers ?? null,
    casualTeamBounds: {
      minMembers: event.team_size_config?.casual?.minMembers ?? null,
      maxMembers: event.team_size_config?.casual?.maxMembers ?? null,
    },
    participants: participantRows.map(({ id, sourceOrder, groupPreference }) => ({ id, sourceOrder, groupPreference })),
  });
  const proposalFingerprint = teamCompositionFingerprint({ event, participants: participantRows, teams: teamRows, formation });
  return {
    formation,
    proposalFingerprint,
    expectedRevision: Number(event.composition_revision ?? 0),
    participantCount: participantRows.length,
    assignedParticipantCount: formation.teams.reduce((total, team) => total + team.participantIds.length, 0),
    preservedTeamIds: teamRows.map(({ id }) => id),
    explanation: formation.explanation,
  };
}

export async function confirmSpogomiTeams(params: {
  supabase: SupabaseClient;
  event: EventRow;
  expectedRevision: number;
  proposalFingerprint: string;
  actorClerkId: string;
  formation?: SpogomiTeamFormation;
}) {
  const preview = await previewSpogomiTeams(params.supabase, params.event);
  if (preview.expectedRevision !== params.expectedRevision || preview.proposalFingerprint !== params.proposalFingerprint) {
    throw conflict("la composition a changé depuis l'aperçu ; rechargez la proposition avant confirmation.");
  }
  const formation = params.formation
    ? validateProposedTeamFormation({
      formation: params.formation,
      participantIds: [
        ...preview.formation.teams.flatMap((team) => team.participantIds),
        ...preview.formation.unassignedParticipantIds,
      ],
      mode: params.event.mode,
      casualTeamBounds: {
        minMembers: params.event.team_size_config?.casual?.minMembers ?? null,
        maxMembers: params.event.team_size_config?.casual?.maxMembers ?? null,
      },
    })
    : preview.formation;
  const assignments = [
    ...formation.teams.flatMap((team) => team.participantIds.map((participantId) => ({ participantId, teamNumber: team.teamNumber }))),
    ...formation.unassignedParticipantIds.map((participantId) => ({ participantId, teamNumber: null })),
  ];
  const result = await params.supabase.rpc("spogomi_confirm_team_composition", {
    p_event_id: params.event.id,
    p_expected_revision: params.expectedRevision,
    p_assignments: assignments,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw result.error;
  return { ...preview, formation, assignedParticipantCount: formation.teams.reduce((total, team) => total + team.participantIds.length, 0), explanation: formation.explanation, confirmed: true, confirmation: result.data };
}

export async function autoComposeTeams(
  supabase: SupabaseClient,
  event: EventRow,
  confirmation?: { expectedRevision: number; proposalFingerprint: string; actorClerkId: string; formation?: SpogomiTeamFormation },
) {
  if (!confirmation) return previewSpogomiTeams(supabase, event);
  return confirmSpogomiTeams({ supabase, event, ...confirmation });
}

export function hashRosterPreview(preview: SpogomiRosterPreview): string {
  return createHash("sha256").update(JSON.stringify({ contentHash: preview.contentHash, mapping: preview.mapping, rows: preview.rows })).digest("hex");
}
