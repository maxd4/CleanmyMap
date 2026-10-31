import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import {
 toCommunityEventItem,
 type CommunityEventOrganizer,
} from "@/lib/community/event-item";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import type { CommunityEventRow } from"@/types/database";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
 indexCommunityEventRsvpSummaries,
 loadCommunityEventRsvpSummaries,
} from"@/lib/community/event-rsvp-summaries";
import { getClerkService } from"@/lib/services/clerk";
import {
 COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
 COMMUNITY_EVENTS_CACHE_TAG,
} from "@/lib/community/event-cache-invalidation";
import { parsePositiveInteger } from "@/lib/http/query-params";
import {
 buildCommunityEventsPageCursor,
 parseCommunityEventsPageCursor,
 type CommunityEventsPagePhase,
 type CommunityEventsPageCursor,
} from "@/lib/community/events-pagination";

const COMMUNITY_EVENTS_ANONYMOUS_CACHE_HEADERS = {
 "Cache-Control": "public, max-age=20, stale-while-revalidate=60",
 "Vary": "Cookie",
};
const COMMUNITY_EVENTS_USER_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
 "Vary": "Cookie",
};
function buildCommunityEventsCacheKey(
 limit: number,
 todayIso: string,
 cursor: string | null,
 phase: CommunityEventsPagePhase | null,
): string {
 return `limit:${limit}:today:${todayIso}:phase:${phase ?? "combined"}:cursor:${cursor ?? "first"}`;
}

type CachedCommunityEventItem = {
 event: CommunityEventRow;
 organizer?: CommunityEventOrganizer;
 rsvpCounts: {
  yes: number;
  maybe: number;
  no: number;
  total: number;
 };
};

type CachedCommunityEventsPayload = {
 items: CachedCommunityEventItem[];
 hasMore: boolean;
 nextCursor: string | null;
};

type CommunityEventsSuccessPayload = {
 status: "ok";
 count: number;
 items: ReturnType<typeof toCommunityEventItem>[];
 hasMore: boolean;
 nextCursor: string | null;
};

type CommunityEventsRowsPage = {
 events: CommunityEventRow[];
 hasMore: boolean;
 nextCursor: string | null;
};

const COMMUNITY_EVENTS_SELECT_FIELDS =
  "id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description";

function toCachedCommunityEventItem(
 event: CommunityEventRow,
 summary: { yesCount: number; maybeCount: number; noCount: number; totalCount: number } | undefined,
 organizerIdentity: import("@/lib/services/clerk").ClerkUserIdentity | undefined,
): CachedCommunityEventItem {
 const organizer = organizerIdentity
  ? { ...organizerIdentity, userId: null }
  : undefined;
 return {
  event,
  organizer,
  rsvpCounts: {
   yes: summary?.yesCount ?? 0,
   maybe: summary?.maybeCount ?? 0,
   no: summary?.noCount ?? 0,
   total: summary?.totalCount ?? 0,
  },
 } satisfies CachedCommunityEventItem;
}

async function loadCommunityEventPhase(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  todayIso: string,
  phase: "upcoming" | "past",
  phaseLimit: number,
  phaseCursor: CommunityEventsPageCursor | null,
): Promise<CommunityEventRow[]> {
  let query = supabase.from("community_events").select(COMMUNITY_EVENTS_SELECT_FIELDS);
  if (phase === "upcoming") {
    query = query
      .gte("event_date", todayIso)
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (phaseCursor) {
      query = query.or(
        `event_date.gt.${phaseCursor.eventDate},and(event_date.eq.${phaseCursor.eventDate},created_at.lt.${phaseCursor.createdAt}),and(event_date.eq.${phaseCursor.eventDate},created_at.eq.${phaseCursor.createdAt},id.lt.${phaseCursor.id})`,
      );
    }
  } else {
    query = query
      .lt("event_date", todayIso)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (phaseCursor) {
      query = query.or(
        `event_date.lt.${phaseCursor.eventDate},and(event_date.eq.${phaseCursor.eventDate},created_at.lt.${phaseCursor.createdAt}),and(event_date.eq.${phaseCursor.eventDate},created_at.eq.${phaseCursor.createdAt},id.lt.${phaseCursor.id})`,
      );
    }
  }
  const result = await query.limit(phaseLimit);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as CommunityEventRow[];
}

function buildCommunityEventsPage(
  events: CommunityEventRow[],
  limit: number,
  phase: CommunityEventsPagePhase,
  hasMore: boolean,
): CommunityEventsRowsPage {
  const pageEvents = events.slice(0, limit);
  const last = pageEvents.at(-1);
  return {
    events: pageEvents,
    hasMore,
    nextCursor: hasMore && last
      ? buildCommunityEventsPageCursor({
          phase,
          eventDate: last.event_date,
          createdAt: last.created_at,
          id: last.id,
        })
      : null,
  };
}

async function loadCommunityEventRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  todayIso: string,
  limit: number,
  eventId: string | null,
 cursor: CommunityEventsPageCursor | null,
 requestedPhase: CommunityEventsPagePhase | null,
): Promise<CommunityEventsRowsPage> {
  if (eventId) {
    const result = await supabase
      .from("community_events")
      .select(COMMUNITY_EVENTS_SELECT_FIELDS)
      .eq("id", eventId)
      .limit(limit);
    if (result.error) throw new Error(result.error.message);
    return {
      events: (result.data ?? []) as CommunityEventRow[],
      hasMore: false,
      nextCursor: null,
    };
  }

 if (requestedPhase) {
   const phase = requestedPhase;
    const events = await loadCommunityEventPhase(supabase, todayIso, phase, limit + 1, cursor);
    return buildCommunityEventsPage(events, limit, phase, events.length > limit);
 }

 const phase = cursor?.phase ?? "upcoming";
 const upcomingEvents = phase === "upcoming"
    ? await loadCommunityEventPhase(supabase, todayIso, "upcoming", limit + 1, cursor)
   : [];
 if (phase === "upcoming" && upcomingEvents.length > limit) {
    return buildCommunityEventsPage(upcomingEvents, limit, "upcoming", true);
  }

  const remainingLimit = Math.max(0, limit - upcomingEvents.length);
 const pastCursor = phase === "past" ? cursor : null;
  const pastEvents = await loadCommunityEventPhase(
    supabase,
    todayIso,
    "past",
    phase === "past" ? limit + 1 : Math.max(1, remainingLimit + 1),
    pastCursor,
  );
 const rawEvents = phase === "past"
   ? pastEvents.slice(0, limit)
   : [...upcomingEvents, ...pastEvents.slice(0, remainingLimit)].slice(0, limit);
  const events = Array.from(new Map(rawEvents.map((event) => [event.id, event])).values());
 const hasMore = phase === "past"
   ? pastEvents.length > limit
   : upcomingEvents.length > limit || pastEvents.length > remainingLimit;
  const last = events.at(-1);
  return {
    events,
    hasMore,
    nextCursor: hasMore && last
      ? buildCommunityEventsPageCursor({
          phase: phase === "past" || upcomingEvents.length === 0 || events.length > upcomingEvents.length ? "past" : "upcoming",
          eventDate: last.event_date,
          createdAt: last.created_at,
          id: last.id,
        })
      : null,
  };
}

type CommunityEventsRequest = {
  limit: number;
  eventId: string | null;
  cursor: CommunityEventsPageCursor | null;
  phase: CommunityEventsPagePhase | null;
};

function parseCommunityEventsRequest(url: URL):
  | { ok: true; value: CommunityEventsRequest }
  | { ok: false; response: NextResponse } {
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 1, 300, 120);
  const eventId = url.searchParams.get("eventId")?.trim() || null;
  if (eventId && !z.string().uuid().safeParse(eventId).success) {
    return { ok: false, response: NextResponse.json({ error: "Identifiant d'événement invalide" }, { status: 400 }) };
  }
  const requestedCursor = url.searchParams.get("cursor")?.trim() || null;
  const cursor = parseCommunityEventsPageCursor(requestedCursor);
  if (requestedCursor && !cursor) {
    return { ok: false, response: NextResponse.json({ error: "Curseur d'événement invalide" }, { status: 400 }) };
  }
  if (eventId && cursor) {
    return { ok: false, response: NextResponse.json({ error: "Un événement ciblé ne peut pas utiliser un curseur" }, { status: 400 }) };
  }
  const requestedPhaseValue = url.searchParams.get("phase")?.trim() || null;
  const phase = requestedPhaseValue === "upcoming" || requestedPhaseValue === "past"
    ? requestedPhaseValue
    : null;
  if (requestedPhaseValue && !phase) {
    return { ok: false, response: NextResponse.json({ error: "Phase d'événement invalide" }, { status: 400 }) };
  }
  if (phase && cursor && cursor.phase !== phase) {
    return { ok: false, response: NextResponse.json({ error: "La phase ne correspond pas au curseur" }, { status: 400 }) };
  }
  return { ok: true, value: { limit, eventId, cursor, phase } };
}

async function buildCachedCommunityEventsPayload(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  todayIso: string,
  limit: number,
  eventId: string | null,
 cursor: CommunityEventsPageCursor | null,
 requestedPhase: CommunityEventsPagePhase | null,
): Promise<CachedCommunityEventsPayload> {
 const page = await loadCommunityEventRows(supabase, todayIso, limit, eventId, cursor, requestedPhase);
  const events = page.events;
  if (events.length === 0) {
    return {
      items: [],
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  }

  const summaries = await loadCommunityEventRsvpSummaries(supabase, {
    eventIds: events.map((event) => event.id),
    userId: null,
  });
  const summaryByEventId = indexCommunityEventRsvpSummaries(summaries);
  const organizerIds = Array.from(
    new Set(
      events
        .map((event) => event.organizer_clerk_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const organizerById = await (await getClerkService()).resolveUsers(organizerIds);
  return {
    items: events.map((event) =>
      toCachedCommunityEventItem(
        event,
        summaryByEventId.get(event.id),
        organizerById.get(event.organizer_clerk_id),
      ),
    ),
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}

async function loadCachedCommunityEvents(
 userId: string | null,
 limit: number,
 eventId: string | null,
 cursor: CommunityEventsPageCursor | null,
 requestedPhase: CommunityEventsPagePhase | null,
): Promise<CommunityEventsSuccessPayload> {
 const todayIso = new Date().toISOString().slice(0, 10);
 const load = async () => {
   return buildCachedCommunityEventsPayload(
     getSupabaseServerClient(true),
     todayIso,
     limit,
     eventId,
     cursor,
    requestedPhase,
   );
 };
 const cached = eventId
  ? load
  : unstable_cache(
    load,
    ["community-events", buildCommunityEventsCacheKey(limit, todayIso, cursor ? buildCommunityEventsPageCursor(cursor) : null, requestedPhase)],
    {
     revalidate: COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
     tags: [COMMUNITY_EVENTS_CACHE_TAG],
    },
   );

 const cachedPayload = await cached();
 const personalStatuses = new Map<string, "yes" | "maybe" | "no" | null>();
 if (userId && cachedPayload.items.length > 0) {
  const summaries = await loadCommunityEventRsvpSummaries(
   getSupabaseServerClient(true),
   {
    eventIds: cachedPayload.items.map(({ event }) => event.id),
    userId,
   },
  );
  for (const summary of summaries) {
   personalStatuses.set(summary.eventId, summary.myRsvpStatus);
  }
 }

 const items = cachedPayload.items.map(({ event, organizer, rsvpCounts }) =>
  toCommunityEventItem(
   event,
   {
    eventId: event.id,
    yesCount: rsvpCounts.yes,
    maybeCount: rsvpCounts.maybe,
    noCount: rsvpCounts.no,
    totalCount: rsvpCounts.total,
    myRsvpStatus: personalStatuses.get(event.id) ?? null,
   },
   {
    canEditOwnOps: Boolean(userId && event.organizer_clerk_id === userId),
    organizer,
    organizerClerkId: null,
   },
  ),
 );
 return {
   status: "ok",
   count: items.length,
   items,
   hasMore: cachedPayload.hasMore,
   nextCursor: cachedPayload.nextCursor,
 };
}

export async function GET(request: Request) {
 // Public reads may use the current user only for their private RSVP status.
 // If Clerk is unavailable, fail closed for that personal context and keep the
 // public event/count projection available with myRsvpStatus: null.
 const { userId } = await getSafeAuthSession();
  const parsedRequest = parseCommunityEventsRequest(new URL(request.url));
  if (!parsedRequest.ok) return parsedRequest.response;
  const { limit, eventId, cursor, phase } = parsedRequest.value;

 try {
  const payload = await loadCachedCommunityEvents(userId, limit, eventId, cursor, phase);
 return NextResponse.json(payload, {
  headers: userId
   ? COMMUNITY_EVENTS_USER_CACHE_HEADERS
   : COMMUNITY_EVENTS_ANONYMOUS_CACHE_HEADERS,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/community/events");
 }
}

export async function POST() {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 return NextResponse.json(
  {
   error:
    "La création des nouvelles missions passe désormais par /actions/new. Les anciens événements restent consultables et leurs opérations restent modifiables via l'API historique.",
  },
  { status: 410 },
 );
}
