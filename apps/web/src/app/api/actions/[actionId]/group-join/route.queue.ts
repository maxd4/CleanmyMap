import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  loadActionParticipationReviews,
  searchActionParticipationCandidates,
} from "@/lib/actions/participation/group-participation";
import {
  type GroupJoinRouteContext,
  type ReviewerAccessResolver,
  searchSchema,
} from "./route.shared";

export async function handleGroupJoinQueue(
  request: Request,
  ctx: GroupJoinRouteContext,
  params: {
    userId: string | null;
    resolveReviewerAccess: ReviewerAccessResolver;
  },
) {
  const { userId, resolveReviewerAccess } = params;
  const url = new URL(request.url);
  const searchParsed = searchSchema.safeParse({
    q: url.searchParams.get("q"),
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const actionResult = await runSingleActionQuery<{
      id: string;
      created_by_clerk_id: string | null;
      status: "pending" | "approved" | "rejected";
      action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
      notes: string | null;
    }>(supabase, (query) =>
      query
        .select("id, created_by_clerk_id, status, action_phase, notes")
        .eq("id", trimmedActionId)
        .maybeSingle(),
    );

    if (!actionResult || (actionResult.status !== "approved" && actionResult.action_phase !== "pre_action")) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const access = userId
      ? await resolveReviewerAccess({
          supabase,
          actionId: trimmedActionId,
          creatorUserId: actionResult.created_by_clerk_id,
          actorUserId: userId,
        })
      : { ok: false as const };

    if (searchParsed.success && searchParsed.data.q.length > 0) {
      if (!access.ok) {
        return NextResponse.json(
          { error: "Vous n'êtes pas autorisé à rechercher des comptes." },
          { status: 403 },
        );
      }

      const items = await searchActionParticipationCandidates(
        supabase,
        searchParsed.data.q,
        searchParsed.data.limit,
      );

      return NextResponse.json({
        status: "ok",
        mode: "search",
        canReview: true,
        count: items.length,
        items,
      });
    }

    const pendingRequests = access.ok
      ? await loadActionParticipationReviews(supabase, {
          actionId: trimmedActionId,
          limit: 50,
          statuses: ["pending"],
        })
      : [];
    const confirmedParticipants = access.ok
      ? await loadActionParticipationReviews(supabase, {
          actionId: trimmedActionId,
          limit: 50,
          statuses: ["confirmed"],
        })
      : [];

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      count: pendingRequests.length,
      pendingRequests,
      confirmedParticipants,
      canReview: Boolean(access.ok),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/group-join");
  }
}
