import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SpogomiEventMode, SpogomiEventState } from "./types";
import { readAllSpogomiPages } from "./pagination";
import {
  classifySpogomiCalendarStatus,
  classifySpogomiRegistrationStatus,
  type SpogomiCalendarStatus,
  type SpogomiRegistrationStatus,
  type SpogomiResultsStatus,
} from "./lifecycle";
import { loadSpogomiResultsProjection } from "./results/results-projection-service";
import type { SpogomiPublicResults } from "./results/results-projection";
import { loadSpogomiOrganizerForAction, loadSpogomiPublicOrganizersForActions } from "./partner-impact-service";
import type { SpogomiPublicOrganizer } from "./partner-impact";
import { loadPublishedSpogomiGalleryForAction } from "./photo-gallery-service";
import type { SpogomiPublicGalleryPhoto } from "./photo-gallery";
import {
  buildSpogomiPublicPracticalInformation,
  type SpogomiPublicPracticalInformation,
} from "./public-practical-information";

export type SpogomiPublicLifecycle = SpogomiCalendarStatus;
export type SpogomiPublicDataProvenance = "published_event";

type SpogomiPublicTeam = {
  id: string;
  divisionId: string;
  divisionType: "casual" | "world_cup";
  teamNumber: number;
  publicName: string;
  compositionState: string;
};

type SpogomiPublicDivision = {
  id: string;
  type: "casual" | "world_cup";
  registrationStatus: SpogomiRegistrationStatus;
  registeredCount: number;
  capacity: number | null;
};

type SpogomiPublicRoute = {
  source: "official_reference";
  fileName: string;
  pointCount: number;
  referenceDistanceKm: number;
  inferredTopology: "loop" | "point_to_point";
  coordinates: [number, number][];
};

export type SpogomiPublicEvent = {
  id: string;
  slug: string;
  name: string;
  locationLabel: string;
  mode: SpogomiEventMode;
  state: SpogomiEventState;
  lifecycle: SpogomiPublicLifecycle;
  calendarStatus: SpogomiCalendarStatus;
  registrationStatus: SpogomiRegistrationStatus;
  resultsStatus: SpogomiResultsStatus;
  provenance: SpogomiPublicDataProvenance;
  startsAt: string;
  endsAt: string | null;
  officialTimezone: string;
  actionHref: string | null;
  divisions: SpogomiPublicDivision[];
  teams: SpogomiPublicTeam[];
  route: SpogomiPublicRoute | null;
  practicalInformation?: SpogomiPublicPracticalInformation | null;
  results: SpogomiPublicResults | null;
  organizer: SpogomiPublicOrganizer | null;
  gallery: SpogomiPublicGalleryPhoto[];
};

type PublicEventRow = {
  id: string;
  event_slug: string | null;
  name: string;
  location_label: string;
  mode: SpogomiEventMode;
  state: SpogomiEventState;
  starts_at: string;
  ends_at: string | null;
  official_timezone: string | null;
  action_id: string;
  regulation_config: unknown;
  public_visibility: "private" | "published";
  public_results_visibility: "hidden" | "provisional" | "certified";
};

async function loadPublicActionPreparation(
  supabase: SupabaseClient,
  actionId: string,
  publishableActionIds: Set<string>,
): Promise<unknown | null> {
  if (!publishableActionIds.has(actionId)) return null;
  const result = await supabase.from("actions").select("preparation_data").eq("id", actionId).maybeSingle();
  if (result.error) throw result.error;
  return result.data?.preparation_data ?? null;
}

type PublicDivisionRegistrationRow = {
  id: string;
  event_id?: string;
  division_type: "casual" | "world_cup";
  regulation_config: unknown;
};

type PublicParticipantRegistrationRow = {
  division_id: string | null;
  registration_status: string;
};

type PublicRegistrationProjection = {
  status: SpogomiRegistrationStatus;
  divisions: SpogomiPublicDivision[];
};

function buildPublicRegistrationProjection(
  row: PublicEventRow,
  divisions: PublicDivisionRegistrationRow[],
  participants: PublicParticipantRegistrationRow[],
): PublicRegistrationProjection {
  const eventPolicy = registrationPolicy(row.regulation_config);
  const projectedDivisions = divisions.map((division) => {
    const policy = { ...eventPolicy, ...registrationPolicy(division.regulation_config) };
    const registeredCount = participants.filter((participant) => String(participant.division_id) === String(division.id)).length;
    const capacity = capacityFromPolicy(policy);
    return {
      id: String(division.id),
      type: division.division_type,
      registrationStatus: classifySpogomiRegistrationStatus({ state: row.state, registeredCount, capacity }),
      registeredCount,
      capacity,
    } satisfies SpogomiPublicDivision;
  });
  if (projectedDivisions.length) return { status: combineRegistrationStatuses(projectedDivisions.map((division) => division.registrationStatus)), divisions: projectedDivisions };
  const registeredCount = participants.length;
  const capacity = capacityFromPolicy(eventPolicy);
  return {
    status: classifySpogomiRegistrationStatus({ state: row.state, registeredCount, capacity }),
    divisions: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function registrationPolicy(config: unknown): Record<string, unknown> {
  if (!isRecord(config) || !isRecord(config.registrationPolicy)) return {};
  return config.registrationPolicy;
}

function capacityFromPolicy(policy: Record<string, unknown>): number | null {
  const value = policy.capacity;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function combineRegistrationStatuses(statuses: readonly SpogomiRegistrationStatus[]): SpogomiRegistrationStatus {
  if (!statuses.length || statuses.every((status) => status === "not_open")) return "not_open";
  if (statuses.some((status) => status === "open")) return "open";
  if (statuses.every((status) => status === "capacity_reached")) return "capacity_reached";
  return "closed";
}

function normalizeSlugPart(value: string): string {
  const decomposed = value.normalize("NFKD").toLowerCase();
  let slug = "";
  let pendingSeparator = false;

  for (const character of decomposed) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0x0300 && codePoint <= 0x036f) continue;

    const isAsciiLetter = character >= "a" && character <= "z";
    const isAsciiDigit = character >= "0" && character <= "9";
    if (isAsciiLetter || isAsciiDigit) {
      if (pendingSeparator && slug.length > 0) slug += "-";
      slug += character;
      pendingSeparator = false;
    } else if (slug.length > 0) {
      pendingSeparator = true;
    }
  }

  let truncatedSlug = slug.slice(0, 72);
  while (truncatedSlug.endsWith("-")) {
    truncatedSlug = truncatedSlug.slice(0, -1);
  }
  return truncatedSlug;
}

const SPOGOMI_RESERVED_EVENT_SLUGS = new Set(["nouveau", "mes-evenements"]);

export function isReservedSpogomiEventSlug(slug: string): boolean {
  return SPOGOMI_RESERVED_EVENT_SLUGS.has(slug);
}

export function normalizeSpogomiEventSlug(name: string): string {
  return normalizeSlugPart(name) || "evenement-spogomi";
}

export function classifySpogomiPublicLifecycle(
  startsAt: string,
  endsAt: string | null,
  state: SpogomiEventState,
  now = new Date(),
): SpogomiPublicLifecycle {
  return classifySpogomiCalendarStatus({ startsAt, endsAt, state, now });
}

async function loadPublicRegistrationProjection(
  supabase: SupabaseClient,
  row: PublicEventRow,
  providedDivisions?: PublicDivisionRegistrationRow[],
): Promise<PublicRegistrationProjection> {
  const divisionsResult = providedDivisions
    ? { data: providedDivisions, error: null }
    : await supabase
      .from("spogomi_divisions")
      .select("id, division_type, regulation_config")
      .eq("event_id", row.id)
      .order("division_type", { ascending: true });
  if (divisionsResult.error) throw divisionsResult.error;
  const divisions = (divisionsResult.data ?? []) as PublicDivisionRegistrationRow[];
  const participants = await readAllSpogomiPages<PublicParticipantRegistrationRow>("public SPOGOMI registration counts", (from, to) =>
    supabase
      .from("spogomi_participants")
      .select("division_id, registration_status", { count: "exact" })
      .eq("event_id", row.id)
      .eq("registration_status", "registered")
      .order("id", { ascending: true })
      .range(from, to),
  );
  return buildPublicRegistrationProjection(row, divisions, participants);
}

async function loadPublicRegistrationProjections(
  supabase: SupabaseClient,
  rows: readonly PublicEventRow[],
): Promise<Map<string, PublicRegistrationProjection>> {
  if (!rows.length) return new Map();
  const eventIds = rows.map((row) => row.id);
  const divisionsResult = await supabase
    .from("spogomi_divisions")
    .select("event_id, id, division_type, regulation_config")
    .in("event_id", eventIds)
    .order("event_id", { ascending: true })
    .order("division_type", { ascending: true });
  if (divisionsResult.error) throw divisionsResult.error;
  const participants = await readAllSpogomiPages<PublicParticipantRegistrationRow & { event_id: string }>("public SPOGOMI registration counts", (from, to) =>
    supabase
      .from("spogomi_participants")
      .select("event_id, division_id, registration_status", { count: "exact" })
      .in("event_id", eventIds)
      .eq("registration_status", "registered")
      .order("event_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  const divisionsByEvent = new Map<string, PublicDivisionRegistrationRow[]>();
  for (const division of (divisionsResult.data ?? []) as PublicDivisionRegistrationRow[]) {
    const eventId = String(division.event_id);
    divisionsByEvent.set(eventId, [...(divisionsByEvent.get(eventId) ?? []), division]);
  }
  const participantsByEvent = new Map<string, PublicParticipantRegistrationRow[]>();
  for (const participant of participants) {
    const eventId = String((participant as PublicParticipantRegistrationRow & { event_id: string }).event_id);
    participantsByEvent.set(eventId, [...(participantsByEvent.get(eventId) ?? []), participant]);
  }
  return new Map(rows.map((row) => [row.id, buildPublicRegistrationProjection(row, divisionsByEvent.get(row.id) ?? [], participantsByEvent.get(row.id) ?? [])]));
}

function isPublishableAction(row: { status: string | null; published_at: string | null; moderation_visibility: string | null }): boolean {
  return row.status === "approved" && Boolean(row.published_at) && row.moderation_visibility !== "hidden";
}

async function loadPublicActionHrefs(
  supabase: SupabaseClient,
  actionIds: string[],
): Promise<Set<string>> {
  if (!actionIds.length) return new Set();
  const result = await supabase
    .from("actions")
    .select("id, status, published_at, moderation_visibility")
    .in("id", actionIds);
  if (result.error) throw result.error;
  return new Set(
    (result.data ?? [])
      .filter(isPublishableAction)
      .map((row) => String(row.id)),
  );
}

function mapEvent(
  row: PublicEventRow,
  publishableActionIds: Set<string>,
  teams: SpogomiPublicTeam[] = [],
  divisions: Array<Pick<SpogomiPublicDivision, "id" | "type">> = [],
  route: SpogomiPublicRoute | null = null,
  practicalInformation: SpogomiPublicPracticalInformation | null = null,
  results: SpogomiPublicResults | null = null,
  organizer: SpogomiPublicOrganizer | null = null,
  gallery: SpogomiPublicGalleryPhoto[] = [],
  registration: PublicRegistrationProjection = { status: "not_open", divisions: [] },
  resultsStatus: SpogomiResultsStatus = results?.lifecycleStatus ?? "unavailable",
  now = new Date(),
): SpogomiPublicEvent | null {
  if (!row.event_slug) return null;
  const calendarStatus = classifySpogomiCalendarStatus({ startsAt: row.starts_at, endsAt: row.ends_at, state: row.state, now });
  return {
    id: row.id,
    slug: row.event_slug,
    name: row.name,
    locationLabel: row.location_label,
    mode: row.mode,
    state: row.state,
    lifecycle: calendarStatus,
    calendarStatus,
    registrationStatus: registration.status,
    resultsStatus,
    provenance: "published_event",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    officialTimezone: row.official_timezone || "Europe/Paris",
    actionHref: row.state !== "cancelled" && publishableActionIds.has(row.action_id)
      ? `/actions/map?actionId=${encodeURIComponent(row.action_id)}`
      : null,
    divisions: registration.divisions.length ? registration.divisions : divisions.map((division) => ({
      ...division,
      registrationStatus: "not_open" as const,
      registeredCount: 0,
      capacity: null,
    })),
    teams,
    route,
    practicalInformation,
    results,
    organizer,
    gallery,
  };
}

async function loadPublishedRows(supabase: SupabaseClient, options: { slug?: string; includeCancelled: boolean }): Promise<PublicEventRow[]> {
  let query = supabase
    .from("spogomi_events")
    .select("id, event_slug, name, location_label, mode, state, starts_at, ends_at, official_timezone, action_id, regulation_config, public_visibility, public_results_visibility")
    .eq("public_visibility", "published")
    .not("event_slug", "is", null);
  if (!options.includeCancelled) query = query.neq("state", "cancelled");
  if (options.slug) query = query.eq("event_slug", options.slug);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []) as PublicEventRow[];
}

export async function listPublishedSpogomiEvents(
  supabase = getSupabaseServerClient(true),
): Promise<SpogomiPublicEvent[]> {
  const rows = await loadPublishedRows(supabase, { includeCancelled: false });
  const now = new Date();
  const actionIds = await loadPublicActionHrefs(supabase, rows.map((row) => row.action_id));
  const registrations = await loadPublicRegistrationProjections(supabase, rows);
  const organizers = await loadSpogomiPublicOrganizersForActions({
    supabase,
    actionIds: rows.map((row) => row.action_id),
    eventTerritories: new Map(rows.map((row) => [row.action_id, row.location_label])),
  });
  const mapped = await Promise.all(rows.map(async (row) => {
    // Hidden results are not publicly available; avoid loading the complete
    // source projection (teams, items, participants, rankings, mappings and
    // closure decisions) merely to report an unavailable catalog status.
    const projection = row.public_results_visibility === "hidden"
      ? null
      : await loadSpogomiResultsProjection({ supabase, eventId: row.id, publicOnly: true });
    const organizer = organizers.get(row.action_id) ?? null;
    const registration = registrations.get(row.id) ?? { status: "not_open" as const, divisions: [] };
    return mapEvent(row, actionIds, [], [], null, null, null, organizer, [], registration, projection?.results.lifecycleStatus ?? "unavailable", now);
  }));
  return mapped
    .filter((event): event is SpogomiPublicEvent => Boolean(event))
    .sort((left, right) => {
      const leftFinished = left.calendarStatus === "finished";
      const rightFinished = right.calendarStatus === "finished";
      if (leftFinished !== rightFinished) return leftFinished ? 1 : -1;
      const leftTime = Date.parse(left.startsAt);
      const rightTime = Date.parse(right.startsAt);
      return leftFinished ? rightTime - leftTime : leftTime - rightTime;
    });
}

export async function loadPublishedSpogomiEventBySlug(
  slug: string,
  supabase = getSupabaseServerClient(true),
): Promise<SpogomiPublicEvent | null> {
  const rows = await loadPublishedRows(supabase, { slug, includeCancelled: true });
  const row = rows[0];
  if (!row) return null;
  const actionIds = await loadPublicActionHrefs(supabase, [row.action_id]);
  const [divisionsResult, teamsResult, routeResult, projection, actionPreparation, operationsResult] = await Promise.all([
    supabase.from("spogomi_divisions").select("id, division_type, regulation_config").eq("event_id", row.id).order("division_type"),
    row.state === "cancelled" ? Promise.resolve({ data: [], error: null }) : supabase
      .from("spogomi_teams")
      .select("id, division_id, team_number, public_name, composition_state")
      .eq("event_id", row.id)
      .order("team_number", { ascending: true }),
    supabase
      .from("spogomi_event_routes")
      .select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson")
      .eq("event_id", row.id)
      .maybeSingle(),
    loadSpogomiResultsProjection({ supabase, eventId: row.id, publicOnly: true }),
    row.state === "cancelled" ? Promise.resolve(null) : loadPublicActionPreparation(supabase, row.action_id, actionIds),
    supabase
      .from("spogomi_field_operations")
      .select("division_id, timezone_name, official_start_at, collection_limit_at, sorting_limit_at, weighing_start_at, weighing_end_at")
      .eq("event_id", row.id),
  ]);
  if (divisionsResult.error) throw divisionsResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (routeResult.error) throw routeResult.error;
  if (operationsResult.error) throw operationsResult.error;
  const routeData = routeResult.data as {
    source: "official_reference";
    file_name: string;
    point_count: number;
    reference_distance_km: number;
    inferred_topology: "loop" | "point_to_point";
    geometry_geojson: { coordinates?: [number, number][] };
  } | null;
  const route = routeData?.geometry_geojson.coordinates
    ? {
        source: "official_reference" as const,
        fileName: routeData.file_name,
        pointCount: routeData.point_count,
        referenceDistanceKm: Number(routeData.reference_distance_km),
        inferredTopology: routeData.inferred_topology,
        coordinates: routeData.geometry_geojson.coordinates,
      }
    : null;
  const divisions = (divisionsResult.data ?? []).map((division) => ({
    id: String(division.id),
    type: division.division_type === "world_cup" ? "world_cup" as const : "casual" as const,
  }));
  const practicalInformation = buildSpogomiPublicPracticalInformation({
    actionPreparationData: actionPreparation as Parameters<typeof buildSpogomiPublicPracticalInformation>[0]["actionPreparationData"],
    registrationConfig: row.regulation_config,
    divisions,
    operations: (operationsResult.data ?? []) as Parameters<typeof buildSpogomiPublicPracticalInformation>[0]["operations"],
  });
  const mapped = mapEvent(
    row,
    actionIds,
    (teamsResult.data ?? []).map((team) => ({
      id: String(team.id),
      divisionId: String(team.division_id),
      divisionType: (divisionsResult.data ?? []).find((division) => String(division.id) === String(team.division_id))?.division_type === "world_cup" ? "world_cup" as const : "casual" as const,
      teamNumber: Number(team.team_number),
      publicName: String(team.public_name),
      compositionState: String(team.composition_state),
    })),
    divisions,
    route,
    practicalInformation,
    projection?.results ?? null,
    await loadSpogomiOrganizerForAction({ supabase, actionId: row.action_id, eventTerritory: row.location_label }),
    await loadPublishedSpogomiGalleryForAction({ supabase, actionId: row.action_id }),
    await loadPublicRegistrationProjection(supabase, row, (divisionsResult.data ?? []) as PublicDivisionRegistrationRow[]),
    projection?.results.lifecycleStatus ?? "unavailable",
  );
  if (!mapped) return null;
  return mapped;
}

export async function loadPublishedSpogomiEventResultsBySlug(
  slug: string,
  supabase = getSupabaseServerClient(true),
): Promise<SpogomiPublicResults | null> {
  const event = await loadPublishedSpogomiEventBySlug(slug, supabase);
  return event?.results ?? null;
}

export async function loadPublishedSpogomiEventForAction(
  actionId: string,
  supabase = getSupabaseServerClient(true),
): Promise<Pick<SpogomiPublicEvent, "slug" | "name"> | null> {
  const result = await supabase
    .from("spogomi_events")
    .select("event_slug, name, action_id")
    .eq("action_id", actionId)
    .eq("public_visibility", "published")
    .neq("state", "cancelled")
    .not("event_slug", "is", null)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data?.event_slug) return null;
  return { slug: String(result.data.event_slug), name: String(result.data.name) };
}
