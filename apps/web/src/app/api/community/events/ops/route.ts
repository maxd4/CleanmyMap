import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { trackCommunityOpsUpdate } from "@/lib/gamification/progression";
import {
  defaultCommunityEventOps,
  mergeCommunityEventOps,
  parseCommunityEventDescription,
  serializeCommunityEventDescription,
} from "@/lib/community/event-ops";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

const updateEventOpsSchema = z.object({
  eventId: z.string().trim().min(1),
  capacityTarget: z.number().int().min(1).max(200000).nullable().optional(),
  attendanceCount: z.number().int().min(0).max(200000).nullable().optional(),
  postMortem: z.string().trim().max(6000).nullable().optional(),
});

type CommunityEventRow = {
  id: string;
  created_at: string;
  organizer_clerk_id: string;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

type EventRsvpRow = {
  event_id: string;
  status: "yes" | "maybe" | "no";
  participant_clerk_id: string;
};

function toEventResponseItem(
  event: CommunityEventRow,
  rsvps: EventRsvpRow[],
  userId: string | null,
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
    organizerClerkId: event.organizer_clerk_id,
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
  };
}

export async function POST(request: Request) {
  const adminAccess = await requireAdminAccess();
  const { userId } = await auth();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = updateEventOpsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const eventResult = await supabase
    .from("community_events")
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
    )
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  if (eventResult.error) {
    return NextResponse.json(
      { error: eventResult.error.message },
      { status: 500 },
    );
  }
  if (!eventResult.data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const isOrganizer = eventResult.data.organizer_clerk_id === userId;
  if (!isOrganizer && !adminAccess.ok) {
    return adminAccessErrorJsonResponse(adminAccess);
  }

  const parsedDescription = parseCommunityEventDescription(
    eventResult.data.description,
  );
  const mergedOps = mergeCommunityEventOps(parsedDescription.ops, {
    capacityTarget: parsed.data.capacityTarget,
    attendanceCount: parsed.data.attendanceCount,
    postMortem: parsed.data.postMortem,
  });
  const description = serializeCommunityEventDescription(
    parsedDescription.plainDescription,
    mergedOps,
  );

  const updated = await supabase
    .from("community_events")
    .update({ description })
    .eq("id", parsed.data.eventId)
    .select(
      "id, created_at, organizer_clerk_id, title, event_date, location_label, description",
    )
    .single();

  if (updated.error) {
    return NextResponse.json({ error: updated.error.message }, { status: 500 });
  }

  const rsvpsResult = await supabase
    .from("event_rsvps")
    .select("event_id, participant_clerk_id, status")
    .eq("event_id", parsed.data.eventId);

  if (rsvpsResult.error) {
    return NextResponse.json(
      { error: rsvpsResult.error.message },
      { status: 500 },
    );
  }

  const item = toEventResponseItem(
    updated.data as CommunityEventRow,
    (rsvpsResult.data ?? []) as EventRsvpRow[],
    userId,
  );

  if (userId) {
    try {
      await trackCommunityOpsUpdate(supabase, {
        userId,
        eventId: parsed.data.eventId,
        attendanceCount: item.attendanceCount,
        hasPostMortem: (item.postMortem ?? "").trim().length >= 20,
      });
    } catch (progressionError) {
      console.error("Progression tracking failed for community ops update", {
        userId,
        eventId: parsed.data.eventId,
        message:
          progressionError instanceof Error
            ? progressionError.message
            : String(progressionError),
      });
    }
  }

  return NextResponse.json({ status: "ok", item });
}
