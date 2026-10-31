import { NextResponse } from "next/server";
import { createActionBuddyProposal } from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Vercel contract: authenticated proposal creation requires a dynamic private response.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string; requestId: string }> };

export async function POST(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { actionId: rawActionId, requestId } = await context.params;
    const actionId = normalizeActionId(rawActionId);
    if (!actionId || !requestId.trim()) {
      return validationErrorResponse({ requestId: ["Identifiant de demande manquant."] });
    }
    const proposal = await createActionBuddyProposal(getSupabaseServerClient(true), {
      actionId,
      requestId: requestId.trim(),
      mentorUserId: access.userId,
    });
    // Vercel contract: proposal creation is authenticated state and must stay private/no-store.
    return NextResponse.json({ status: "ok", proposal }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy/requests/[requestId]/proposals");
  }
}
