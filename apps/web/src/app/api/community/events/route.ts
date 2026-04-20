import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  defaultCommunityEventOps,
  parseCommunityEventDescription,
  serializeCommunityEventDescription,
} from "@/lib/community/event-ops";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CommunityEventRow, EventRsvpRow } from "@/types/database";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getRoleBadge, getProfileBadge } from "@/lib/authz";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";
import { getClerkService, type ClerkUserIdentity as OrganizerIdentity } from "@/lib/services/clerk";
import { 
  extractArrondissementFromLabel, 
  getAffectedArrondissements 
} from "@/lib/geo/paris-arrondissements";

function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function toEventResponseItem(
  event: CommunityEventRow,
  rsvps: EventRsvpRow[],
  userId: string | null,
  organizerIdentity: OrganizerIdentity,
) {
  const parsedDescription = parseCommunityEventDescription(event.description);
  const ops = parsedDescription.ops ?? defaultCommunityEventOps();

  let yes = 0;
  let maybe = 0;
  let no = 0;
  let myRsvpStatus: "yes" | "maybe" | "no" | null = null;

  for (const rsvp of rsvps) {
    if (rsvp.status === "yes") {
      yes += 1;
    } else if (rsvp.status === "maybe") {
      maybe += 1;
    } else {
      no += 1;
    }

    if (userId && rsvp.participant_clerk_id === userId) {
      myRsvpStatus = rsvp.status;
    }
  }

  return {
    id: event.id,
    createdAt: event.created_at,
    organizerClerkId: null,
    title: event.title,
    eventDate: event.event_date,
    locationLabel: event.location_label,
    description: parsedDescription.plainDescription,
    capacityTarget: ops.capacityTarget,
    attendanceCount: ops.attendanceCount,
    postMortem: ops.postMortem,
    rsvpCounts: {
      yes,
      maybe,
      no,
      total: yes + maybe + no,
    },
    myRsvpStatus,
    organizer: organizerIdentity,
  };
}

const createCommunityEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  locationLabel: z.string().trim().min(2).max(255),
  description: z.string().trim().max(2000).optional(),
  capacityTarget: z.number().int().min(1).max(200000).optional(),
});



export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const limit = parsePositiveInteger(
    url.searchParams.get("limit"),
    1,
    300,
    120,
  );
  const supabase = getSupabaseServerClient();

  try {
    const eventsResult = await supabase
      .from("community_events")
      .select(
        "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
      )
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventsResult.error) {
      return handleApiError(eventsResult.error, "GET /api/community/events (query)");
    }

    const events = (eventsResult.data ?? []) as CommunityEventRow[];
    if (events.length === 0) {
      return NextResponse.json({ status: "ok", count: 0, items: [] });
    }

    const eventIds = events.map((event) => event.id);
    const rsvpsResult = await supabase
      .from("event_rsvps")
      .select("event_id, participant_clerk_id, status")
      .in("event_id", eventIds);

    if (rsvpsResult.error) {
      return handleApiError(rsvpsResult.error, "GET /api/community/events (rsvps)");
    }

    const grouped = new Map<string, EventRsvpRow[]>();
    for (const row of (rsvpsResult.data ?? []) as EventRsvpRow[]) {
      const previous = grouped.get(row.event_id) ?? [];
      previous.push(row);
      grouped.set(row.event_id, previous);
    }

    const organizerIds = Array.from(
      new Set(
        events
          .map((event) => event.organizer_clerk_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );
    const clerk = await getClerkService();
    const organizerById = await clerk.resolveUsers(organizerIds);

    const items = events.map((event) => {
      const organizer =
        organizerById.get(event.organizer_clerk_id) ?? {
          userId: null,
          displayName: "Membre",
          roleBadge: getRoleBadge("benevole"),
          profileBadge: getProfileBadge("benevole"),
        };
      return toEventResponseItem(
        event,
        grouped.get(event.id) ?? [],
        userId ?? null,
        organizer,
      );
    });
    return NextResponse.json({ status: "ok", count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = createCommunityEventSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const supabase = getSupabaseServerClient();

  try {
    const quota = await reserveDiscussionMessageSlot(supabase, {
      userId,
      channel: "discussion_event",
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
        description: serializeCommunityEventDescription(
          parsed.data.description ?? null,
          {
            ...defaultCommunityEventOps(),
            capacityTarget: parsed.data.capacityTarget ?? null,
          },
        ),
      })
      .select(
        "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
      )
      .single();

    if (createdResult.error) {
      return handleApiError(createdResult.error, "POST /api/community/events (insert)");
    }
    if (!createdResult.data) {
      return NextResponse.json(
        { error: "Event creation failed - no data returned" },
        { status: 500 },
      );
    }

    // --- Start: In-App Notifications for Local Community ---
    try {
      const eventArrondissement = extractArrondissementFromLabel(parsed.data.locationLabel);
      if (eventArrondissement) {
        const affectedArrondissements = getAffectedArrondissements(eventArrondissement);
        
        // Find users in these arrondissements (excluding the organizer)
        const { data: nearbyProfiles } = await supabase
          .from("profiles")
          .select("id")
          .in("paris_arrondissement", affectedArrondissements)
          .not("id", "eq", userId);

        if (nearbyProfiles && nearbyProfiles.length > 0) {
          const notifications = nearbyProfiles.map((profile) => ({
            user_id: profile.id,
            type: "community",
            title: "Appel au collectif ! 📣",
            content: `Un nouvel événement est organisé près de chez vous : "${parsed.data.title}" (${parsed.data.locationLabel}).`,
            payload: { entityType: "event", id: createdResult.data.id },
          }));

          await supabase.from("app_notifications").insert(notifications);
        }
      }
    } catch (notifError) {
      console.error("[Event Notif] Silent failure:", notifError);
    }
    // --- End: In-App Notifications ---

    return NextResponse.json({ status: "created", item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
