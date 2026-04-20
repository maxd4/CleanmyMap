import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { reserveDiscussionMessageSlot, toDiscussionRateLimitErrorPayload } from "@/lib/community/discussion-rate-limit";

const sendMessageSchema = z.object({
  channelType: z.enum(["dm", "neighborhood", "governance", "executive"]),
  content: z.string().min(1).max(2000),
  recipientId: z.string().optional(), // For DMs
  arrondissementId: z.number().int().min(1).max(20).optional(), // For neighborhood
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const supabase = getSupabaseServerClient();
  const adminSupabase = getSupabaseAdminClient();

  try {
    // 1. Rate Limiting
    const quota = await reserveDiscussionMessageSlot(supabase, {
      userId,
      channel: "discussion_event", // Reusing the slot logic
    });
    if (!quota.allowed) {
      return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
    }

    // 2. Mention Detection & Notifications
    const mentions = parsed.data.content.match(/@([a-z0-9_]+)/g);
    if (mentions) {
      const handles = mentions.map(m => m.slice(1));
      const { data: mentionedProfiles } = await adminSupabase
        .from("profiles")
        .select("id, display_name")
        .in("handle", handles);

      if (mentionedProfiles && mentionedProfiles.length > 0) {
        const notifications = mentionedProfiles
          .filter(p => p.id !== userId)
          .map(p => ({
            user_id: p.id,
            type: "community",
            title: "Vous avez été tagué ! ✉️",
            content: `Un membre vous a mentionné dans une discussion.`,
            payload: { fromId: userId, channelType: parsed.data.channelType },
          }));
        
        if (notifications.length > 0) {
          await adminSupabase.from("app_notifications").insert(notifications);
        }
      }
    }

    // 3. Save Message
    const { data: message, error } = await supabase
      .from("app_messages")
      .insert({
        sender_id: userId,
        recipient_id: parsed.data.recipientId,
        channel_type: parsed.data.channelType,
        arrondissement_id: parsed.data.arrondissementId,
        content: parsed.data.content,
        attachment_url: parsed.data.attachmentUrl,
        attachment_type: parsed.data.attachmentType,
        attachment_expires_at: parsed.data.attachmentUrl ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      .select("*, sender:profiles!sender_id(display_name, handle, avatar_url)")
      .single();

    if (error) return handleApiError(error, "POST /api/chat (insert)");

    // 4. Background Pruning (Periodic)
    // To keep the free tier clean, we run the pruning logic occasionally on POST
    if (Math.random() < 0.1) { // 10% chance per message to trigger pruning
      try {
        await adminSupabase.rpc("prune_old_messages");
      } catch (pruneErr) {
        console.error("[Pruning] Failed:", pruneErr);
      }
    }

    return NextResponse.json({ status: "sent", message }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const { searchParams } = new URL(request.url);
  const channelType = searchParams.get("channelType");
  const arrondissementId = searchParams.get("arrondissementId");
  const recipientId = searchParams.get("recipientId");

  const supabase = getSupabaseServerClient();
  
  let query = supabase
    .from("app_messages")
    .select("*, sender:profiles!sender_id(display_name, handle, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (channelType) query = query.eq("channel_type", channelType);
  if (arrondissementId) query = query.eq("arrondissement_id", parseInt(arrondissementId, 10));
  if (recipientId) {
    // For DMs, we need to handle the dual participants logic
    // But RLS already protects this, so we just filter for the specific partner
    query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`);
  }

  const { data, error } = await query;
  if (error) return handleApiError(error, "GET /api/chat");

  return NextResponse.json({ messages: data.reverse() });
}
