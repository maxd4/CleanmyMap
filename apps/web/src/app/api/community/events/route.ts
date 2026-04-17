import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  defaultCommunityEventOps,
  parseCommunityEventDescription,
  serializeCommunityEventDescription,
} from "@/lib/community/event-ops";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

const createCommunityEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  locationLabel: z.string().trim().min(2).max(255),
  description: z.string().trim().max(2000).optional(),
  capacityTarget: z.number().int().min(1).max(200000).optional(),
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
  participant_clerk_id: string;
  status: "yes" | "maybe" | "no";
};

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
  };
}

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
      return NextResponse.json(
        { error: eventsResult.error.message },
        { status: 500 },
      );
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
      return NextResponse.json(
        { error: rsvpsResult.error.message },
        { status: 500 },
      );
    }

    const grouped = new Map<string, EventRsvpRow[]>();
    for (const row of (rsvpsResult.data ?? []) as EventRsvpRow[]) {
      const previous = grouped.get(row.event_id) ?? [];
      previous.push(row);
      grouped.set(row.event_id, previous);
    }

    const items = events.map((event) =>
      toEventResponseItem(event, grouped.get(event.id) ?? [], userId ?? null),
    );
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
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  try {
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
      return NextResponse.json(
        { error: createdResult.error.message },
        { status: 500 },
      );
    }

    const item = toEventResponseItem(
      createdResult.data as CommunityEventRow,
      [],
      userId,
    );
    return NextResponse.json({ status: "created", item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
