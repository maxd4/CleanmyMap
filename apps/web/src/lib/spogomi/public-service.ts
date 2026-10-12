import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SpogomiEventMode, SpogomiEventState } from "./types";
import { loadSpogomiResultsProjection } from "./results-projection-service";
import type { SpogomiPublicResults } from "./results-projection";
import { loadSpogomiOrganizerForAction } from "./partner-impact-service";
import type { SpogomiPublicOrganizer } from "./partner-impact";
import { loadPublishedSpogomiGalleryForAction } from "./photo-gallery-service";
import type { SpogomiGalleryPhoto } from "./photo-gallery";

export type SpogomiPublicLifecycle = "upcoming" | "in_progress" | "finished";

export type SpogomiPublicTeam = {
  teamNumber: number;
  publicName: string;
  compositionState: string;
};

export type SpogomiPublicRoute = {
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
  startsAt: string;
  endsAt: string | null;
  actionHref: string | null;
  teams: SpogomiPublicTeam[];
  route: SpogomiPublicRoute | null;
  results: SpogomiPublicResults | null;
  organizer: SpogomiPublicOrganizer | null;
  gallery: SpogomiGalleryPhoto[];
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
  action_id: string;
  public_results_visibility: "hidden" | "provisional" | "certified";
};

function normalizeSlugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
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
  const start = Date.parse(startsAt);
  const end = endsAt ? Date.parse(endsAt) : Number.NaN;
  if (state === "certified" || state === "archived" || (!Number.isNaN(end) && now.getTime() > end)) {
    return "finished";
  }
  if (!Number.isNaN(start) && now.getTime() >= start) return "in_progress";
  return "upcoming";
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
  route: SpogomiPublicRoute | null = null,
  results: SpogomiPublicResults | null = null,
  organizer: SpogomiPublicOrganizer | null = null,
  gallery: SpogomiGalleryPhoto[] = [],
): SpogomiPublicEvent | null {
  if (!row.event_slug) return null;
  return {
    id: row.id,
    slug: row.event_slug,
    name: row.name,
    locationLabel: row.location_label,
    mode: row.mode,
    state: row.state,
    lifecycle: classifySpogomiPublicLifecycle(row.starts_at, row.ends_at, row.state),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    actionHref: publishableActionIds.has(row.action_id)
      ? `/actions/map?actionId=${encodeURIComponent(row.action_id)}`
      : null,
    teams,
    route,
    results,
    organizer,
    gallery,
  };
}

async function loadPublishedRows(supabase: SupabaseClient, slug?: string): Promise<PublicEventRow[]> {
  let query = supabase
    .from("spogomi_events")
    .select("id, event_slug, name, location_label, mode, state, starts_at, ends_at, action_id, public_results_visibility")
    .eq("public_visibility", "published")
    .neq("state", "cancelled")
    .not("event_slug", "is", null)
    .order("starts_at", { ascending: true });
  if (slug) query = query.eq("event_slug", slug);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []) as PublicEventRow[];
}

export async function listPublishedSpogomiEvents(
  supabase = getSupabaseServerClient(true),
): Promise<SpogomiPublicEvent[]> {
  const rows = await loadPublishedRows(supabase);
  const actionIds = await loadPublicActionHrefs(supabase, rows.map((row) => row.action_id));
  const mapped = await Promise.all(rows.map(async (row) => mapEvent(
    row,
    actionIds,
    [],
    null,
    null,
    await loadSpogomiOrganizerForAction({ supabase, actionId: row.action_id, eventTerritory: row.location_label }),
  )));
  return mapped.filter((event): event is SpogomiPublicEvent => Boolean(event));
}

export async function loadPublishedSpogomiEventBySlug(
  slug: string,
  supabase = getSupabaseServerClient(true),
): Promise<SpogomiPublicEvent | null> {
  const rows = await loadPublishedRows(supabase, slug);
  const row = rows[0];
  if (!row) return null;
  const actionIds = await loadPublicActionHrefs(supabase, [row.action_id]);
  const [teamsResult, routeResult] = await Promise.all([
    supabase
      .from("spogomi_teams")
      .select("team_number, public_name, composition_state")
      .eq("event_id", row.id)
      .order("team_number", { ascending: true }),
    supabase
      .from("spogomi_event_routes")
      .select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson")
      .eq("event_id", row.id)
      .maybeSingle(),
  ]);
  if (teamsResult.error) throw teamsResult.error;
  if (routeResult.error) throw routeResult.error;
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
  const mapped = mapEvent(
    row,
    actionIds,
    (teamsResult.data ?? []).map((team) => ({
      teamNumber: Number(team.team_number),
      publicName: String(team.public_name),
      compositionState: String(team.composition_state),
    })),
    route,
    null,
    await loadSpogomiOrganizerForAction({ supabase, actionId: row.action_id, eventTerritory: row.location_label }),
    await loadPublishedSpogomiGalleryForAction({ supabase, actionId: row.action_id }),
  );
  if (!mapped) return null;
  const projection = await loadSpogomiResultsProjection({ supabase, eventId: row.id, publicOnly: true });
  return { ...mapped, results: projection?.results ?? null };
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
