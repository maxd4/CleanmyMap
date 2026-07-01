import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { isAdminLikeProfile } from "@/lib/profiles";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "@/lib/actions/metadata";
import {
  cancelActionParticipation,
  loadActionParticipationReviews,
  reviewActionParticipation,
} from "@/lib/actions/group-participation";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";

export const runtime = "nodejs";
// Justification Vercel: la jonction est resolue par action et par utilisateur, donc pas de cache.
export const dynamic = "force-dynamic";

const toggleSchema = z.object({
  groupJoinEnabled: z.boolean(),
});

const reviewSchema = z.object({
  participantId: z.string().trim().min(1),
  decision: z.enum(["accept", "reject"]),
});

async function resolveGroupJoinUserId(operation: string): Promise<string | null> {
  try {
    const session = await auth();
    return session.userId ?? null;
  } catch (error) {
    console.warn(`[group-join] Clerk auth unavailable during ${operation}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function resolveReviewerAccess(params: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  userId: string;
  creatorUserId?: string | null;
}) {
  const identity = await getCurrentUserIdentity();
  if (identity && isAdminLikeProfile(identity.role)) {
    return { ok: true as const, identity };
  }

  const organizerIds = await loadActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
    null,
  );

  if (organizerIds.includes(params.userId)) {
    return {
      ok: true as const,
      identity,
    };
  }

  if (
    typeof params.creatorUserId === "string" &&
    params.creatorUserId.trim().length > 0 &&
    params.creatorUserId.trim() === params.userId
  ) {
    return {
      ok: true as const,
      identity,
    };
  }

  return { ok: false as const };
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const userId = await resolveGroupJoinUserId("PATCH /api/actions/:actionId/group-join");
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = toggleSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

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
      notes: string | null;
    }>(supabase, (query) =>
      query.select("id, created_by_clerk_id, status, notes").eq("id", trimmedActionId).maybeSingle(),
    );

    if (!actionResult) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    if (actionResult.status !== "approved") {
      return validationErrorResponse({
        actionId: [
          "Le formulaire ne peut être modifié qu'après validation.",
        ],
      });
    }

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      userId,
      creatorUserId: actionResult.created_by_clerk_id,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce formulaire." },
        { status: 403 },
      );
    }

    const updatedNotes = setActionGroupJoinEnabledInNotes(
      actionResult.notes,
      parsed.data.groupJoinEnabled,
    );

    const updateResult = await supabase
      .from("actions")
      .update({
        notes: updatedNotes,
      })
      .eq("id", trimmedActionId)
      .select("id, notes")
      .single();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    const updatedMetadata = extractActionMetadataFromNotes(
      updateResult.data?.notes ?? updatedNotes,
    );

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      groupJoinEnabled: updatedMetadata.groupJoinEnabled,
    });
  } catch (error) {
    return handleApiError(error, "PATCH /api/actions/:actionId/group-join");
  }
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const userId = await resolveGroupJoinUserId("GET /api/actions/:actionId/group-join");

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
      notes: string | null;
    }>(supabase, (query) =>
      query
        .select("id, created_by_clerk_id, status, notes")
        .eq("id", trimmedActionId)
        .maybeSingle(),
    );

    if (!actionResult || actionResult.status !== "approved") {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const access = userId
      ? await resolveReviewerAccess({
          supabase,
          actionId: trimmedActionId,
          userId,
          creatorUserId: actionResult.created_by_clerk_id,
        })
      : { ok: false as const };

    const pendingRequests = await loadActionParticipationReviews(supabase, {
      actionId: trimmedActionId,
      limit: 50,
    });

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      count: pendingRequests.length,
      pendingRequests,
      canReview: Boolean(access.ok),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId/group-join");
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const userId = await resolveGroupJoinUserId("POST /api/actions/:actionId/group-join");
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

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
      notes: string | null;
    }>(supabase, (query) =>
      query
        .select("id, created_by_clerk_id, status, notes")
        .eq("id", trimmedActionId)
        .maybeSingle(),
    );

    if (!actionResult || actionResult.status !== "approved") {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      userId,
      creatorUserId: actionResult.created_by_clerk_id,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modérer cette file." },
        { status: 403 },
      );
    }

    const result = await reviewActionParticipation(supabase, {
      actionId: trimmedActionId,
      participantId: parsed.data.participantId,
      decision: parsed.data.decision,
    });

    if (parsed.data.decision === "accept") {
      await refreshProgressionProfile(supabase, result.participantUserId).catch(() => null);
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      participantId: parsed.data.participantId,
      decision: parsed.data.decision,
      participationStatus: result.participationStatus,
      participationSource: result.participationSource,
      joinedAt: result.joinedAt,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        return NextResponse.json(
          { error: "Demande introuvable." },
          { status: 404 },
        );
      }
      if (error.name === "ValidationError") {
        return validationErrorResponse({
          participantId: [error.message],
        });
      }
    }

    return handleApiError(error, "POST /api/actions/:actionId/group-join");
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const userId = await resolveGroupJoinUserId("DELETE /api/actions/:actionId/group-join");
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const result = await cancelActionParticipation(supabase, {
      actionId: trimmedActionId,
      userId,
    });

    await refreshProgressionProfile(supabase, userId).catch(() => null);

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      alreadyCancelled: result.alreadyCancelled,
      joinedAt: result.joinedAt,
      participationStatus: result.participationStatus,
      participationSource: result.participationSource,
      participationUpdatedAt: result.participationUpdatedAt,
      participantsCount: result.participantsCount,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json(
        { error: "Participation introuvable." },
        { status: 404 },
      );
    }

    return handleApiError(error, "DELETE /api/actions/:actionId/group-join");
  }
}
