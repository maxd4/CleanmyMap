import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getCurrentUserIdentity, requireAuthenticatedAccess } from "@/lib/authz";
import { canManageAction } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { canPublishPreAction } from "@/lib/actions/publication";

export const runtime = "nodejs";
// Justification Vercel: la publication dépend de l’action et de l’utilisateur courant.
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const actionId = (await ctx.params).actionId.trim();
  if (!actionId) {
    return NextResponse.json({ error: "Identifiant d'action manquant." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const current = await loadActionById(supabase, actionId);
    if (!current) {
      return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
    }

    const identity = await getCurrentUserIdentity();
    const permissionIdentity = identity
      ? { userId: access.userId, role: identity.role, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      actionId,
      current.created_by_clerk_id,
    );
    if (
      !canManageAction(
        permissionIdentity,
        { createdByClerkId: current.created_by_clerk_id },
        organizerIds,
      )
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à publier cette action." },
        { status: 403 },
      );
    }

    if (current.status === "rejected" || current.status === "cancelled") {
      return NextResponse.json(
        { error: "Cette action est dans un état terminal et ne peut plus être publiée." },
        { status: 422 },
      );
    }

    if (current.published_at) {
      return NextResponse.json({
        status: "published",
        id: current.id,
        publishedAt: current.published_at,
        alreadyPublished: true,
      });
    }
    if (!canPublishPreAction({ actionPhase: current.action_phase, publishedAt: null })) {
      return NextResponse.json(
        { error: "Seule une pré-action peut être publiée depuis ce flux." },
        { status: 422 },
      );
    }

    const publishedAt = new Date().toISOString();
    const result = await supabase
      .from("actions")
      .update({ published_at: publishedAt })
      .eq("id", actionId)
      .eq("created_by_clerk_id", current.created_by_clerk_id)
      .eq("action_phase", "pre_action")
      .is("published_at", null)
      .select("id, published_at")
      .maybeSingle();
    if (result.error) {
      throw result.error;
    }
    if (!result.data) {
      return NextResponse.json(
        { error: "La publication n'a pas pu être confirmée." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      status: "published",
      id: result.data.id,
      publishedAt: result.data.published_at,
      alreadyPublished: false,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/publish");
  }
}
