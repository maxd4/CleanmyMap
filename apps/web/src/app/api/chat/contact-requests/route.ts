import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getPublicActionShareKind,
  buildPublicActionReference,
} from "@/lib/chat/action-sharing";
import { respondToActionShareRequest } from "@/lib/chat/action-share-requests";
import { loadActionById } from "@/lib/actions/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: les demandes sont privées, liées à l’identité courante et leur état peut changer à tout moment.
export const dynamic = "force-dynamic";

// Justification Vercel: la liste et les décisions de demandes ne doivent jamais être servies depuis un cache partagé.
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

const decisionSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["accept", "reject", "ignore"]),
});

type ContactRequestRow = {
  request_id: string;
  created_at: string;
  sender_id: string;
  sender_display_name: string | null;
  sender_handle: string | null;
  sender_avatar_url: string | null;
  action_id: string;
  content: string;
};

async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const identity = await getCurrentUserIdentity();
  return identity ? { userId } : null;
}

export async function GET() {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return unauthorizedJsonResponse();

  try {
    const supabase = getSupabaseServerClient(true);
    const { data, error } = await supabase.rpc(
      "list_action_share_requests_for_recipient",
      { p_recipient_id: currentUser.userId },
    );
    if (error) return handleApiError(error, "GET /api/chat/contact-requests");

    const rows = (data ?? []) as ContactRequestRow[];
    const requests = (
      await Promise.all(
        rows.map(async (row) => {
          const action = await loadActionById(supabase, row.action_id);
          if (!action || !getPublicActionShareKind(action)) return null;
          return {
            id: row.request_id,
            createdAt: row.created_at,
            message: row.content,
            sender: {
              id: row.sender_id,
              display_name: row.sender_display_name?.trim() || "Membre",
              handle: row.sender_handle?.trim() || row.sender_id,
              avatar_url: row.sender_avatar_url,
            },
            action: buildPublicActionReference(action),
          };
        }),
      )
    ).filter((request): request is NonNullable<typeof request> => request !== null);

    return NextResponse.json({ requests }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, "GET /api/chat/contact-requests");
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await respondToActionShareRequest(getSupabaseServerClient(true), {
      requestId: parsed.data.requestId,
      recipientId: currentUser.userId,
      decision: parsed.data.decision,
    });

    if (result.status === "unavailable") {
      return NextResponse.json(
        { error: "Action non disponible", status: result.status },
        { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(result, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, "PATCH /api/chat/contact-requests");
  }
}
