import { NextResponse } from "next/server";
import { createActionBuddyProposal } from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { BUDDY_PRIVATE_HEADERS, resolveBuddyResourceParams, type BuddyResourceContext } from "../../../route.shared";

export const runtime = "nodejs";
// Vercel contract: authenticated proposal creation requires a dynamic private response.
export const dynamic = "force-dynamic";
// Vercel cache justification: authenticated proposal responses contain private
// state and use no-store; they must not be shared.

export async function POST(_request: Request, context: BuddyResourceContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const resolved = await resolveBuddyResourceParams(context, "requestId");
    if ("status" in resolved) return resolved;
    const { actionId, resourceId: requestId } = resolved;
    const proposal = await createActionBuddyProposal(getSupabaseServerClient(true), {
      actionId,
      requestId,
      mentorUserId: access.userId,
    });
    // Vercel contract: proposal creation is authenticated state and must stay private/no-store.
    return NextResponse.json({ status: "ok", proposal }, { status: 201, headers: BUDDY_PRIVATE_HEADERS });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy/requests/[requestId]/proposals");
  }
}
