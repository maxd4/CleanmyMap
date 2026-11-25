import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { reserveDiscussionMessageSlot, toDiscussionRateLimitErrorPayload } from "@/lib/community/discussion-rate-limit";
import { spogomiDirectorySchema, spogomiEventSchema, spogomiReadSchema, spogomiSendSchema, spogomiThreadSchema, isSpogomiRoomWritable } from "@/lib/chat/spogomi-chat-contract";

const reply = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "private, no-store" },
});
const unavailable = () => reply({ error: "Discussion indisponible." }, 404);
const failure = () => reply({ error: "Messagerie temporairement indisponible." }, 503);

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return reply({ error: "Connexion requise." }, 401);
  const identity = await getCurrentUserIdentity({ userId, syncActiveRole: true });
  if (!identity) return reply({ error: "Connexion requise." }, 401);
  const params = new URL(request.url).searchParams;
  const db = getSupabaseServerClient(true);
  if (!params.has("eventId")) {
    const cursor = z.string().uuid().nullable().safeParse(params.get("after"));
    if (!cursor.success) return reply({ error: "Curseur invalide." }, 400);
    const result = await db.rpc("list_spogomi_chat_events_for_server", { p_actor: userId, p_after: cursor.data });
    if (result.error) return failure();
    const parsed = spogomiDirectorySchema.safeParse(result.data);
    return parsed.success ? reply(parsed.data) : failure();
  }
  const parsed = spogomiReadSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return reply({ error: "Paramètres invalides." }, 400);
  const { eventId, room, beforeAt, beforeId, q } = parsed.data;
  const result = await db.rpc("read_spogomi_chat_room_for_server", {
    p_actor: userId, p_event: eventId, p_room: room,
    p_before_at: beforeAt ?? null, p_before_id: beforeId ?? null, p_query: q ?? null,
  });
  if (result.error) return failure();
  if (result.data === null) return unavailable();
  const thread = spogomiThreadSchema.safeParse(result.data);
  return thread.success ? reply(thread.data) : failure();
}

export async function POST(request: Request) {
  const limit = await verifyRateLimit(request, { limit: 20, window: 60 });
  const limited = createServerRateLimitResponse(limit.allowed, limit.retryAfter, limit);
  if (limited) return limited;
  const { userId } = await auth();
  if (!userId) return reply({ error: "Connexion requise." }, 401);
  const identity = await getCurrentUserIdentity({ userId, syncActiveRole: true });
  if (!identity) return reply({ error: "Connexion requise." }, 401);
  const parsed = spogomiSendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Message invalide." }, 400);
  const { eventId, room, content } = parsed.data;
  const db = getSupabaseServerClient(true);
  const access = await db.rpc("spogomi_chat_event_for_server", { p_actor: userId, p_event: eventId });
  if (access.error) return failure();
  if (access.data === null) return unavailable();
  const event = spogomiEventSchema.safeParse(access.data);
  if (!event.success) return failure();
  if (!isSpogomiRoomWritable(event.data)) return reply({ error: "Discussion en lecture seule." }, 403);
  const quota = await reserveDiscussionMessageSlot(db, { userId, channel: "discussion_event" });
  if (!quota.allowed) return reply(toDiscussionRateLimitErrorPayload(quota), 429);
  const sent = await db.rpc("send_spogomi_chat_message_for_server", {
    p_actor: userId, p_event: eventId, p_room: room, p_content: content,
  });
  if (sent.error) return failure();
  if (sent.data === null) return unavailable();
  const id = z.string().uuid().safeParse(sent.data);
  return id.success ? reply({ id: id.data }, 201) : failure();
}
