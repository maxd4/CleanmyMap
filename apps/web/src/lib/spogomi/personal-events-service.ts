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
type SpogomiReviewerRole = "observer" | "referee" | "checkin" | "timekeeper" | "weigher" | "data_entry" | "arbiter" | "certifier";
type ReviewerRow = { event_id: string; role: SpogomiReviewerRole };
type ParticipantRow = { event_id: string; account_link_status: "verified" };
type ChangeParticipantRow = { event_id: string };
type ChangeJoinRequestRow = { event_id: string };
type EventChangeRow = {
  id: string;
  event_id: string;
  revision: number;
  changed_fields: unknown;
  requires_confirmation: boolean;
  created_at: string;
};
type EventChangeAcknowledgementRow = {
  change_id: string;
  event_id: string;
  acknowledged_at: string;
};

const PERSONAL_CHANGE_SELECT = "id, event_id, revision, changed_fields, requires_confirmation, created_at";

export type SpogomiPersonalRelation =
  | "organizer"
  | "referee"
  | "observer"
  | "checkin"
  | "field_operator"
  | "participant"
  | "applicant";

type SpogomiPersonalAccess =
  | "manage"
  | "arbitrate"
  | "checkin"
  | "observe"
  | "operate"
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

export type SpogomiPersonalEventChange = {
  id: string;
  eventId: string;
  revision: number;
  changedFields: readonly string[];
  requiresConfirmation: boolean;
  createdAt: string;
  acknowledgedAt: string | null;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function reviewerRelation(role: SpogomiReviewerRole): Exclude<SpogomiPersonalRelation, "organizer" | "participant"> {
  if (role === "timekeeper" || role === "weigher" || role === "data_entry" || role === "arbiter" || role === "certifier") return "field_operator";
  return role;
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

async function readChangeParticipants(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChangeParticipantRow[]> {
  return readAllSpogomiPages<ChangeParticipantRow>("personal change participant relations", (from, to) =>
    supabase
      .from("spogomi_participants")
      .select("event_id", { count: "exact" })
      .eq("clerk_id", userId)
      .eq("account_link_status", "verified")
      .eq("registration_status", "registered")
      .order("event_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readChangeJoinRequests(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChangeJoinRequestRow[]> {
  return readAllSpogomiPages<ChangeJoinRequestRow>("personal change join-request relations", (from, to) =>
    supabase
      .from("spogomi_team_join_requests")
      .select("event_id", { count: "exact" })
      .eq("requester_clerk_id", userId)
      .in("status", ["pending", "approved"])
      .order("event_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readPersonalEventChanges(
  supabase: SupabaseClient,
  eventIds: readonly string[],
): Promise<EventChangeRow[]> {
  return readAllSpogomiPages<EventChangeRow>("personal event changes", (from, to) =>
    supabase
      .from("spogomi_event_change_history")
      .select(PERSONAL_CHANGE_SELECT, { count: "exact" })
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readPersonalEventChangeAcknowledgements(
  supabase: SupabaseClient,
  userId: string,
  eventIds: readonly string[],
): Promise<EventChangeAcknowledgementRow[]> {
  return readAllSpogomiPages<EventChangeAcknowledgementRow>("personal event change acknowledgements", (from, to) =>
    supabase
      .from("spogomi_event_change_acknowledgements")
      .select("change_id, event_id, acknowledged_at", { count: "exact" })
      .eq("clerk_id", userId)
      .in("event_id", eventIds)
      .order("acknowledged_at", { ascending: false })
      .order("change_id", { ascending: true })
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
  changeJoinRequestRows: readonly ChangeJoinRequestRow[],
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
    add(String(row.event_id), reviewerRelation(row.role));
  }
  for (const row of participantRows) add(String(row.event_id), "participant");
  for (const row of changeJoinRequestRows) add(String(row.event_id), "applicant");
  return relations;
}

function toPersonalEvent(
  event: PersonalEventRow,
  relations: Set<SpogomiPersonalRelation>,
): SpogomiPersonalEvent {
  const orderedRelations = (["organizer", "referee", "checkin", "observer", "field_operator", "participant", "applicant"] as const)
    .filter((relation) => relations.has(relation));
  const accesses: SpogomiPersonalAccess[] = [];
  if (relations.has("organizer")) accesses.push("manage");
  if (relations.has("referee")) accesses.push("arbitrate");
  if (relations.has("checkin")) accesses.push("checkin");
  if (relations.has("observer")) accesses.push("observe");
  if (relations.has("field_operator")) accesses.push("operate");
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
        (relations.has("organizer") || relations.has("referee") || relations.has("observer") || relations.has("checkin") || relations.has("field_operator")) && event.event_slug
          ? `/spogomi/${encodeURIComponent(event.event_slug)}/espace`
          : null,
    },
  };
}

/**
 * Returns only events reached through a verified event relation or an active
 * admission request that is also authorized to receive event changes. Global
 * roles are intentionally not consulted: a role alone is not an event relation.
 */
export async function listSpogomiEventsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SpogomiPersonalEvent[]> {
  const [createdEvents, organizerRows, reviewerRows, participantRows, changeJoinRequestRows] = await Promise.all([
    readCreatedEvents(supabase, userId),
    readOrganizerActions(supabase, userId),
    readReviewers(supabase, userId),
    readVerifiedParticipants(supabase, userId),
    readChangeJoinRequests(supabase, userId),
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
      ...changeJoinRequestRows.map((row) => String(row.event_id)),
    ]),
  );
  const allEvents = new Map<string, PersonalEventRow>();
  for (const event of [...createdEvents, ...organizerEvents, ...relatedEvents]) {
    allEvents.set(String(event.id), event);
  }
  const relations = relationMap(createdEvents, organizerEvents, reviewerRows, participantRows, changeJoinRequestRows);

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

/**
 * Returns the change receipt projection for the authenticated account only.
 * Snapshots are deliberately not selected: the client receives fields and
 * acknowledgement state, never the before/after event payloads.
 */
export async function listSpogomiEventChangesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SpogomiPersonalEventChange[]> {
  const [participants, joinRequests] = await Promise.all([
    readChangeParticipants(supabase, userId),
    readChangeJoinRequests(supabase, userId),
  ]);
  const eventIds = unique([
    ...participants.map((row) => String(row.event_id)),
    ...joinRequests.map((row) => String(row.event_id)),
  ]);
  if (!eventIds.length) return [];

  const [changes, acknowledgements] = await Promise.all([
    readPersonalEventChanges(supabase, eventIds),
    readPersonalEventChangeAcknowledgements(supabase, userId, eventIds),
  ]);
  const acknowledgementByChangeId = new Map(
    acknowledgements.map((row) => [String(row.change_id), String(row.acknowledged_at)]),
  );

  return changes.map((row) => ({
    id: String(row.id),
    eventId: String(row.event_id),
    revision: Number(row.revision),
    changedFields: Array.isArray(row.changed_fields) ? row.changed_fields.map(String) : [],
    requiresConfirmation: Boolean(row.requires_confirmation),
    createdAt: String(row.created_at),
    acknowledgedAt: acknowledgementByChangeId.get(String(row.id)) ?? null,
  }));
}

export async function listSpogomiEventChangesForCurrentUser(userId: string): Promise<SpogomiPersonalEventChange[]> {
  return listSpogomiEventChangesForUser(getSupabaseServerClient(true), userId);
}
