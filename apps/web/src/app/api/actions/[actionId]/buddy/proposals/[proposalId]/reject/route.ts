import { NextResponse } from "next/server";
import { rejectActionBuddyProposal, type ActionBuddyProposalView } from "@/lib/actions/action-buddy";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeActionId } from "@/lib/actions/action-id";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
// Vercel contract: authenticated proposal rejection requires a dynamic private response.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string; proposalId: string }> };

export async function POST(_request: Request, context: Context) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { actionId: rawActionId, proposalId } = await context.params;
    const actionId = normalizeActionId(rawActionId);
    if (!actionId || !proposalId.trim()) {
      return validationErrorResponse({ proposalId: ["Identifiant de proposition manquant."] });
    }
    const result = await rejectActionBuddyProposal(getSupabaseServerClient(true), {
      actionId,
      proposalId: proposalId.trim(),
      requesterUserId: access.userId,
    });
    const proposal: ActionBuddyProposalView = {
      id: result.proposal.id,
      status: result.proposal.status,
    };
    // Vercel contract: rejection state is authenticated and must stay private/no-store.
    return NextResponse.json({ status: "ok", proposal, alreadyDeclined: result.alreadyDeclined }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/[actionId]/buddy/proposals/[proposalId]/reject");
  }
}
