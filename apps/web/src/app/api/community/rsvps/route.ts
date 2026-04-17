import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

const communityRsvpSchema = z.object({
  eventId: z.string().trim().min(1),
  status: z.enum(["yes", "maybe", "no"]),
});

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

  const parsed = communityRsvpSchema.safeParse(payload);
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
    const upsertedResult = await supabase
      .from("event_rsvps")
      .upsert(
        {
          event_id: parsed.data.eventId,
          participant_clerk_id: userId,
          status: parsed.data.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,participant_clerk_id" },
      )
      .select("event_id, participant_clerk_id, status, updated_at")
      .single();

    if (upsertedResult.error) {
      if (upsertedResult.error.code === "23503") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: upsertedResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "ok",
      item: {
        eventId: upsertedResult.data.event_id,
        participantClerkId: upsertedResult.data.participant_clerk_id,
        rsvpStatus: upsertedResult.data.status,
        updatedAt: upsertedResult.data.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
