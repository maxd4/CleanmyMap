import { NextResponse } from "next/server";
import { acceptActionBuddyProposal } from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { BUDDY_PRIVATE_HEADERS, resolveBuddyResourceParams, type BuddyResourceContext } from "../../../route.shared";

export const runtime = "nodejs";
// Vercel contract: authenticated proposal acceptance requires a dynamic private response.
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: BuddyResourceContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const resolved = await resolveBuddyResourceParams(context, "proposalId");
    if ("status" in resolved) return resolved;
    const { actionId, resourceId: proposalId } = resolved;
    const result = await acceptActionBuddyProposal(getSupabaseServerClient(true), {
      actionId,
      proposalId,
      requesterUserId: access.userId,
    });
    // Vercel contract: acceptance state is authenticated and must stay private/no-store.
    return NextResponse.json({ status: "ok", ...result }, { headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy/proposals/[proposalId]/accept");
  }
}
