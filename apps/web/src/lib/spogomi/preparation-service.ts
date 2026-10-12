import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAction } from "@/lib/actions/store-create";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import { parseGpxFile } from "@/lib/actions/geometry/gpx";
import { validateTeamComposition } from "./validation";
import { buildDeterministicTeamFormation } from "./preparation";
import { previewRosterFile } from "./preparation";
import type { SpogomiEventMode, SpogomiRosterColumnMapping, SpogomiRosterPreview, SpogomiTeamFormation } from "./types";
import type { SpogomiRosterPreviewOptions } from "./preparation-import";
import { normalizeSpogomiEventSlug } from "./public-service";

type EventRow = {
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
  const result = await supabase.from("spogomi_events").select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision").eq("id", eventId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const event = result.data as EventRow;
  const identity = await getCurrentUserIdentity();
  if (!identity || identity.userId !== userId) return false;
  if (!(await canManageEvent(supabase, event))) return false;
  return event;
}

export async function loadSpogomiEventBySlugForOrganizer(
  supabase: SupabaseClient,
  slug: string,
  userId: string,
) {
  const result = await supabase
    .from("spogomi_events")
    .select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision")
    .eq("event_slug", slug)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const event = result.data as EventRow;
  const identity = await getCurrentUserIdentity();
  if (!identity || identity.userId !== userId) return false;
  if (!(await canManageEvent(supabase, event))) return false;
  return event;
}

export async function updateSpogomiEvent(params: {
  supabase: SupabaseClient;
  event: EventRow;
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
  const { event, input, supabase } = params;
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
  const casualTeamSize = input.casualTeamSize === undefined
    ? event.team_size_config?.casual?.maxMembers ?? null
    : input.casualTeamSize;
  const result = await supabase
    .from("spogomi_events")
    .update({
      name,
      location_label: locationLabel,
      starts_at: startsAt,
      ends_at: endsAt,
      mode: input.mode ?? event.mode,
      team_size_config: { casual: { minMembers: casualTeamSize, maxMembers: casualTeamSize } },
      public_visibility: input.publicVisibility ?? event.public_visibility,
      public_results_visibility: input.publicResultsVisibility ?? event.public_results_visibility,
    })
    .eq("id", event.id)
    .select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision")
    .single();
  if (result.error) throw result.error;
  return result.data as EventRow;
}

const CREATION_LEASE_MS = 2 * 60 * 1000;
const IMPORT_LEASE_MS = 2 * 60 * 1000;
const IMPORT_VERIFICATION_PAGE_SIZE = 1_000;
const EVENT_SELECT = "id, action_id, created_by_clerk_id, idempotency_key, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision";

type CreationInput = {
  idempotencyKey: string;
  name: string;
  locationLabel: string;
  mode: SpogomiEventMode;
  startsAt: string;
  endsAt?: string | null;
  casualTeamSize?: number | null;
};

type CreationAttempt = {
  id: string;
  idempotency_key: string;
  created_by_clerk_id: string;
  action_id: string | null;
  event_id: string | null;
  state: string;
  intention_fingerprint: string | null;
  processing_token: string | null;
  processing_started_at: string | null;
};

type CreationEvent = Record<string, unknown> & {
  id: string;
  action_id: string;
  created_by_clerk_id: string;
  idempotency_key: string | null;
};

type RosterImport = Record<string, unknown> & {
  id: string;
  status: string;
  source_row_count: number;
  column_mapping: SpogomiRosterColumnMapping;
  processing_token: string | null;
  processing_started_at: string | null;
};

function conflict(message: string): Error {
  return new Error(`Conflict: ${message}`);
}

function canonicalCreationInput(input: CreationInput) {
  const startsAt = new Date(input.startsAt);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (Number.isNaN(startsAt.valueOf()) || (endsAt && Number.isNaN(endsAt.valueOf()))) {
    throw new Error("Validation: dates d'événement invalides.");
  }
  if (endsAt && endsAt < startsAt) throw new Error("Validation: la fin doit être postérieure au début.");
  return {
    name: input.name.trim(),
    locationLabel: input.locationLabel.trim(),
    mode: input.mode,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() ?? null,
    casualTeamSize: input.casualTeamSize ?? null,
  };
}

function creationFingerprint(input: CreationInput): string {
  return createHash("sha256").update(JSON.stringify(canonicalCreationInput(input))).digest("hex");
}

function eventMatchesInput(event: Record<string, unknown>, input: CreationInput): boolean {
  const canonical = canonicalCreationInput(input);
  const teamSize = (event.team_size_config as { casual?: { maxMembers?: number | null } } | null)?.casual?.maxMembers ?? null;
  return event.name === canonical.name &&
    event.location_label === canonical.locationLabel &&
    event.mode === canonical.mode &&
    new Date(String(event.starts_at)).toISOString() === canonical.startsAt &&
    (event.ends_at ? new Date(String(event.ends_at)).toISOString() : null) === canonical.endsAt &&
    teamSize === canonical.casualTeamSize;
}

async function loadEventById(supabase: SupabaseClient, eventId: string) {
  const result = await supabase.from("spogomi_events").select(EVENT_SELECT).eq("id", eventId).maybeSingle();
  if (result.error) throw result.error;
  return result.data as CreationEvent | null;
}

async function loadEventByKey(supabase: SupabaseClient, idempotencyKey: string) {
  const result = await supabase.from("spogomi_events").select(EVENT_SELECT).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (result.error) throw result.error;
  return result.data as CreationEvent | null;
}

async function assertActionOwnership(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>,
  expectedKey: string,
  expectedFingerprint: string,
) {
  const action = await supabase.from("actions").select("id, created_by_clerk_id, preparation_data").eq("id", actionId).maybeSingle();
  if (action.error) throw action.error;
  if (!action.data || action.data.created_by_clerk_id !== userId) throw conflict("la tentative de création n'appartient pas à cet organisateur.");
  const preparationData = (action.data.preparation_data ?? {}) as Record<string, unknown>;
  if (preparationData.spogomiCreationKey && preparationData.spogomiCreationKey !== expectedKey) {
    throw conflict("la relation action-événement est incohérente.");
  }
  if (preparationData.spogomiCreationFingerprint && preparationData.spogomiCreationFingerprint !== expectedFingerprint) {
    throw conflict("la clé d'idempotence a reçu des paramètres différents.");
  }
  const organizers = await supabase.from("action_organizers").select("organizer_clerk_id").eq("action_id", actionId);
  if (organizers.error) throw organizers.error;
  const manageable = canManageAction(actionIdentity(identity), { createdByClerkId: userId }, (organizers.data ?? []).map((row) => String(row.organizer_clerk_id)));
  if (!manageable) throw conflict("l'action canonique n'est pas gérée par cet organisateur.");
}

async function assertEventIntegrity(
  supabase: SupabaseClient,
  event: CreationEvent,
  input: CreationInput,
  userId: string,
  actionId: string,
  fingerprint: string,
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>,
) {
  if (event.created_by_clerk_id !== userId || event.idempotency_key !== input.idempotencyKey || event.action_id !== actionId || !eventMatchesInput(event, input)) {
    throw conflict("la clé d'idempotence a reçu des paramètres ou des relations différents.");
  }
  await assertActionOwnership(supabase, actionId, userId, identity, input.idempotencyKey, fingerprint);
}

async function claimCreationAttempt(
  supabase: SupabaseClient,
  input: CreationInput,
  userId: string,
  fingerprint: string,
): Promise<{ attempt: CreationAttempt; token: string }> {
  const token = randomUUID();
  const inserted = await supabase.from("spogomi_event_creation_attempts").insert({
    idempotency_key: input.idempotencyKey,
    created_by_clerk_id: userId,
    intention_fingerprint: fingerprint,
    state: "action_pending",
    processing_token: token,
    processing_started_at: new Date().toISOString(),
  }).select("*").maybeSingle();
  if (!inserted.error && inserted.data) return { attempt: inserted.data as CreationAttempt, token };
  if (inserted.error?.code !== "23505") throw inserted.error;

  const existing = await supabase.from("spogomi_event_creation_attempts").select("*").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw conflict("la réservation de création n'est plus disponible.");
  const attempt = existing.data as CreationAttempt;
  if (attempt.created_by_clerk_id !== userId) throw conflict("la clé d'idempotence est déjà utilisée.");
  if (attempt.intention_fingerprint && attempt.intention_fingerprint !== fingerprint) throw conflict("la clé d'idempotence a reçu des paramètres différents.");
  if (!attempt.intention_fingerprint) {
    if (!attempt.event_id) throw conflict("une ancienne tentative sans empreinte doit être reprise avec une nouvelle clé.");
    const event = await loadEventById(supabase, attempt.event_id);
    if (!event || !eventMatchesInput(event, input)) throw conflict("la clé d'idempotence ne peut pas être vérifiée.");
    const fingerprinted = await supabase.from("spogomi_event_creation_attempts").update({ intention_fingerprint: fingerprint }).eq("id", attempt.id).is("intention_fingerprint", null);
    if (fingerprinted.error) throw fingerprinted.error;
  }
  const activeSince = attempt.processing_started_at ? Date.parse(attempt.processing_started_at) : 0;
  if (attempt.processing_token && activeSince > Date.now() - CREATION_LEASE_MS) throw conflict("une création est déjà en cours pour cette clé.");
  const reclaimed = await supabase.from("spogomi_event_creation_attempts").update({
    processing_token: token,
    processing_started_at: new Date().toISOString(),
    state: attempt.action_id ? "event_pending" : "action_pending",
    last_error_code: null,
  }).eq("id", attempt.id).or(`processing_started_at.is.null,processing_started_at.lt.${new Date(Date.now() - CREATION_LEASE_MS).toISOString()}`).select("*").maybeSingle();
  if (reclaimed.error) throw reclaimed.error;
  if (!reclaimed.data) throw conflict("une création concurrente est en cours pour cette clé.");
  return { attempt: reclaimed.data as CreationAttempt, token };
}

async function updateCreationAttempt(supabase: SupabaseClient, attemptId: string, token: string, values: Record<string, unknown>) {
  const result = await supabase.from("spogomi_event_creation_attempts").update(values).eq("id", attemptId).eq("processing_token", token).select("*").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw conflict("la réservation de création a changé pendant l'opération.");
  return result.data as CreationAttempt;
}

export async function createSpogomiEvent(params: { supabase: SupabaseClient; userId: string; input: CreationInput }) {
  const { supabase, userId, input } = params;
  if (!/^[a-zA-Z0-9:_-]{8,128}$/.test(input.idempotencyKey)) throw new Error("Validation: clé d'idempotence invalide.");
  const canonical = canonicalCreationInput(input);
  if (!canonical.name || !canonical.locationLabel) throw new Error("Validation: nom et lieu obligatoires.");
  const identity = await getCurrentUserIdentity();
  if (!identity || identity.userId !== userId) throw new Error("Unauthorized");
  const fingerprint = creationFingerprint(input);
  const existing = await supabase.from("spogomi_event_creation_attempts").select("*").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data && existing.data.created_by_clerk_id !== userId) throw conflict("la clé d'idempotence est déjà utilisée.");
  if (existing.data?.intention_fingerprint && existing.data.intention_fingerprint !== fingerprint) throw conflict("la clé d'idempotence a reçu des paramètres différents.");
  if (existing.data?.event_id && existing.data.state === "ready") {
    const event = await loadEventById(supabase, String(existing.data.event_id));
    if (!event) throw conflict("l'événement lié à la tentative est introuvable.");
    await assertEventIntegrity(supabase, event, input, userId, event.action_id, fingerprint, identity);
    return { eventId: event.id, actionId: event.action_id };
  }

  const { attempt, token } = await claimCreationAttempt(supabase, input, userId, fingerprint);
  try {
    let actionId = attempt.action_id ? String(attempt.action_id) : null;
    if (!actionId) {
      const correlated = await supabase.from("actions").select("id, created_by_clerk_id, preparation_data").contains("preparation_data", { spogomiCreationKey: input.idempotencyKey }).maybeSingle();
      if (correlated.error) throw correlated.error;
      actionId = correlated.data?.id ? String(correlated.data.id) : null;
    }
    if (!actionId) {
      const created = await createAction(supabase, {
        userId,
        payload: {
          actorName: identity.displayName,
          actionDate: canonical.startsAt.slice(0, 10),
          locationLabel: canonical.locationLabel,
          actionPhase: "pre_action",
          preparationData: {
            interventionMode: createActionInterventionMode("fixed_area"),
            spogomiCreationKey: input.idempotencyKey,
            spogomiCreationFingerprint: fingerprint,
          },
          wasteKg: null,
          cigaretteButts: null,
          volunteersCount: 0,
          durationMinutes: 0,
          eventStartTime: canonical.startsAt,
          eventEndTime: canonical.endsAt,
          organizerType: null,
          organizerName: null,
        },
        organizers: [{ userId, displayName: identity.displayName, handle: identity.handle, isPrimary: true, sourceToken: null }],
        organizerRequirement: "required",
        status: "pending",
      });
      actionId = created.id;
    }
    await assertActionOwnership(supabase, actionId, userId, identity, input.idempotencyKey, fingerprint);
    if (!attempt.action_id) await updateCreationAttempt(supabase, attempt.id, token, { action_id: actionId, state: "event_pending" });

    let event = attempt.event_id ? await loadEventById(supabase, String(attempt.event_id)) : await loadEventByKey(supabase, input.idempotencyKey);
    if (event) await assertEventIntegrity(supabase, event, input, userId, actionId, fingerprint, identity);
    if (!event) {
      const baseSlug = normalizeSpogomiEventSlug(canonical.name);
      const eventPayload = {
        action_id: actionId,
        created_by_clerk_id: userId,
        idempotency_key: input.idempotencyKey,
        name: canonical.name,
        location_label: canonical.locationLabel,
        mode: canonical.mode,
        starts_at: canonical.startsAt,
        ends_at: canonical.endsAt,
        team_size_config: { casual: { minMembers: canonical.casualTeamSize, maxMembers: canonical.casualTeamSize } },
        regulation_version: "pending-official-regulation",
        regulation_status: "incomplete",
        creation_state: "event_pending",
        event_slug: baseSlug,
        public_visibility: "private" as const,
      };
      let inserted = await supabase.from("spogomi_events").insert(eventPayload).select(EVENT_SELECT).maybeSingle();
      if (inserted.error?.code === "23505") {
        const byKey = await loadEventByKey(supabase, input.idempotencyKey);
        if (byKey) event = byKey;
        else inserted = await supabase.from("spogomi_events").insert({ ...eventPayload, event_slug: `${baseSlug}-${actionId.slice(0, 8)}` }).select(EVENT_SELECT).maybeSingle();
      }
      if (!event && !inserted.error && inserted.data) event = inserted.data as CreationEvent;
      if (!event && inserted.error) throw new Error("Conflict: événement non finalisé, reprise possible avec la même clé.");
    }
    if (!event) throw new Error("Conflict: événement non finalisé, reprise possible avec la même clé.");
    await assertEventIntegrity(supabase, event, input, userId, actionId, fingerprint, identity);
    const eventReady = await supabase.from("spogomi_events").update({ creation_state: "ready" }).eq("id", event.id).eq("action_id", actionId);
    if (eventReady.error) throw eventReady.error;
    await updateCreationAttempt(supabase, attempt.id, token, { event_id: event.id, action_id: actionId, state: "ready", last_error_code: null, processing_token: null, processing_started_at: null });
    return { eventId: event.id, actionId };
  } catch (error) {
    await supabase.from("spogomi_event_creation_attempts").update({ state: "failed_recoverable", last_error_code: error instanceof Error ? error.name : "creation_failed", processing_token: null, processing_started_at: null }).eq("id", attempt.id).eq("processing_token", token);
    throw error;
  }
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
    return { ...preview, importSummary: { created: preview.rows.filter((row) => !errorsByRow.has(row.rowNumber)).length, unchanged: 0, changed: 0, conflicts: preview.errors.length, excluded: preview.ignoredRowNumbers.length } };
  }
  const references = preview.rows.map((row) => row.externalReference).filter((reference): reference is string => Boolean(reference));
  if (!references.length) return { ...preview, importSummary: { created: 0, unchanged: 0, changed: 0, conflicts: preview.errors.length, excluded: preview.ignoredRowNumbers.length } };
  const existing = await supabase.from("spogomi_participants")
    .select("id, external_reference, source_system, order_reference, order_alternative_reference, ticket_status, ticket_deleted, display_name")
    .eq("event_id", event.id)
    .eq("source_system", preview.sourceSystem)
    .in("external_reference", references);
  if (existing.error) throw existing.error;
  const byReference = new Map((existing.data ?? []).map((row) => [String(row.external_reference), row]));
  const changedRowNumbers: number[] = [];
  let unchanged = 0;
  let created = 0;
  for (const row of preview.rows) {
    const current = row.externalReference ? byReference.get(row.externalReference) : undefined;
    if (!current) created += 1;
    else if (current.order_reference !== row.orderReference || current.order_alternative_reference !== row.orderAlternativeReference || current.ticket_status !== row.ticketStatus || Boolean(current.ticket_deleted) !== row.ticketDeleted || (current.display_name ?? null) !== row.name) {
      changedRowNumbers.push(row.rowNumber);
    } else unchanged += 1;
  }
  const conflicts = preview.errors.filter((error) => error.code === "ticket_reference_collision" || error.code === "ambiguous_identifier" || error.code === "ambiguous_mapping").length;
  return { ...preview, changedRowNumbers, importSummary: { created, unchanged, changed: changedRowNumbers.length, conflicts, excluded: preview.ignoredRowNumbers.length } };
}

export async function verifyImportedRosterCompleteness(
  supabase: SupabaseClient,
  eventId: string,
  importId: string,
  rows: Array<{ rowNumber: number; sourceFingerprint: string }>,
  expectedCount: number,
) {
  if (rows.length !== expectedCount) return false;
  const expected = new Map(rows.map((row) => [row.rowNumber, row.sourceFingerprint]));
  if (expected.size !== rows.length) return false;

  const persisted: Array<{ source_row_number: number | null; source_fingerprint: string | null }> = [];
  for (let from = 0; ; from += IMPORT_VERIFICATION_PAGE_SIZE) {
    const page = await supabase
      .from("spogomi_participants")
      .select("source_row_number, source_fingerprint")
      .eq("event_id", eventId)
      .eq("roster_import_id", importId)
      .order("source_row_number", { ascending: true })
      .range(from, from + IMPORT_VERIFICATION_PAGE_SIZE - 1);
    if (page.error) throw page.error;
    const rowsOnPage = (page.data ?? []) as Array<{ source_row_number: number | null; source_fingerprint: string | null }>;
    persisted.push(...rowsOnPage);
    if (rowsOnPage.length < IMPORT_VERIFICATION_PAGE_SIZE) break;
  }

  if (persisted.length !== expectedCount) return false;
  const seen = new Set<number>();
  for (const row of persisted) {
    if (row.source_row_number === null || seen.has(row.source_row_number)) return false;
    if (expected.get(row.source_row_number) !== row.source_fingerprint) return false;
    seen.add(row.source_row_number);
  }
  return seen.size === expected.size;
}

export async function confirmRosterImport(params: { supabase: SupabaseClient; event: EventRow; userId: string; file: File; mapping?: SpogomiRosterColumnMapping; importOptions?: Pick<SpogomiRosterPreviewOptions, "sheetName" | "headerRow">; acceptedRowNumbers?: number[] }) {
  const { supabase, event, userId } = params;
  const preview = await previewRosterImportChanges(supabase, event, await previewRosterFile(params.file, params.importOptions ? { mapping: params.mapping, ...params.importOptions } : params.mapping));
  if (preview.requiresExplicitSelection) throw new Error("Validation: sélectionnez explicitement la feuille et les correspondances ambiguës avant confirmation.");
  const errorsByRow = new Set(preview.errors.map((error) => error.rowNumber));
  const selectedRowNumbers = params.acceptedRowNumbers ?? (preview.errors.length ? [] : preview.rows.map((row) => row.rowNumber));
  if (!selectedRowNumbers.length && preview.rows.length) throw new Error("Validation: sélectionnez explicitement les lignes admissibles avant confirmation.");
  if (selectedRowNumbers.some((rowNumber) => errorsByRow.has(rowNumber) || !preview.rows.some((row) => row.rowNumber === rowNumber))) throw new Error("Validation: une ligne sélectionnée est invalide ou absente de l’aperçu.");
  const selectedRows = preview.rows.filter((row) => selectedRowNumbers.includes(row.rowNumber));
  if (!selectedRows.length && preview.rows.length) throw new Error("Validation: aucune ligne admissible sélectionnée.");
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
      source_row_count: selectedRows.length,
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
  if (reservedImport.status === "confirmed") {
    if (!(await verifyImportedRosterCompleteness(supabase, event.id, reservedImport.id, selectedRows, selectedRows.length))) throw conflict("l'import confirmé est incomplet et doit être repris.");
    return { importId: reservedImport.id, importedRows: reservedImport.source_row_count, alreadyImported: true };
  }
  const activeSince = reservedImport.processing_started_at ? Date.parse(reservedImport.processing_started_at) : 0;
  if (reservedImport.processing_token && reservedImport.processing_token !== token && activeSince > Date.now() - IMPORT_LEASE_MS) throw conflict("un import est déjà en cours pour ce fichier.");
  if (!ownsInitialReservation) {
    const claimed = await supabase.from("spogomi_roster_imports").update({ status: "processing", processing_token: token, processing_started_at: new Date().toISOString(), source_row_count: selectedRows.length, column_mapping: { ...preview.mapping, __sheetName: preview.sheetName, __headerRow: String(preview.headerRow) }, file_name: preview.fileName, format: preview.format }).eq("id", reservedImport.id).or(`processing_token.is.null,processing_started_at.is.null,processing_started_at.lt.${new Date(Date.now() - IMPORT_LEASE_MS).toISOString()}`).select("id").maybeSingle();
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
    identity_status: row.name ? "identified" : "unknown",
    display_name: row.name,
    registration_status: row.ticketDeleted || /annul|cancel|supprim|deleted|refus|refund/i.test(row.ticketStatus ?? "") ? "withdrawn" : "registered",
    attendance_status: "unknown",
    account_link_status: "unlinked",
  }));
  const priorTicketRows = preview.sourceSystem === "cachan_ticketing"
    ? await supabase.from("spogomi_participants")
      .select("id, external_reference, order_reference, order_alternative_reference, ticket_status, ticket_deleted, display_name")
      .eq("event_id", event.id)
      .eq("source_system", preview.sourceSystem)
      .in("external_reference", selectedRows.map((row) => row.externalReference).filter((reference): reference is string => Boolean(reference)))
    : { data: [], error: null };
  if (priorTicketRows.error) throw priorTicketRows.error;
  const priorByReference = new Map((priorTicketRows.data ?? []).map((row) => [String(row.external_reference), row]));
  try {
    const inserted = await supabase.from("spogomi_participants").upsert(participantRows, {
      onConflict: preview.sourceSystem === "cachan_ticketing" ? "event_id,source_system,external_reference" : "event_id,roster_import_id,source_row_number",
      ignoreDuplicates: false,
    });
    if (inserted.error) throw inserted.error;
    if (preview.sourceSystem === "cachan_ticketing" && preview.changedRowNumbers?.length) {
      const changes = selectedRows.flatMap((row) => {
        const previous = row.externalReference ? priorByReference.get(row.externalReference) : undefined;
        if (!previous || !row.externalReference) return [];
        const snapshots = { previous_snapshot: previous, current_snapshot: row };
        const kinds = [
          (Boolean(previous.ticket_deleted) !== row.ticketDeleted || /annul|cancel|supprim|deleted|refus|refund/i.test(previous.ticket_status ?? "") !== /annul|cancel|supprim|deleted|refus|refund/i.test(row.ticketStatus ?? ""))
            ? (row.ticketDeleted || /annul|cancel|supprim|deleted|refus|refund/i.test(row.ticketStatus ?? "") ? "ticket_cancelled" : "ticket_reactivated")
            : null,
          previous.ticket_status !== row.ticketStatus ? "ticket_status_changed" : null,
          previous.order_reference !== row.orderReference ? "ticket_order_changed" : null,
          previous.order_alternative_reference !== row.orderAlternativeReference ? "ticket_advanced_order_changed" : null,
          (previous.display_name ?? null) !== row.name ? "ticket_identity_changed" : null,
        ].filter((kind): kind is "ticket_status_changed" | "ticket_cancelled" | "ticket_reactivated" | "ticket_order_changed" | "ticket_advanced_order_changed" | "ticket_identity_changed" => Boolean(kind));
        return kinds.map((change_kind) => ({ event_id: event.id, roster_import_id: reservedImport.id, participant_id: previous.id, change_kind, ...snapshots }));
      });
      if (changes.length) {
        const recorded = await supabase.from("spogomi_roster_import_changes").upsert(changes, { onConflict: "roster_import_id,participant_id,change_kind" });
        if (recorded.error) throw recorded.error;
      }
    }
    if (!(await verifyImportedRosterCompleteness(supabase, event.id, reservedImport.id, selectedRows, selectedRows.length))) throw conflict("l'import n'a pas produit toutes les lignes attendues.");
    const confirmed = await supabase.from("spogomi_roster_imports").update({ status: "confirmed", processing_token: null, processing_started_at: null }).eq("id", reservedImport.id).eq("processing_token", token).select("id").maybeSingle();
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

function teamCompositionFingerprint(input: {
  event: EventRow;
  participants: Array<{ id: string; sourceOrder: number; groupPreference: string | null; teamId: string | null; registrationStatus: string }>;
  teams: Array<{ id: string; teamNumber: number; compositionState: string }>;
  formation: SpogomiTeamFormation;
}) {
  return createHash("sha256").update(JSON.stringify({
    eventId: input.event.id,
    revision: input.event.composition_revision ?? 0,
    mode: input.event.mode,
    teamSizeConfig: input.event.team_size_config,
    participants: input.participants.map(({ id, sourceOrder, groupPreference, teamId, registrationStatus }) => ({ id, sourceOrder, groupPreference, teamId, registrationStatus })),
    teams: input.teams.map(({ id, teamNumber, compositionState }) => ({ id, teamNumber, compositionState })),
    formation: input.formation,
  })).digest("hex");
}

export async function previewSpogomiTeams(supabase: SupabaseClient, event: EventRow): Promise<SpogomiTeamCompositionPreview> {
  if (event.state === "composition_locked") throw new Error("Validation: la composition est déjà verrouillée.");
  const participants = await supabase.from("spogomi_participants")
    .select("id, group_preference, source_row_number, team_id, registration_status")
    .eq("event_id", event.id)
    .eq("registration_status", "registered")
    .order("source_row_number", { ascending: true });
  if (participants.error) throw participants.error;
  const existingTeams = await supabase.from("spogomi_teams").select("id, team_number, composition_state").eq("event_id", event.id).order("team_number", { ascending: true });
  if (existingTeams.error) throw existingTeams.error;
  if ((existingTeams.data ?? []).some((team) => team.composition_state === "locked" || team.composition_state === "verified")) {
    throw new Error("Validation: une équipe possède déjà une composition verrouillée ou vérifiée.");
  }
  const participantRows = (participants.data ?? []).map((row) => ({
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
}) {
  const preview = await previewSpogomiTeams(params.supabase, params.event);
  if (preview.expectedRevision !== params.expectedRevision || preview.proposalFingerprint !== params.proposalFingerprint) {
    throw conflict("la composition a changé depuis l'aperçu ; rechargez la proposition avant confirmation.");
  }
  const assignments = [
    ...preview.formation.teams.flatMap((team) => team.participantIds.map((participantId) => ({ participantId, teamNumber: team.teamNumber }))),
    ...preview.formation.unassignedParticipantIds.map((participantId) => ({ participantId, teamNumber: null })),
  ];
  const result = await params.supabase.rpc("spogomi_confirm_team_composition", {
    p_event_id: params.event.id,
    p_expected_revision: params.expectedRevision,
    p_assignments: assignments,
    p_actor_clerk_id: params.actorClerkId,
  });
  if (result.error) throw result.error;
  return { ...preview, confirmed: true, confirmation: result.data };
}

export async function autoComposeTeams(
  supabase: SupabaseClient,
  event: EventRow,
  confirmation?: { expectedRevision: number; proposalFingerprint: string; actorClerkId: string },
) {
  if (!confirmation) return previewSpogomiTeams(supabase, event);
  return confirmSpogomiTeams({ supabase, event, ...confirmation });
}

export async function lockSpogomiTeams(supabase: SupabaseClient, event: EventRow) {
  const teams = await supabase.from("spogomi_teams").select("id, team_number, composition_state").eq("event_id", event.id).order("team_number");
  if (teams.error) throw teams.error;
  const participants = await supabase.from("spogomi_participants").select("id, team_id").eq("event_id", event.id).eq("registration_status", "registered");
  if (participants.error) throw participants.error;
  const counts = new Map<string, number>();
  for (const participant of participants.data ?? []) if (participant.team_id) counts.set(participant.team_id, (counts.get(participant.team_id) ?? 0) + 1);
  for (const team of teams.data ?? []) {
    const validation = validateTeamComposition(event.mode, counts.get(team.id) ?? 0, { casual: { minMembers: event.team_size_config?.casual?.minMembers ?? null, maxMembers: event.team_size_config?.casual?.maxMembers ?? null } });
    if (!validation.ok) throw new Error(`Validation: équipe ${team.team_number} non conforme (${validation.reason}).`);
  }
  if ((participants.data ?? []).some((participant) => !participant.team_id)) throw new Error("Validation: des participants restent à affecter.");
  const updated = await supabase.from("spogomi_teams").update({ composition_state: "locked" }).eq("event_id", event.id);
  if (updated.error) throw updated.error;
  const eventUpdated = await supabase.from("spogomi_events").update({ state: "composition_locked" }).eq("id", event.id);
  if (eventUpdated.error) throw eventUpdated.error;
  return { locked: true, teamCount: teams.data?.length ?? 0 };
}

export async function moveParticipantToTeam(params: { supabase: SupabaseClient; event: EventRow; participantId: string; teamId: string | null }) {
  if (params.event.state === "composition_locked") throw new Error("Validation: la composition est verrouillée.");
  if (params.teamId) {
    const team = await params.supabase.from("spogomi_teams").select("id").eq("id", params.teamId).eq("event_id", params.event.id).maybeSingle();
    if (team.error) throw team.error;
    if (!team.data) throw new Error("Validation: équipe introuvable pour cet événement.");
  }
  const updated = await params.supabase.from("spogomi_participants").update({ team_id: params.teamId }).eq("id", params.participantId).eq("event_id", params.event.id);
  if (updated.error) throw updated.error;
  return { participantId: params.participantId, teamId: params.teamId };
}

export async function attachOfficialGpx(params: { supabase: SupabaseClient; event: EventRow; userId: string; file: File }) {
  if (params.event.state === "composition_locked") throw new Error("Validation: le parcours ne peut plus être modifié après verrouillage.");
  const parsed = await parseGpxFile(params.file);
  if (parsed.drawing.kind !== "polyline") throw new Error("Validation: le GPX doit fournir une polyligne.");
  const route = {
    source: "official_reference" as const,
    fileName: parsed.metadata.fileName ?? params.file.name,
    pointCount: parsed.metadata.pointCount,
    referenceDistanceKm: parsed.metadata.observedDistanceKm,
    inferredTopology: parsed.metadata.inferredTopology,
    coordinates: parsed.drawing.coordinates,
  };
  const upserted = await params.supabase.from("spogomi_event_routes").upsert({
    event_id: params.event.id,
    action_id: params.event.action_id,
    source: route.source,
    file_name: route.fileName,
    point_count: route.pointCount,
    reference_distance_km: route.referenceDistanceKm,
    inferred_topology: route.inferredTopology,
    geometry_geojson: { type: "LineString", coordinates: route.coordinates },
    imported_by_clerk_id: params.userId,
  }, { onConflict: "event_id" });
  if (upserted.error) throw upserted.error;
  const action = await params.supabase.from("actions").select("preparation_data").eq("id", params.event.action_id).single();
  if (action.error) throw action.error;
  const preparationData = (action.data?.preparation_data ?? {}) as Record<string, unknown>;
  const updatedAction = await params.supabase.from("actions").update({ preparation_data: {
    ...preparationData,
    spogomiOfficialReference: {
      source: "official_reference",
      fileName: route.fileName,
      pointCount: route.pointCount,
      referenceDistanceKm: route.referenceDistanceKm,
      note: "Parcours officiel de référence, non observé sur le terrain.",
    },
  } }).eq("id", params.event.action_id);
  if (updatedAction.error) throw updatedAction.error;
  return route;
}

export function hashRosterPreview(preview: SpogomiRosterPreview): string {
  return createHash("sha256").update(JSON.stringify({ contentHash: preview.contentHash, mapping: preview.mapping, rows: preview.rows })).digest("hex");
}
