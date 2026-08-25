import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import type { DmConversation, ChatUser } from "@/components/chat/chat-types";

type DmInboxRow = {
  peer_id: string;
  peer_display_name: string | null;
  peer_handle: string | null;
  peer_avatar_url: string | null;
  last_message_id: string;
  last_message_content: string;
  last_message_created_at: string;
  last_message_sender_id: string;
  last_message_direction: "sent" | "received";
  unread_count: number | string | null;
};

const markReadSchema = z.object({
  peerId: z.string().trim().min(1).max(256),
});

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function normalizeConversation(row: DmInboxRow): DmConversation {
  const peer: ChatUser = {
    id: row.peer_id,
    display_name: row.peer_display_name?.trim() || row.peer_handle?.trim() || "Membre",
    handle: row.peer_handle?.trim() || row.peer_id,
    avatar_url: row.peer_avatar_url,
  };

  return {
    peer,
    lastMessage: {
      id: row.last_message_id,
      content: row.last_message_content,
      createdAt: row.last_message_created_at,
      senderId: row.last_message_sender_id,
      direction: row.last_message_direction === "sent" ? "sent" : "received",
    },
    unreadCount: Math.max(0, Number(row.unread_count ?? 0) || 0),
  };
}

async function getAuthenticatedRlsClient() {
  const { userId } = await auth();
  if (!userId) {
    return { response: unauthorizedJsonResponse() } as const;
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return { response: unauthorizedJsonResponse() } as const;
  }

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return {
      response: NextResponse.json(
        {
          error: "Connexion sécurisée indisponible",
          hint:
            "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
        },
        { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
      ),
    } as const;
  }

  return { supabase } as const;
}

export async function GET() {
  const client = await getAuthenticatedRlsClient();
  if ("response" in client) {
    return client.response;
  }

  try {
    const { data, error } = await client.supabase.rpc("list_my_dm_conversations");
    if (error) {
      return handleApiError(error, "GET /api/chat/inbox");
    }

    return NextResponse.json(
      {
        conversations: ((data ?? []) as DmInboxRow[]).map(normalizeConversation),
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/chat/inbox");
  }
}

export async function PATCH(request: Request) {
  const client = await getAuthenticatedRlsClient();
  if ("response" in client) {
    return client.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = markReadSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const { data, error } = await client.supabase.rpc(
      "mark_my_dm_conversation_read",
      { p_peer_id: parsed.data.peerId },
    );
    if (error) {
      return handleApiError(error, "PATCH /api/chat/inbox");
    }

    return NextResponse.json(
      {
        status: "read",
        peerId: parsed.data.peerId,
        lastReadAt: data,
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/chat/inbox");
  }
}
