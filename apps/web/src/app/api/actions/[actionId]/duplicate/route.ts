import { NextResponse } from "next/server";
import { canManageAction } from "@/lib/actions/permissions";
import { buildActionDuplicatePrefill } from "@/lib/actions/action-duplication";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { loadActionById } from "@/lib/actions/store";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DuplicateRouteContext = { params: Promise<{ actionId: string }> };

export async function GET(_request: Request, context: DuplicateRouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  try {
    const { actionId } = await context.params;
    const normalizedActionId = actionId.trim();
    if (!normalizedActionId) return NextResponse.json({ error: "Identifiant d'action manquant." }, { status: 400 });
    const supabase = getSupabaseServerClient(true);
    const action = await loadActionById(supabase, normalizedActionId);
    if (!action) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    if (action.status === "cancelled" || action.status === "rejected") {
      return NextResponse.json({ error: "Cette action terminale ne peut pas être réutilisée." }, { status: 409 });
    }
    const identity = await getCurrentUserIdentity();
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, normalizedActionId);
    const permissionIdentity = identity ? { userId: access.userId, role: identity.role, activeRole: identity.activeRole } : null;
    if (!canManageAction(permissionIdentity, { createdByClerkId: action.created_by_clerk_id }, organizerIds)) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à réutiliser cette action." }, { status: 403 });
    }
    return NextResponse.json({ status: "ok", prefill: buildActionDuplicatePrefill(action) });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/duplicate");
  }
}
