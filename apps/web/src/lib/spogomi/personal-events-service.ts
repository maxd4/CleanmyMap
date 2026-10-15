import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readAllSpogomiPages } from "./pagination";
import type { SpogomiEventMode } from "./types";

const EVENT_ID_BATCH_SIZE = 100;

const PERSONAL_EVENT_SELECT =
  "id, action_id, name, event_slug, mode, state, starts_at, ends_at, official_timezone, public_visibility, public_results_visibility";

type PersonalEventRow = {
  id: string;
  action_id: string;
  name: string;
  event_slug: string | null;
  mode: SpogomiEventMode;
  state: string;
  starts_at: string;
  ends_at: string | null;
  official_timezone: string | null;
  public_visibility: "private" | "published";
  public_results_visibility: "hidden" | "provisional" | "certified";
};

type OrganizerActionRow = { action_id: string };
type ReviewerRow = { event_id: string; role: "observer" | "referee" | "checkin" };
type ParticipantRow = { event_id: string; account_link_status: "verified" };

export type SpogomiPersonalRelation =
  | "organizer"
  | "referee"
  | "observer"
  | "checkin"
  | "participant";

type SpogomiPersonalAccess =
  | "manage"
  | "arbitrate"
  | "checkin"
  | "observe"
  | "participate";

export type SpogomiPersonalEvent = {
  id: string;
  name: string;
  eventSlug: string | null;
  mode: SpogomiEventMode;
  state: string;
  startsAt: string;
  endsAt: string | null;
  officialTimezone: string;
  publicVisibility: "private" | "published";
  publicResultsVisibility: "hidden" | "provisional" | "certified";
  relations: readonly SpogomiPersonalRelation[];
  accesses: readonly SpogomiPersonalAccess[];
  links: {
    public: string | null;
    space: string | null;
  };
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

async function readCreatedEvents(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalEventRow[]> {
  return readAllSpogomiPages<PersonalEventRow>("personal created events", (from, to) =>
    supabase
      .from("spogomi_events")
      .select(PERSONAL_EVENT_SELECT, { count: "exact" })
      .eq("created_by_clerk_id", userId)
      .order("starts_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readOrganizerActions(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizerActionRow[]> {
  return readAllSpogomiPages<OrganizerActionRow>("personal organizer relations", (from, to) =>
    supabase
      .from("action_organizers")
      .select("action_id", { count: "exact" })
      .eq("organizer_clerk_id", userId)
      .order("action_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readReviewers(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReviewerRow[]> {
  return readAllSpogomiPages<ReviewerRow>("personal reviewer relations", (from, to) =>
    supabase
      .from("spogomi_event_reviewers")
      .select("event_id, role", { count: "exact" })
      .eq("clerk_id", userId)
      .is("revoked_at", null)
      .order("event_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readVerifiedParticipants(
  supabase: SupabaseClient,
  userId: string,
): Promise<ParticipantRow[]> {
  return readAllSpogomiPages<ParticipantRow>("personal participant relations", (from, to) =>
    supabase
      .from("spogomi_participants")
      .select("event_id, account_link_status", { count: "exact" })
      .eq("clerk_id", userId)
      .eq("account_link_status", "verified")
      .order("event_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readEventsByIds(
  supabase: SupabaseClient,
  eventIds: readonly string[],
): Promise<PersonalEventRow[]> {
  const events: PersonalEventRow[] = [];
  for (let index = 0; index < eventIds.length; index += EVENT_ID_BATCH_SIZE) {
    const batch = eventIds.slice(index, index + EVENT_ID_BATCH_SIZE);
    if (!batch.length) continue;
    events.push(
      ...(await readAllSpogomiPages<PersonalEventRow>("personal related events", (from, to) =>
        supabase
          .from("spogomi_events")
          .select(PERSONAL_EVENT_SELECT, { count: "exact" })
          .in("id", batch)
          .order("starts_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
        { requireExactCount: true },
      )),
    );
  }
  return events;
}

async function readEventsByActionIds(
  supabase: SupabaseClient,
  actionIds: readonly string[],
): Promise<PersonalEventRow[]> {
  const events: PersonalEventRow[] = [];
  for (let index = 0; index < actionIds.length; index += EVENT_ID_BATCH_SIZE) {
    const batch = actionIds.slice(index, index + EVENT_ID_BATCH_SIZE);
    if (!batch.length) continue;
    events.push(
      ...(await readAllSpogomiPages<PersonalEventRow>("personal organizer events", (from, to) =>
        supabase
          .from("spogomi_events")
          .select(PERSONAL_EVENT_SELECT, { count: "exact" })
          .in("action_id", batch)
          .order("starts_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
        { requireExactCount: true },
      )),
    );
  }
  return events;
}

function relationMap(
  createdEvents: readonly PersonalEventRow[],
  organizerEvents: readonly PersonalEventRow[],
  reviewerRows: readonly ReviewerRow[],
  participantRows: readonly ParticipantRow[],
): Map<string, Set<SpogomiPersonalRelation>> {
  const relations = new Map<string, Set<SpogomiPersonalRelation>>();
  const add = (eventId: string, relation: SpogomiPersonalRelation) => {
    const current = relations.get(eventId) ?? new Set<SpogomiPersonalRelation>();
    current.add(relation);
    relations.set(eventId, current);
  };
  for (const event of createdEvents) add(String(event.id), "organizer");
  for (const event of organizerEvents) add(String(event.id), "organizer");
  for (const row of reviewerRows) {
    add(String(row.event_id), row.role);
  }
  for (const row of participantRows) add(String(row.event_id), "participant");
  return relations;
}

function toPersonalEvent(
  event: PersonalEventRow,
  relations: Set<SpogomiPersonalRelation>,
): SpogomiPersonalEvent {
  const orderedRelations = (["organizer", "referee", "checkin", "observer", "participant"] as const)
    .filter((relation) => relations.has(relation));
  const accesses: SpogomiPersonalAccess[] = [];
  if (relations.has("organizer")) accesses.push("manage");
  if (relations.has("referee")) accesses.push("arbitrate");
  if (relations.has("checkin")) accesses.push("checkin");
  if (relations.has("observer")) accesses.push("observe");
  if (relations.has("participant")) accesses.push("participate");

  return {
    id: String(event.id),
    name: String(event.name),
    eventSlug: event.event_slug ? String(event.event_slug) : null,
    mode: event.mode,
    state: String(event.state),
    startsAt: String(event.starts_at),
    endsAt: event.ends_at ? String(event.ends_at) : null,
    officialTimezone: event.official_timezone || "Europe/Paris",
    publicVisibility: event.public_visibility,
    publicResultsVisibility: event.public_results_visibility,
    relations: orderedRelations,
    accesses,
    links: {
      public:
        event.public_visibility === "published" && event.event_slug
          ? `/spogomi/${encodeURIComponent(event.event_slug)}`
          : null,
      space:
        (relations.has("organizer") || relations.has("referee") || relations.has("observer") || relations.has("checkin")) && event.event_slug
          ? `/spogomi/${encodeURIComponent(event.event_slug)}/espace`
          : null,
    },
  };
}

/**
 * Returns only events reached through a verified event relation. Global roles
 * are intentionally not consulted: a role alone is not an event relation.
 */
export async function listSpogomiEventsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SpogomiPersonalEvent[]> {
  const [createdEvents, organizerRows, reviewerRows, participantRows] = await Promise.all([
    readCreatedEvents(supabase, userId),
    readOrganizerActions(supabase, userId),
    readReviewers(supabase, userId),
    readVerifiedParticipants(supabase, userId),
  ]);
  const organizerEvents = await readEventsByActionIds(
    supabase,
    unique(organizerRows.map((row) => String(row.action_id))),
  );
  const relatedEvents = await readEventsByIds(
    supabase,
    unique([
      ...reviewerRows.map((row) => String(row.event_id)),
      ...participantRows.map((row) => String(row.event_id)),
    ]),
  );
  const allEvents = new Map<string, PersonalEventRow>();
  for (const event of [...createdEvents, ...organizerEvents, ...relatedEvents]) {
    allEvents.set(String(event.id), event);
  }
  const relations = relationMap(createdEvents, organizerEvents, reviewerRows, participantRows);

  return [...allEvents.values()]
    .filter((event) => relations.has(String(event.id)))
    .map((event) => toPersonalEvent(event, relations.get(String(event.id))!))
    .sort((left, right) => {
      const startDifference = Date.parse(right.startsAt) - Date.parse(left.startsAt);
      return startDifference || left.id.localeCompare(right.id);
    });
}

export async function listSpogomiEventsForCurrentUser(userId: string): Promise<SpogomiPersonalEvent[]> {
  return listSpogomiEventsForUser(getSupabaseServerClient(true), userId);
}
