import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { unstable_cache } from "next/cache";
import { z } from"zod";
import {
 defaultCommunityEventOps,
 CLEANUP_SUPPORT_LEVELS,
 CLEANUP_WASTE_TYPES,
 serializeCommunityEventDescription,
} from"@/lib/community/event-ops";
import {
 toCommunityEventItem,
 type CommunityEventOrganizer,
} from "@/lib/community/event-item";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import type { CommunityEventRow } from"@/types/database";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from"@/lib/http/api-errors";
import { getCurrentUserIdentity } from"@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import {
 reserveDiscussionMessageSlot,
 toDiscussionRateLimitErrorPayload,
} from"@/lib/community/discussion-rate-limit";
import {
 getCommunityEventNotificationTargets,
 loadCommunityEventNotificationProfiles,
 isProfileEligibleForCommunityEvent,
} from"@/lib/community/event-notification-targets";
import {
 indexCommunityEventRsvpSummaries,
 loadCommunityEventRsvpSummaries,
} from"@/lib/community/event-rsvp-summaries";
import { sendCreatorInboxEmail } from"@/lib/community/creator-inbox-email";
import { getClerkService } from"@/lib/services/clerk";
import { enforceServerRateLimit } from"@/lib/rate-limit/server";
import { isIsoDateString } from"@/lib/security/validation";
import {
 communityEventLocationSchema,
 communityEventLocationToDatabase,
} from "@/lib/community/event-location";
import {
 COMMUNITY_EVENTS_CACHE_REVALIDATE_SECONDS,
 COMMUNITY_EVENTS_CACHE_TAG,
 revalidateCommunityEventCaches,
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
): string {
 return `limit:${limit}`;
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
 const load = async () => {
   const supabase = getSupabaseServerClient(true);

   let eventsQuery = supabase
    .from("community_events")
    .select(
"id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
    )
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false });
   if (eventId) {
    eventsQuery = eventsQuery.eq("id", eventId);
   }
   const eventsResult = await eventsQuery.limit(limit);

   if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
   }

   const events = (eventsResult.data ?? []) as CommunityEventRow[];
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
    ["community-events", buildCommunityEventsCacheKey(limit)],
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

const createCommunityEventSchema = z.object({
 title: z.string().trim().min(2).max(200),
 eventDate: z
 .string()
 .refine(isIsoDateString,"Date attendue au format YYYY-MM-DD"),
 locationLabel: z.string().trim().min(2).max(255),
 location: communityEventLocationSchema.optional(),
 description: z.string().trim().max(2000).optional(),
 capacityTarget: z.number().int().min(1).max(200000).optional(),
 cleanupObjective: z.string().trim().min(2).max(240),
 cleanupZone: z.string().trim().min(2).max(240),
 cleanupLogisticsNeeds: z.string().trim().max(1000).optional(),
 cleanupSupportLevel: z.enum(CLEANUP_SUPPORT_LEVELS),
 cleanupWasteTypesExpected: z.array(z.enum(CLEANUP_WASTE_TYPES)).min(1).max(5),
});

type CommunityEventsSupabase = ReturnType<typeof getSupabaseServerClient>;
type CommunityEventIdentity = Awaited<ReturnType<typeof getCurrentUserIdentity>>;

async function notifyCommunityEventCreatorInbox(params: {
 identity: CommunityEventIdentity;
 userId: string;
 payload: z.infer<typeof createCommunityEventSchema>;
}): Promise<void> {
 try {
  const { identity, userId, payload } = params;
  await sendCreatorInboxEmail({
   subject: `[CleanMyMap] Nouvel événement - ${payload.title}`,
   actorUserId: userId,
   title: "Nouvel événement communautaire",
   intro: "Un événement vient d'être créé dans la file créateur.",
   lines: [
    { label:"Organisateur", value: identity?.displayName ?? userId },
    { label:"Email", value: identity?.email ?? "non communiqué" },
    { label:"Source", value: "Création d'événement communautaire" },
    { label:"Titre", value: payload.title },
    { label:"Date", value: payload.eventDate },
    { label:"Lieu", value: payload.locationLabel },
    { label:"Description", value: payload.description ?? "non communiquée" },
    { label:"Objectif cleanup", value: payload.cleanupObjective },
    { label:"Zone cleanup", value: payload.cleanupZone },
    { label:"Soutien souhaité", value: payload.cleanupSupportLevel },
    { label:"Déchets attendus", value: payload.cleanupWasteTypesExpected.join(", ") },
    { label:"Capacité cible", value: String(payload.capacityTarget ?? "non communiquée") },
   ],
   footer:"L'événement est également visible dans le flux communautaire.",
  });
 } catch (notifError) {
  console.warn("[Event Notif] Creator inbox failure:", notifError);
 }
}

async function notifyNearbyCommunityEventProfiles(
 supabase: CommunityEventsSupabase,
 params: {
  userId: string;
  eventId: string;
  title: string;
  locationLabel: string;
 },
): Promise<void> {
 try {
  const notificationTargets = getCommunityEventNotificationTargets(params.locationLabel);
  if (!notificationTargets) return;

  const nearbyProfiles = await loadCommunityEventNotificationProfiles(supabase, {
   excludedProfileId: params.userId,
   targets: notificationTargets,
  });
  const targetProfiles = nearbyProfiles.filter((profile) =>
   isProfileEligibleForCommunityEvent(profile, notificationTargets),
  );
  if (targetProfiles.length === 0) return;

  const notifications = targetProfiles.map((profile) => ({
   user_id: profile.id,
   type:"community",
   title:"Appel au collectif ! 📣",
   content: `Un nouvel événement est organisé près de chez vous :"${params.title}" (${params.locationLabel}).`,
   payload: { entityType:"event", id: params.eventId },
  }));
  await supabase.from("app_notifications").insert(notifications);
 } catch (notifError) {
  console.error("[Event Notif] Silent failure:", notifError);
 }
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

export async function POST(request: Request) {
 const writeRateLimitResponse = await enforceServerRateLimit(request, { limit: 6, window: 60 });
 if (writeRateLimitResponse) {
  return writeRateLimitResponse;
 }

 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }
 const identity = await getCurrentUserIdentity();

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json(
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

 const parsed = createCommunityEventSchema.safeParse(payload);
 if (!parsed.success) {
 return validationErrorResponse(parsed.error.flatten().fieldErrors);
 }

 const supabase = getSupabaseServerClient(true);

 try {
 const quota = await reserveDiscussionMessageSlot(supabase, {
 userId,
 channel:"discussion_event",
 });
 if (!quota.allowed) {
 return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
 }

 const createdResult = await supabase
 .from("community_events")
 .insert({
 organizer_clerk_id: userId,
 title: parsed.data.title,
  event_date: parsed.data.eventDate,
  location_label: parsed.data.locationLabel,
  ...communityEventLocationToDatabase(parsed.data.location),
 description: serializeCommunityEventDescription(
  parsed.data.description ?? null,
  {
   ...defaultCommunityEventOps(),
   capacityTarget: parsed.data.capacityTarget ?? null,
   cleanupObjective: parsed.data.cleanupObjective,
   cleanupZone: parsed.data.cleanupZone,
   cleanupLogisticsNeeds: parsed.data.cleanupLogisticsNeeds ?? null,
   cleanupSupportLevel: parsed.data.cleanupSupportLevel,
   cleanupWasteTypesExpected: parsed.data.cleanupWasteTypesExpected,
  },
 ),
 })
 .select(
"id, created_at, organizer_clerk_id, title, event_date, location_label, latitude, longitude, location_source, description",
 )
 .single();

 if (createdResult.error) {
 return handleApiError(createdResult.error,"POST /api/community/events (insert)");
 }
 if (!createdResult.data) {
 return NextResponse.json(
 { error:"Event creation failed - no data returned" },
 { status: 500 },
 );
 }

 revalidateCommunityEventCaches();

 await notifyCommunityEventCreatorInbox({
  identity,
  userId,
  payload: parsed.data,
 });

 await notifyNearbyCommunityEventProfiles(supabase, {
  userId,
  eventId: createdResult.data.id,
  title: parsed.data.title,
  locationLabel: parsed.data.locationLabel,
 });

 return NextResponse.json({ status:"created", item: createdResult.data }, { status: 201 });
 } catch (error) {
 return handleApiError(error, "POST /api/community/events");
 }
}
