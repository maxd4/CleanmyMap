import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canReviewActionParticipants,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import {
  appendActionModerationAudit,
  normalizeModerationReason,
} from "@/lib/actions/moderation-audit";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/organizers";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "@/lib/actions/metadata";
import {
  addActionParticipationByAdmin,
  cancelActionParticipation,
  loadActionParticipationReviews,
  reviewActionParticipation,
  searchActionParticipationCandidates,
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
  reason: z.string().trim().max(500).optional(),
});

const addParticipantSchema = z.object({
  participantUserId: z.string().trim().min(1),
  reason: z.string().trim().max(500).optional(),
});

const searchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(12).default(8),
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
  creatorUserId?: string | null;
  actorUserId: string;
}) {
  const identity = await getCurrentUserIdentity();
  if (canUseAdminOverride(identity)) {
    return {
      ok: true as const,
      identity,
    };
  }

  const permissionIdentity = {
    userId: params.actorUserId,
    role: identity?.role ?? null,
  };
  const organizerIds = await loadActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
    null,
  );
  if (
    canReviewActionParticipants(
      permissionIdentity,
      { createdByClerkId: params.creatorUserId },
      organizerIds,
    )
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
      action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
      notes: string | null;
    }>(supabase, (query) =>
      query.select("id, created_by_clerk_id, status, action_phase, notes").eq("id", trimmedActionId).maybeSingle(),
    );

    if (!actionResult) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    if (actionResult.status !== "approved" && actionResult.action_phase !== "pre_action") {
      return validationErrorResponse({
        actionId: [
          "Le formulaire ne peut être modifié qu'en pré-action ou après validation.",
        ],
      });
    }

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      creatorUserId: actionResult.created_by_clerk_id,
      actorUserId: userId,
    });
    const actorUserId = access.identity?.userId ?? userId;

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

    if (
      access.identity &&
      canUseAdminOverride(access.identity) &&
      access.identity.userId !== actionResult.created_by_clerk_id
    ) {
      await appendActionModerationAudit({
        operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
        actorUserId,
        targetActionId: trimmedActionId,
        operation: "toggle_group_join",
        outcome: "success",
        details: {
          groupJoinEnabled: updatedMetadata.groupJoinEnabled,
        },
      });
    }

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
  const url = new URL(_request.url);
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

  const parsed = z.union([reviewSchema, addParticipantSchema]).safeParse(payload);
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

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      creatorUserId: actionResult.created_by_clerk_id,
      actorUserId: userId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modérer cette file." },
        { status: 403 },
      );
    }

    const adminOverrideOperation =
      access.identity && canUseAdminOverride(access.identity)
        ? "participantUserId" in parsed.data
          ? "admin_add_participant"
          : parsed.data.decision === "reject"
            ? "admin_review_reject"
            : null
        : null;
    const reason = normalizeModerationReason(parsed.data.reason, {
      required: Boolean(adminOverrideOperation),
    });
    if (adminOverrideOperation && !reason) {
      return NextResponse.json(
        {
          error:
            "Un motif d'au moins 5 caractères est requis pour cette opération de modération.",
        },
        { status: 400 },
      );
    }

    const result =
      "participantUserId" in parsed.data
        ? await addActionParticipationByAdmin(supabase, {
            actionId: trimmedActionId,
            targetUserId: parsed.data.participantUserId,
          })
        : await reviewActionParticipation(supabase, {
            actionId: trimmedActionId,
            participantId: parsed.data.participantId,
            decision: parsed.data.decision,
          });

    if (
      "participantUserId" in parsed.data ||
      parsed.data.decision === "accept"
    ) {
      await refreshProgressionProfile(
        supabase,
        result.participantUserId,
      ).catch(() => null);
    }

    if (access.identity && canUseAdminOverride(access.identity)) {
      const actorUserId = access.identity?.userId ?? userId;
      await appendActionModerationAudit({
        operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
        actorUserId,
        targetActionId: trimmedActionId,
        operation:
          "participantUserId" in parsed.data
            ? "admin_add_participant"
            : parsed.data.decision === "reject" &&
                result.previousValue?.participationStatus === "confirmed"
              ? "admin_remove_participant"
            : `admin_review_${parsed.data.decision}`,
        outcome: "success",
        reason,
        previousValue: result.previousValue,
        newValue: result.newValue,
        targetUserId: result.participantUserId,
        details: {
          participantUserId: result.participantUserId,
          participationStatus: result.participationStatus,
          participationSource: result.participationSource,
          decision: "decision" in parsed.data ? parsed.data.decision : "accept",
        },
      });
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      participantId:
        "participantId" in parsed.data
          ? parsed.data.participantId
          : result.participantUserId,
      participantUserId: result.participantUserId,
      decision:
        "decision" in parsed.data ? parsed.data.decision : "accept",
      participationStatus: result.participationStatus,
      participationSource: result.participationSource,
      joinedAt: result.joinedAt,
      updatedAt: result.updatedAt,
      participantsCount: result.participantsCount,
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
