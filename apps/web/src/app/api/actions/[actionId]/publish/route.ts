import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction } from "@/lib/actions/permissions";
import { canPublishPreAction } from "@/lib/actions/publication";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { publishPreActionCanonical } from "@/lib/actions/publish-pre-action";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";

export const runtime = "nodejs";
// Justification Vercel: la publication dépend de l’action et de l’utilisateur courant.
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireActionRequestAccess(request);
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

    const identity = await getCurrentUserIdentity({ userId: access.userId });
    const permissionIdentity = identity?.userId === access.userId
      ? { userId: access.userId, role: identity.role, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
      supabase,
      actionId,
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

    if (
      !current.published_at &&
      !canPublishPreAction({ actionPhase: current.action_phase, publishedAt: null })
    ) {
      return NextResponse.json(
        { error: "Seule une pré-action peut être publiée depuis ce flux." },
        { status: 422 },
      );
    }

    const result = await publishPreActionCanonical({
      supabase,
      current,
      actionId,
      userId: access.userId,
      organizerIds,
    });

    switch (result.status) {
      case "terminal_state":
        return NextResponse.json(
          { error: "Cette action est dans un état terminal et ne peut plus être publiée." },
          { status: 422 },
        );
      case "formality_blocked":
        return NextResponse.json(
          {
            error: "Une formalité démontrée comme requise doit être déclarée envoyée avant la publication.",
            code: "required_formality_not_ready",
            formalityIds: result.blockedFormalityIds,
          },
          { status: 422 },
        );
      case "pending_review":
        return NextResponse.json(
          {
            status: "pending_review",
            id: result.id,
            publishedAt: null,
            alreadyPublished: false,
            reviewState: result.reviewState,
          },
          { status: 202 },
        );
      case "not_publishable":
        return NextResponse.json(
          { error: "Seule une pré-action peut être publiée depuis ce flux." },
          { status: 422 },
        );
      case "spontaneous_organizer_required":
        return NextResponse.json(
          { error: "Sélectionnez un compte utilisateur organisateur avant de publier cette action." },
          { status: 422 },
        );
      case "mandate_revoked":
      case "suppressed":
      case "conflict":
      case "already_decided":
      case "not_required":
        return NextResponse.json(
          { error: "La publication n'a pas pu être confirmée.", code: "state_conflict" },
          { status: 409 },
        );
      case "not_found":
        return NextResponse.json(
          { error: "Action introuvable.", code: "not_found" },
          { status: 404 },
        );
      case "review_error":
        return NextResponse.json(
          { error: "La soumission à la modération associative a échoué.", code: "review_error" },
          { status: 422 },
        );
      case "published":
        return NextResponse.json({
          status: "published",
          id: result.id,
          publishedAt: result.publishedAt,
          alreadyPublished: result.alreadyPublished,
          ...(result.reviewState ? { reviewState: result.reviewState } : {}),
        });
    }
  } catch (error) {
    return handleApiError(error, "POST /api/actions/:actionId/publish");
  }
}
