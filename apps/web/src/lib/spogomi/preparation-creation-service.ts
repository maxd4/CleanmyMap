import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAction } from "@/lib/actions/store-create";
import { createActionInterventionMode } from "@/lib/actions/intervention-mode";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, type ActionPermissionIdentity } from "@/lib/actions/permissions";
import type { SpogomiEventMode } from "./types";
import { normalizeSpogomiEventSlug } from "./public-service";

const CREATION_LEASE_MS = 2 * 60 * 1000;
const EVENT_SELECT = "id, action_id, created_by_clerk_id, idempotency_key, name, location_label, mode, state, starts_at, ends_at, team_size_config, creation_state, event_slug, public_visibility, public_results_visibility, composition_revision";

type CreationInput = {
  idempotencyKey: string;
  name: string;
  locationLabel: string;
  mode: SpogomiEventMode;
  startsAt: string;
  endsAt?: string | null;
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

type CreationAction = Record<string, unknown> & {
  id: string;
  created_by_clerk_id: string;
  action_date: string | null;
  location_label: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  preparation_data: Record<string, unknown> | null;
};

function actionIdentity(identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>): ActionPermissionIdentity {
  return { userId: identity?.userId ?? "", role: identity?.role ?? null, activeRole: identity?.activeRole ?? null };
}

function conflict(message: string): Error {
  return new Error(`Conflict: ${message}`);
}

function parseCreationDate(value: string, label: "début" | "fin"): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.valueOf())) {
    throw new Error(`Validation: date de ${label} d'événement invalide.`);
  }
  return parsed;
}

function canonicalCreationInput(input: CreationInput) {
  const startsAt = parseCreationDate(input.startsAt, "début");
  const endsAt = input.endsAt ? parseCreationDate(input.endsAt, "fin") : null;
  if (endsAt && endsAt < startsAt) throw new Error("Validation: la fin doit être postérieure au début.");
  return {
    name: input.name.trim(),
    locationLabel: input.locationLabel.trim(),
    mode: input.mode,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() ?? null,
  };
}

function creationFingerprint(input: CreationInput): string {
  return createHash("sha256").update(JSON.stringify(canonicalCreationInput(input))).digest("hex");
}

function legacyCreationFingerprint(input: CreationInput, casualTeamSize: number | null): string {
  return createHash("sha256").update(JSON.stringify({
    ...canonicalCreationInput(input),
    casualTeamSize,
  })).digest("hex");
}

function eventCasualTeamSize(event: Record<string, unknown>): number | null {
  const teamSizeConfig = event.team_size_config as { casual?: { maxMembers?: number | null } } | null;
  return teamSizeConfig?.casual?.maxMembers ?? null;
}

function eventMatchesInput(event: Record<string, unknown>, input: CreationInput): boolean {
  const canonical = canonicalCreationInput(input);
  return event.name === canonical.name &&
    event.location_label === canonical.locationLabel &&
    event.mode === canonical.mode &&
    new Date(String(event.starts_at)).toISOString() === canonical.startsAt &&
    (event.ends_at ? new Date(String(event.ends_at)).toISOString() : null) === canonical.endsAt;
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

async function loadActionForCreation(supabase: SupabaseClient, actionId: string): Promise<CreationAction | null> {
  const result = await supabase
    .from("actions")
    .select("id, created_by_clerk_id, action_date, location_label, event_start_time, event_end_time, preparation_data")
    .eq("id", actionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as CreationAction | null;
}

function storedDateMatches(value: string | null, expected: string): boolean {
  if (!value) return false;
  if (value === expected) return true;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf()) && parsed.toISOString() === expected) return true;
  return value.slice(0, 5) === expected.slice(11, 16);
}

function actionMatchesCreationInput(action: CreationAction, input: CreationInput): boolean {
  const canonical = canonicalCreationInput(input);
  return action.location_label === canonical.locationLabel &&
    action.action_date === canonical.startsAt.slice(0, 10) &&
    storedDateMatches(action.event_start_time, canonical.startsAt) &&
    (canonical.endsAt === null ? !action.event_end_time : storedDateMatches(action.event_end_time, canonical.endsAt));
}

async function assertActionOwnership(
  supabase: SupabaseClient,
  actionId: string,
  userId: string,
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>,
  expectedKey: string,
  expectedFingerprint: string,
  compatibleFingerprints: readonly string[] = [],
) {
  const action = await supabase.from("actions").select("id, created_by_clerk_id, preparation_data").eq("id", actionId).maybeSingle();
  if (action.error) throw action.error;
  if (!action.data || action.data.created_by_clerk_id !== userId) throw conflict("la tentative de création n'appartient pas à cet organisateur.");
  const preparationData = (action.data.preparation_data ?? {}) as Record<string, unknown>;
  if (preparationData.spogomiCreationKey && preparationData.spogomiCreationKey !== expectedKey) {
    throw conflict("la relation action-événement est incohérente.");
  }
  if (preparationData.spogomiCreationFingerprint &&
      preparationData.spogomiCreationFingerprint !== expectedFingerprint &&
      !compatibleFingerprints.includes(String(preparationData.spogomiCreationFingerprint))) {
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
  compatibleFingerprints: readonly string[] = [],
) {
  if (event.created_by_clerk_id !== userId || event.idempotency_key !== input.idempotencyKey || event.action_id !== actionId || !eventMatchesInput(event, input)) {
    throw conflict("la clé d'idempotence a reçu des paramètres ou des relations différents.");
  }
  const legacyFingerprint = legacyCreationFingerprint(input, eventCasualTeamSize(event));
  await assertActionOwnership(
    supabase,
    actionId,
    userId,
    identity,
    input.idempotencyKey,
    fingerprint,
    [...compatibleFingerprints, legacyFingerprint],
  );
}

async function ensureAttemptFingerprint(
  supabase: SupabaseClient,
  attempt: CreationAttempt,
  input: CreationInput,
  fingerprint: string,
): Promise<string | null> {
  if (attempt.intention_fingerprint) {
    if (attempt.intention_fingerprint === fingerprint) return null;
    const event = attempt.event_id
      ? await loadEventById(supabase, attempt.event_id)
      : await loadEventByKey(supabase, input.idempotencyKey);
    const legacyFingerprint = event ? legacyCreationFingerprint(input, eventCasualTeamSize(event)) : null;
    if (!event || !eventMatchesInput(event, input) || legacyFingerprint !== attempt.intention_fingerprint) {
      throw conflict("la clé d'idempotence a reçu des paramètres différents.");
    }
    const fingerprinted = await supabase
      .from("spogomi_event_creation_attempts")
      .update({ intention_fingerprint: fingerprint })
      .eq("id", attempt.id)
      .eq("intention_fingerprint", attempt.intention_fingerprint);
    if (fingerprinted.error) throw fingerprinted.error;
    return legacyFingerprint;
  }
  if (!attempt.event_id && attempt.action_id) {
    const action = await loadActionForCreation(supabase, attempt.action_id);
    const preparationData = action?.preparation_data ?? {};
    if (
      action?.created_by_clerk_id === attempt.created_by_clerk_id &&
      preparationData.spogomiCreationKey === input.idempotencyKey &&
      actionMatchesCreationInput(action, input)
    ) {
      return null;
    }
  }
  if (!attempt.event_id) throw conflict("une ancienne tentative sans empreinte doit être reprise avec une nouvelle clé.");
  const event = await loadEventById(supabase, attempt.event_id);
  if (!event || !eventMatchesInput(event, input)) throw conflict("la clé d'idempotence ne peut pas être vérifiée.");
  const fingerprinted = await supabase.from("spogomi_event_creation_attempts").update({ intention_fingerprint: fingerprint }).eq("id", attempt.id).is("intention_fingerprint", null);
  if (fingerprinted.error) throw fingerprinted.error;
  return null;
}

async function reclaimCreationAttempt(
  supabase: SupabaseClient,
  attempt: CreationAttempt,
  input: CreationInput,
  userId: string,
  fingerprint: string,
  token: string,
): Promise<{ attempt: CreationAttempt; token: string; legacyFingerprint?: string }> {
  if (attempt.created_by_clerk_id !== userId) throw conflict("la clé d'idempotence est déjà utilisée.");
  const legacyFingerprint = await ensureAttemptFingerprint(supabase, attempt, input, fingerprint);
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
  return { attempt: reclaimed.data as CreationAttempt, token, ...(legacyFingerprint ? { legacyFingerprint } : {}) };
}

async function claimCreationAttempt(
  supabase: SupabaseClient,
  input: CreationInput,
  userId: string,
  fingerprint: string,
): Promise<{ attempt: CreationAttempt; token: string; legacyFingerprint?: string }> {
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
  return reclaimCreationAttempt(supabase, existing.data as CreationAttempt, input, userId, fingerprint, token);
}

async function updateCreationAttempt(supabase: SupabaseClient, attemptId: string, token: string, values: Record<string, unknown>) {
  const result = await supabase.from("spogomi_event_creation_attempts").update(values).eq("id", attemptId).eq("processing_token", token).select("*").maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw conflict("la réservation de création a changé pendant l'opération.");
  return result.data as CreationAttempt;
}

async function findCorrelatedActionId(supabase: SupabaseClient, idempotencyKey: string): Promise<string | null> {
  const correlated = await supabase
    .from("actions")
    .select("id, created_by_clerk_id, preparation_data")
    .contains("preparation_data", { spogomiCreationKey: idempotencyKey })
    .maybeSingle();
  if (correlated.error) throw correlated.error;
  return correlated.data?.id ? String(correlated.data.id) : null;
}

async function createSpogomiAction(params: {
  supabase: SupabaseClient;
  input: CreationInput;
  userId: string;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  fingerprint: string;
  canonical: ReturnType<typeof canonicalCreationInput>;
}): Promise<string> {
  const { supabase, input, userId, identity, fingerprint, canonical } = params;
  const displayName = identity?.displayName ?? userId;
  const created = await createAction(supabase, {
    userId,
    payload: {
      actorName: displayName,
      actionDate: canonical.startsAt.slice(0, 10),
      locationLabel: canonical.locationLabel,
      actionPhase: "pre_action",
      preparationData: { interventionMode: createActionInterventionMode("fixed_area"), spogomiCreationKey: input.idempotencyKey, spogomiCreationFingerprint: fingerprint },
      wasteKg: null, cigaretteButts: null, volunteersCount: 0, durationMinutes: 0,
      eventStartTime: canonical.startsAt, eventEndTime: canonical.endsAt, organizerType: null, organizerName: null,
    },
    organizers: [{ userId, displayName, handle: identity?.handle ?? null, isPrimary: true, sourceToken: null }],
    organizerRequirement: "required",
    status: "pending",
  });
  return created.id;
}

async function ensureActionForAttempt(params: {
  supabase: SupabaseClient;
  input: CreationInput;
  userId: string;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  attempt: CreationAttempt;
  token: string;
  fingerprint: string;
  canonical: ReturnType<typeof canonicalCreationInput>;
  legacyFingerprint?: string;
}): Promise<string> {
  const { supabase, input, userId, identity, attempt, token, fingerprint, canonical, legacyFingerprint } = params;
  const actionId = attempt.action_id
    ? String(attempt.action_id)
    : await findCorrelatedActionId(supabase, input.idempotencyKey)
      ?? await createSpogomiAction({ supabase, input, userId, identity, fingerprint, canonical });
  await assertActionOwnership(supabase, actionId, userId, identity, input.idempotencyKey, fingerprint, legacyFingerprint ? [legacyFingerprint] : []);
  if (!attempt.action_id) await updateCreationAttempt(supabase, attempt.id, token, { action_id: actionId, state: "event_pending" });
  return actionId;
}

async function ensureEventForAction(params: {
  supabase: SupabaseClient;
  input: CreationInput;
  userId: string;
  actionId: string;
  attempt: CreationAttempt;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  fingerprint: string;
  canonical: ReturnType<typeof canonicalCreationInput>;
  legacyFingerprint?: string;
}): Promise<CreationEvent> {
  const { supabase, input, userId, actionId, attempt, identity, fingerprint, canonical, legacyFingerprint } = params;
  let event = attempt.event_id ? await loadEventById(supabase, String(attempt.event_id)) : await loadEventByKey(supabase, input.idempotencyKey);
  if (event) await assertEventIntegrity(supabase, event, input, userId, actionId, fingerprint, identity, legacyFingerprint ? [legacyFingerprint] : []);
  if (event) return event;

  const baseSlug = normalizeSpogomiEventSlug(canonical.name);
  const eventPayload = {
    action_id: actionId, created_by_clerk_id: userId, idempotency_key: input.idempotencyKey,
    name: canonical.name, location_label: canonical.locationLabel, mode: canonical.mode,
    starts_at: canonical.startsAt, ends_at: canonical.endsAt,
    regulation_version: "pending-official-regulation", regulation_status: "incomplete", creation_state: "event_pending",
    event_slug: baseSlug, public_visibility: "private" as const,
  };
  let inserted = await supabase.from("spogomi_events").insert(eventPayload).select(EVENT_SELECT).maybeSingle();
  if (inserted.error?.code === "23505") {
    event = await loadEventByKey(supabase, input.idempotencyKey);
    if (!event) {
      inserted = await supabase.from("spogomi_events").insert({ ...eventPayload, event_slug: `${baseSlug}-${actionId.slice(0, 8)}` }).select(EVENT_SELECT).maybeSingle();
    }
  }
  if (!event && !inserted.error && inserted.data) event = inserted.data as CreationEvent;
  if (!event) throw new Error("Conflict: événement non finalisé, reprise possible avec la même clé.");
  return event;
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
  if (existing.data?.event_id && existing.data.state === "ready") {
    const event = await loadEventById(supabase, String(existing.data.event_id));
    if (!event) throw conflict("l'événement lié à la tentative est introuvable.");
    const legacyFingerprint = await ensureAttemptFingerprint(supabase, existing.data as CreationAttempt, input, fingerprint);
    await assertEventIntegrity(supabase, event, input, userId, event.action_id, fingerprint, identity, legacyFingerprint ? [legacyFingerprint] : []);
    return { eventId: event.id, actionId: event.action_id };
  }

  const { attempt, token, legacyFingerprint } = await claimCreationAttempt(supabase, input, userId, fingerprint);
  try {
    const actionId = await ensureActionForAttempt({ supabase, input, userId, identity, attempt, token, fingerprint, canonical, legacyFingerprint });
    const event = await ensureEventForAction({ supabase, input, userId, actionId, attempt, identity, fingerprint, canonical, legacyFingerprint });
    await assertEventIntegrity(supabase, event, input, userId, actionId, fingerprint, identity, legacyFingerprint ? [legacyFingerprint] : []);
    const eventReady = await supabase.from("spogomi_events").update({ creation_state: "ready" }).eq("id", event.id).eq("action_id", actionId);
    if (eventReady.error) throw eventReady.error;
    await updateCreationAttempt(supabase, attempt.id, token, { event_id: event.id, action_id: actionId, state: "ready", last_error_code: null, processing_token: null, processing_started_at: null });
    return { eventId: event.id, actionId };
  } catch (error) {
    await supabase.from("spogomi_event_creation_attempts").update({ state: "failed_recoverable", last_error_code: error instanceof Error ? error.name : "creation_failed", processing_token: null, processing_started_at: null }).eq("id", attempt.id).eq("processing_token", token);
    throw error;
  }
}
