import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageActionsGlobally } from "@/lib/actions/permissions";
import { getCurrentUserIdentity } from "@/lib/authz";
import {
  canManageEvent,
  SPOGOMI_ORGANIZER_EVENT_SELECT,
  type EventRow,
} from "./preparation-service";
import { readAllSpogomiPages } from "./pagination";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ACTION_ID_BATCH_SIZE = 100;

type OrganizerActionRow = {
  action_id: string;
  organizer_clerk_id: string;
};

async function readCreatedEvents(supabase: SupabaseClient, userId: string): Promise<EventRow[]> {
  return readAllSpogomiPages<EventRow>("organizer-created events", (from, to) =>
    supabase
      .from("spogomi_events")
      .select(SPOGOMI_ORGANIZER_EVENT_SELECT, { count: "exact" })
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
  return readAllSpogomiPages<OrganizerActionRow>("organizer action relations", (from, to) =>
    supabase
      .from("action_organizers")
      .select("action_id, organizer_clerk_id", { count: "exact" })
      .eq("organizer_clerk_id", userId)
      .order("action_id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

async function readEventsForActionIds(
  supabase: SupabaseClient,
  actionIds: string[],
): Promise<EventRow[]> {
  const events: EventRow[] = [];
  for (let index = 0; index < actionIds.length; index += ACTION_ID_BATCH_SIZE) {
    const batch = actionIds.slice(index, index + ACTION_ID_BATCH_SIZE);
    const page = await readAllSpogomiPages<EventRow>("organizer-related events", (from, to) =>
      supabase
        .from("spogomi_events")
        .select(SPOGOMI_ORGANIZER_EVENT_SELECT, { count: "exact" })
        .in("action_id", batch)
        .order("starts_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
      { requireExactCount: true },
    );
    events.push(...page);
  }
  return events;
}

async function readAllEventsForGlobalOrganizer(supabase: SupabaseClient): Promise<EventRow[]> {
  return readAllSpogomiPages<EventRow>("global organizer events", (from, to) =>
    supabase
      .from("spogomi_events")
      .select(SPOGOMI_ORGANIZER_EVENT_SELECT, { count: "exact" })
      .order("starts_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
    { requireExactCount: true },
  );
}

function deduplicateEvents(events: EventRow[]): EventRow[] {
  const unique = new Map<string, EventRow>();
  for (const event of events) unique.set(event.id, event);
  return [...unique.values()].sort((left, right) => {
    const startsAtDifference = Date.parse(right.starts_at) - Date.parse(left.starts_at);
    return startsAtDifference || left.id.localeCompare(right.id);
  });
}

/**
 * Loads only event candidates reachable by the current identity, then applies
 * the canonical action-management decision before returning them.
 */
export async function listSpogomiEventsForOrganizer(
  supabase: SupabaseClient,
  userId: string,
): Promise<EventRow[]> {
  const identity = await getCurrentUserIdentity({ userId });
  if (!identity || identity.userId !== userId) return [];

  if (canManageActionsGlobally(identity)) {
    return deduplicateEvents(await readAllEventsForGlobalOrganizer(supabase)).filter((event) =>
      canManageEvent(identity, event, []),
    );
  }

  const organizerRelations = await readOrganizerActions(supabase, userId);
  const organizerActionIds = [...new Set(organizerRelations.map((row) => String(row.action_id)))];
  const [createdEvents, relatedEvents] = await Promise.all([
    readCreatedEvents(supabase, userId),
    readEventsForActionIds(supabase, organizerActionIds),
  ]);
  const organizerIdsByAction = new Map<string, string[]>();
  for (const relation of organizerRelations) {
    const actionId = String(relation.action_id);
    const ids = organizerIdsByAction.get(actionId) ?? [];
    ids.push(String(relation.organizer_clerk_id));
    organizerIdsByAction.set(actionId, ids);
  }

  return deduplicateEvents([...createdEvents, ...relatedEvents]).filter((event) =>
    canManageEvent(identity, event, organizerIdsByAction.get(event.action_id) ?? []),
  );
}

export async function listSpogomiEventsForCurrentOrganizer(userId: string): Promise<EventRow[]> {
  return listSpogomiEventsForOrganizer(getSupabaseServerClient(true), userId);
}
