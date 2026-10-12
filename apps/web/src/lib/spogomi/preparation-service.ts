import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAction } from "@/lib/actions/store-create";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import { parseGpxFile } from "@/lib/actions/geometry/gpx";
import { validateTeamComposition } from "./validation";
import { buildDeterministicTeamFormation } from "./preparation";
import type { SpogomiEventMode, SpogomiRosterPreview } from "./types";
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
  const result = await supabase.from("spogomi_events").select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility").eq("id", eventId).maybeSingle();
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
    .select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility")
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
    })
    .eq("id", event.id)
    .select("id, action_id, created_by_clerk_id, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility")
    .single();
  if (result.error) throw result.error;
  return result.data as EventRow;
}

export async function createSpogomiEvent(params: {
  supabase: SupabaseClient;
  userId: string;
  input: { idempotencyKey: string; name: string; locationLabel: string; mode: SpogomiEventMode; startsAt: string; endsAt?: string | null; casualTeamSize?: number | null };
}) {
  const { supabase, userId, input } = params;
  const attempt = await supabase.from("spogomi_event_creation_attempts").select("*").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (attempt.error) throw attempt.error;
  if (attempt.data?.event_id) return { eventId: String(attempt.data.event_id), actionId: String(attempt.data.action_id) };
  if (!/^[a-zA-Z0-9:_-]{8,128}$/.test(input.idempotencyKey)) throw new Error("Validation: clé d'idempotence invalide.");
  if (!input.name.trim() || !input.locationLabel.trim()) throw new Error("Validation: nom et lieu obligatoires.");
  const identity = await getCurrentUserIdentity();
  if (!identity || identity.userId !== userId) throw new Error("Unauthorized");
  let actionId = attempt.data?.action_id ? String(attempt.data.action_id) : null;
  if (!actionId) {
    const created = await createAction(supabase, {
      userId,
      payload: {
        actorName: identity.displayName,
        actionDate: input.startsAt.slice(0, 10),
        locationLabel: input.locationLabel.trim(),
        actionPhase: "pre_action",
        preparationData: { interventionMode: createActionInterventionMode("fixed_area") },
        wasteKg: null,
        cigaretteButts: null,
        volunteersCount: 0,
        durationMinutes: 0,
        eventStartTime: input.startsAt,
        eventEndTime: input.endsAt ?? null,
        organizerType: null,
        organizerName: null,
      },
      organizers: [{ userId, displayName: identity.displayName, handle: identity.handle, isPrimary: true, sourceToken: null }],
      organizerRequirement: "required",
      status: "pending",
    });
    actionId = created.id;
    const createdAttempt = await supabase.from("spogomi_event_creation_attempts").upsert({
      idempotency_key: input.idempotencyKey,
      created_by_clerk_id: userId,
      action_id: actionId,
      state: "event_pending",
    }, { onConflict: "idempotency_key" });
    if (createdAttempt.error) throw createdAttempt.error;
  }
  const baseSlug = normalizeSpogomiEventSlug(input.name);
  const eventPayload = {
    action_id: actionId,
    created_by_clerk_id: userId,
    idempotency_key: input.idempotencyKey,
    name: input.name.trim(),
    location_label: input.locationLabel.trim(),
    mode: input.mode,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    team_size_config: { casual: { minMembers: input.casualTeamSize ?? null, maxMembers: input.casualTeamSize ?? null } },
    regulation_version: "pending-official-regulation",
    regulation_status: "incomplete",
    creation_state: "ready",
    event_slug: baseSlug,
    public_visibility: "private" as const,
  };
  let event = await supabase.from("spogomi_events").insert(eventPayload).select("id").single();
  if (event.error?.code === "23505") {
    event = await supabase.from("spogomi_events").insert({
      ...eventPayload,
      event_slug: `${baseSlug}-${actionId.slice(0, 8)}`,
    }).select("id").single();
  }
  if (event.error) {
    const raced = await supabase.from("spogomi_events").select("id").eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (!raced.error && raced.data) {
      await supabase.from("spogomi_event_creation_attempts").update({ event_id: raced.data.id, state: "ready", last_error_code: null }).eq("idempotency_key", input.idempotencyKey);
      return { eventId: raced.data.id, actionId };
    }
    await supabase.from("spogomi_event_creation_attempts").update({ state: "failed_recoverable", last_error_code: event.error.code ?? "event_insert_failed" }).eq("idempotency_key", input.idempotencyKey);
    throw new Error("Événement non finalisé : reprise possible avec la même clé d'idempotence.");
  }
  await supabase.from("spogomi_event_creation_attempts").update({ event_id: event.data.id, state: "ready", last_error_code: null }).eq("idempotency_key", input.idempotencyKey);
  return { eventId: event.data.id, actionId };
}

export async function confirmRosterImport(params: {
  supabase: SupabaseClient;
  event: EventRow;
  userId: string;
  preview: SpogomiRosterPreview;
}) {
  const { supabase, event, userId, preview } = params;
  if (preview.errors.length) throw new Error("Validation: corrigez les lignes invalides avant confirmation.");
  const existing = await supabase.from("spogomi_roster_imports").select("id, source_row_count").eq("event_id", event.id).eq("content_sha256", preview.contentHash).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { importId: existing.data.id, importedRows: existing.data.source_row_count, alreadyImported: true };
  const imported = await supabase.from("spogomi_roster_imports").insert({
    event_id: event.id,
    content_sha256: preview.contentHash,
    import_key: preview.importKey,
    file_name: preview.fileName,
    format: preview.format,
    column_mapping: preview.mapping,
    source_row_count: preview.rows.length,
    imported_by_clerk_id: userId,
    status: "confirmed",
  }).select("id").single();
  if (imported.error) throw imported.error;
  const participantRows = preview.rows.map((row) => ({
    event_id: event.id,
    roster_import_id: imported.data.id,
    source_row_number: row.rowNumber,
    source_row_id: row.sourceRowId,
    source_fingerprint: row.sourceFingerprint,
    group_preference: row.groupPreference,
    external_reference: row.sourceRowId,
    display_name: row.name,
    registration_status: "registered",
    attendance_status: "unknown",
    account_link_status: "unlinked",
  }));
  const inserted = await supabase.from("spogomi_participants").insert(participantRows);
  if (inserted.error) {
    await supabase.from("spogomi_roster_imports").update({ status: "failed" }).eq("id", imported.data.id);
    throw inserted.error;
  }
  return { importId: imported.data.id, importedRows: participantRows.length, alreadyImported: false };
}

export async function autoComposeTeams(supabase: SupabaseClient, event: EventRow) {
  if (event.state === "composition_locked") throw new Error("Validation: la composition est déjà verrouillée.");
  const participants = await supabase.from("spogomi_participants").select("id, group_preference, source_row_number, team_id").eq("event_id", event.id).eq("registration_status", "registered").order("source_row_number", { ascending: true });
  if (participants.error) throw participants.error;
  const formation = buildDeterministicTeamFormation({
    mode: event.mode,
    casualTeamSize: event.team_size_config?.casual?.maxMembers ?? null,
    participants: (participants.data ?? []).map((row) => ({ id: row.id, sourceOrder: row.source_row_number ?? 0, groupPreference: row.group_preference })),
  });
  const existingTeams = await supabase.from("spogomi_teams").select("id, composition_state").eq("event_id", event.id);
  if (existingTeams.error) throw existingTeams.error;
  if ((existingTeams.data ?? []).some((team) => team.composition_state === "locked")) throw new Error("Validation: la composition est déjà verrouillée.");
  if (existingTeams.data?.length) {
    const detached = await supabase.from("spogomi_participants").update({ team_id: null }).eq("event_id", event.id);
    if (detached.error) throw detached.error;
    const removed = await supabase.from("spogomi_teams").delete().eq("event_id", event.id);
    if (removed.error) throw removed.error;
  }
  const createdTeams = formation.teams.length ? await supabase.from("spogomi_teams").insert(formation.teams.map((team) => ({ event_id: event.id, team_number: team.teamNumber, public_name: `Équipe ${team.teamNumber}`, composition_state: "draft" }))).select("id, team_number") : { data: [], error: null };
  if (createdTeams.error) throw createdTeams.error;
  const teamByNumber = new Map((createdTeams.data ?? []).map((team) => [team.team_number, team.id]));
  for (const team of formation.teams) {
    const teamId = teamByNumber.get(team.teamNumber);
    if (teamId) {
      const updated = await supabase.from("spogomi_participants").update({ team_id: teamId }).in("id", team.participantIds);
      if (updated.error) throw updated.error;
    }
  }
  const unassigned = formation.unassignedParticipantIds.length ? await supabase.from("spogomi_participants").update({ team_id: null }).in("id", formation.unassignedParticipantIds) : null;
  if (unassigned?.error) throw unassigned.error;
  return formation;
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
