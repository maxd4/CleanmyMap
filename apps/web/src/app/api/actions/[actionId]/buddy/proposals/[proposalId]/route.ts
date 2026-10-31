import { NextResponse } from "next/server";
import { withdrawActionBuddyProposal } from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { BUDDY_PRIVATE_HEADERS, resolveBuddyResourceParams, type BuddyResourceContext } from "../../route.shared";

export const runtime = "nodejs";
// Vercel contract: authenticated proposal state requires a dynamic private response.
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: BuddyResourceContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const resolved = await resolveBuddyResourceParams(context, "proposalId");
    if ("status" in resolved) return resolved;
    const { actionId, resourceId: proposalId } = resolved;
    const result = await withdrawActionBuddyProposal(getSupabaseServerClient(true), {
      actionId,
      proposalId,
      mentorUserId: access.userId,
    });
    // Vercel contract: proposal state is authenticated and must stay private/no-store.
    return NextResponse.json({ status: "ok", ...result }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "DELETE /api/actions/[actionId]/buddy/proposals/[proposalId]");
  }
}
