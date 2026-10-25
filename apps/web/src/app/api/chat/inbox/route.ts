import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import type { DmConversation, ChatUser } from "@/components/chat/chat-types";
import { parseChatRows, parseChatSupabaseResult } from "@/lib/chat/postgrest";
import {
  isDmInboxRuntimeRow,
  type DmInboxRuntimeRow,
} from "@/lib/chat/runtime-contracts";

const markReadSchema = z.object({
  peerId: z.string().trim().min(1).max(256),
});

// Cache/no-store justification: l’inbox DM et son état de lecture sont privés, spécifiques à l’utilisateur et mutables.
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function normalizeConversation(row: DmInboxRuntimeRow): DmConversation {
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
    const rawResult: unknown = await client.supabase.rpc("list_my_dm_conversations");
    const result = parseChatSupabaseResult(rawResult);
    if (result.error) return handleApiError(result.error, "GET /api/chat/inbox");
    const rows = parseChatRows(result.data, isDmInboxRuntimeRow);
    if (!rows) throw new Error("La réponse de l'inbox DM est invalide.");

    return NextResponse.json(
      {
        conversations: rows.map(normalizeConversation),
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
    const rawResult: unknown = await client.supabase.rpc(
      "mark_my_dm_conversation_read",
      { p_peer_id: parsed.data.peerId },
    );
    const result = parseChatSupabaseResult(rawResult);
    if (result.error) return handleApiError(result.error, "PATCH /api/chat/inbox");
    if (typeof result.data !== "string") {
      throw new Error("La réponse de marquage de lecture est invalide.");
    }

    return NextResponse.json(
      {
        status: "read",
        peerId: parsed.data.peerId,
        lastReadAt: result.data,
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "PATCH /api/chat/inbox");
  }
}
