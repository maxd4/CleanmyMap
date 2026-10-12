import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiResultsProjection } from "./results-projection-service";
import { readAllSpogomiPages } from "./pagination";
import type { SpogomiRecognitionKind } from "./recognition";
import {
  aggregateSpogomiPartnerImpact,
  buildSpogomiPublicOrganizer,
  type SpogomiPartnerImpact,
  type SpogomiPartnerEventInput,
  type SpogomiPublicOrganizer,
} from "./partner-impact";

type ActionRow = {
  id: string;
  organizer_id: string | null;
  organizer_name: string | null;
  status: string | null;
  published_at: string | null;
  moderation_visibility: string | null;
};

type PublishedEventRow = {
  id: string;
  event_slug: string | null;
  name: string;
  location_label: string;
  mode: "casual" | "world_cup";
  state: string;
  starts_at: string;
  action_id: string;
};

function isPublishedAction(action: ActionRow): boolean {
  return action.status === "approved" && Boolean(action.published_at) && action.moderation_visibility !== "hidden";
}

async function loadAcceptedPartnerEntries() {
  try {
    return await listPublishedPartnerAnnuaireEntries();
  } catch {
    return [];
  }
}

export async function loadSpogomiOrganizerForAction(params: {
  supabase: SupabaseClient;
  actionId: string;
  eventTerritory: string;
}): Promise<SpogomiPublicOrganizer | null> {
  const actionResult = await params.supabase
    .from("actions")
    .select("id, organizer_id, organizer_name, status, published_at, moderation_visibility")
    .eq("id", params.actionId)
    .maybeSingle();
  if (actionResult.error) throw actionResult.error;
  const action = actionResult.data as ActionRow | null;
  if (!action?.organizer_id || !action.organizer_name) return null;
  const partnerEntries = await loadAcceptedPartnerEntries();
  const partnerEntry = partnerEntries.find(
    (entry) =>
      entry.publicationStatus === "accepted" &&
      entry.verificationStatus === "verifie" &&
      entry.organizerDirectoryId === action.organizer_id,
  );
  return buildSpogomiPublicOrganizer({
    organizerId: action.organizer_id,
    organizerName: action.organizer_name,
    eventTerritory: params.eventTerritory,
    partnerEntry: partnerEntry ? { id: partnerEntry.id, websiteUrl: partnerEntry.websiteUrl } : null,
  });
}

async function loadParticipantIdentityFacts(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<Map<string, { ids: string[]; reliable: boolean }>> {
  if (!eventIds.length) return new Map();
  const rows = await readAllSpogomiPages("partner SPOGOMI participant identities", (from, to) =>
    supabase
      .from("spogomi_participants")
      .select("event_id, clerk_id, account_link_status, registration_status, attendance_status", { count: "exact" })
      .in("event_id", eventIds)
      .order("event_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows as Array<Record<string, unknown>>) {
    const eventId = String(row.event_id);
    grouped.set(eventId, [...(grouped.get(eventId) ?? []), row]);
  }
  return new Map(eventIds.map((eventId) => {
    const present = (grouped.get(eventId) ?? []).filter(
      (row) => row.registration_status === "registered" && row.attendance_status === "present",
    );
    const ids = present
      .filter((row) => row.account_link_status === "verified" && typeof row.clerk_id === "string" && row.clerk_id.trim())
      .map((row) => String(row.clerk_id));
    return [eventId, { ids, reliable: present.length > 0 && ids.length === present.length }];
  }));
}

async function loadCertifiedMissions(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<Map<string, Array<{ id: string; kind: SpogomiRecognitionKind }>>> {
  if (!eventIds.length) return new Map();
  const rows = await readAllSpogomiPages("partner SPOGOMI certified missions", (from, to) =>
    supabase
      .from("spogomi_recognition_attestations")
      .select("id, event_id, kind, status, evidence_reference", { count: "exact" })
      .in("event_id", eventIds)
      .eq("status", "certified")
      .order("event_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
  const grouped = new Map<string, Array<{ id: string; kind: SpogomiRecognitionKind }>>();
  for (const row of rows as Array<Record<string, unknown>>) {
    if (typeof row.evidence_reference !== "string" || !row.evidence_reference.trim()) continue;
    const eventId = String(row.event_id);
    const mission = { id: String(row.id), kind: String(row.kind) as SpogomiRecognitionKind };
    grouped.set(eventId, [...(grouped.get(eventId) ?? []), mission]);
  }
  return grouped;
}

export async function loadSpogomiPartnerImpact(params: {
  organizerId: string;
  supabase?: SupabaseClient;
}): Promise<SpogomiPartnerImpact> {
  const supabase = params.supabase ?? getSupabaseServerClient(true);
  const events = await readAllSpogomiPages("partner SPOGOMI published events", (from, to) =>
    supabase
      .from("spogomi_events")
      .select("id, event_slug, name, location_label, mode, state, starts_at, action_id", { count: "exact" })
      .eq("public_visibility", "published")
      .neq("state", "cancelled")
      .order("starts_at", { ascending: false })
      .range(from, to),
    { requireExactCount: true },
  ) as unknown as PublishedEventRow[];
  if (!events.length) return aggregateSpogomiPartnerImpact([]);

  const actionIds = events.map((event) => event.action_id);
  const actionRows = await readAllSpogomiPages("partner SPOGOMI published actions", (from, to) =>
    supabase
      .from("actions")
      .select("id, organizer_id, organizer_name, status, published_at, moderation_visibility", { count: "exact" })
      .in("id", actionIds)
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
  const actionById = new Map((actionRows as unknown as ActionRow[]).map((action) => [String(action.id), action]));
  const ownedEvents = events.filter((event) => {
    const action = actionById.get(event.action_id);
    return Boolean(action && action.organizer_id === params.organizerId && isPublishedAction(action));
  });
  const eventIds = ownedEvents.map((event) => event.id);
  const [participantFacts, missions, partnerEntries] = await Promise.all([
    loadParticipantIdentityFacts(supabase, eventIds),
    loadCertifiedMissions(supabase, eventIds),
    loadAcceptedPartnerEntries(),
  ]);

  const input: SpogomiPartnerEventInput[] = [];
  for (const event of ownedEvents) {
    const action = actionById.get(event.action_id);
    if (!action) continue;
    const projection = await loadSpogomiResultsProjection({ supabase, eventId: event.id, publicOnly: true });
    const environmental = projection?.results.environmental ?? {
      status: "unavailable" as const,
      totalWasteMassGrams: null,
      cigaretteButtsMassGrams: null,
      cigaretteButtsCount: null,
      participantsPresent: null,
      projectionVersion: null,
      sourceHash: null,
    };
    const partnerEntry = partnerEntries.find(
      (entry) =>
        entry.publicationStatus === "accepted" &&
        entry.verificationStatus === "verifie" &&
        entry.organizerDirectoryId === action.organizer_id,
    );
    const organizer = buildSpogomiPublicOrganizer({
      organizerId: action.organizer_id,
      organizerName: action.organizer_name,
      eventTerritory: event.location_label,
      partnerEntry: partnerEntry ? { id: partnerEntry.id, websiteUrl: partnerEntry.websiteUrl } : null,
    });
    const identityFacts = participantFacts.get(event.id) ?? { ids: [], reliable: false };
    input.push({
      eventId: event.id,
      eventSlug: event.event_slug,
      name: event.name,
      locationLabel: event.location_label,
      mode: event.mode,
      state: event.state,
      startsAt: event.starts_at,
      actionId: event.action_id,
      organizer,
      environmental,
      verifiedParticipantIds: identityFacts.ids,
      participantIdentitiesReliable: identityFacts.reliable,
      certifiedMissions: missions.get(event.id) ?? [],
    });
  }
  return aggregateSpogomiPartnerImpact(input);
}

export async function listPublishedSpogomiPartnerImpacts(params: {
  supabase?: SupabaseClient;
} = {}): Promise<SpogomiPartnerImpact[]> {
  const supabase = params.supabase ?? getSupabaseServerClient(true);
  const eventRows = await readAllSpogomiPages("partner SPOGOMI organizer event ids", (from, to) =>
    supabase
      .from("spogomi_events")
      .select("action_id", { count: "exact" })
      .eq("public_visibility", "published")
      .neq("state", "cancelled")
      .order("action_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
  const actionIds = [...new Set((eventRows as unknown as Array<{ action_id: string }>).map((row) => String(row.action_id)))];
  if (!actionIds.length) return [];
  const actionRows = await readAllSpogomiPages("partner SPOGOMI organizer actions", (from, to) =>
    supabase
      .from("actions")
      .select("id, organizer_id, organizer_name, status, published_at, moderation_visibility", { count: "exact" })
      .in("id", actionIds)
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
  const organizerIds = [...new Set(
    (actionRows as unknown as ActionRow[])
      .filter(isPublishedAction)
      .map((action) => action.organizer_id)
      .filter((id): id is string => Boolean(id)),
  )];
  const impacts = await Promise.all(organizerIds.map((organizerId) => loadSpogomiPartnerImpact({ supabase, organizerId })));
  return impacts.filter((impact) => impact.events.some((event) => event.organizer !== null));
}
