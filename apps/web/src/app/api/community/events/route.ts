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
): string {
 return `limit:${limit}:today:${todayIso}`;
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
};

type CommunityEventsSuccessPayload = {
 status: "ok";
 count: number;
 items: ReturnType<typeof toCommunityEventItem>[];
};

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

async function loadCachedCommunityEvents(
 userId: string | null,
 limit: number,
 eventId: string | null,
): Promise<CommunityEventsSuccessPayload> {
 const todayIso = new Date().toISOString().slice(0, 10);
 const load = async () => {
   const supabase = getSupabaseServerClient(true);
   const selectFields =
"id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description";
   let events: CommunityEventRow[];

   if (eventId) {
    const eventsResult = await supabase
      .from("community_events")
      .select(selectFields)
      .eq("id", eventId)
      .limit(limit);
    if (eventsResult.error) {
      throw new Error(eventsResult.error.message);
    }
    events = (eventsResult.data ?? []) as CommunityEventRow[];
   } else {
    const upcomingResult = await supabase
      .from("community_events")
      .select(selectFields)
      .gte("event_date", todayIso)
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (upcomingResult.error) {
      throw new Error(upcomingResult.error.message);
    }

    const upcomingEvents = (upcomingResult.data ?? []) as CommunityEventRow[];
    const remainingLimit = Math.max(0, limit - upcomingEvents.length);
    const pastEvents = remainingLimit === 0
      ? []
      : await supabase
          .from("community_events")
          .select(selectFields)
          .lt("event_date", todayIso)
          .order("event_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(remainingLimit)
          .then((result) => {
            if (result.error) {
              throw new Error(result.error.message);
            }
            return (result.data ?? []) as CommunityEventRow[];
          });
    events = Array.from(
      new Map([...upcomingEvents, ...pastEvents].map((event) => [event.id, event])).values(),
    );
   }

   if (events.length === 0) {
    return { items: [] } satisfies CachedCommunityEventsPayload;
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
      .filter((id): id is string => typeof id ==="string" && id.length > 0),
    ),
   );
   const clerk = await getClerkService();
   const organizerById = await clerk.resolveUsers(organizerIds);

   const items = events.map((event) =>
    toCachedCommunityEventItem(
     event,
     summaryByEventId.get(event.id),
     organizerById.get(event.organizer_clerk_id),
    ),
   );
   return { items } satisfies CachedCommunityEventsPayload;
 };
 const cached = eventId
  ? load
  : unstable_cache(
    load,
    ["community-events", buildCommunityEventsCacheKey(limit, todayIso)],
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
 return { status: "ok", count: items.length, items };
}

export async function GET(request: Request) {
 // Public reads may use the current user only for their private RSVP status.
 // If Clerk is unavailable, fail closed for that personal context and keep the
 // public event/count projection available with myRsvpStatus: null.
 const { userId } = await getSafeAuthSession();
 const url = new URL(request.url);
 const limit = parsePositiveInteger(
  url.searchParams.get("limit"),
  1,
  300,
  120,
 );
 const requestedEventId = url.searchParams.get("eventId")?.trim() || null;
 if (requestedEventId && !z.string().uuid().safeParse(requestedEventId).success) {
  return NextResponse.json(
   { error: "Identifiant d'événement invalide" },
   { status: 400 },
  );
 }

 try {
 const payload = await loadCachedCommunityEvents(userId, limit, requestedEventId);
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
