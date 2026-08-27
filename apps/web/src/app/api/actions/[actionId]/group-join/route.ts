import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentUserIdentity,
  requireAuthenticatedAccess,
} from "@/lib/authz";
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
  ActionParticipationOperationError,
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

type GroupJoinAuditErrorStage =
  | "lookup"
  | "update"
  | "participation_update"
  | "post_update";

function resolveCanonicalClerkUserId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return /^user_[A-Za-z0-9]+$/.test(normalized) ? normalized : null;
}

function getAdminParticipationOperation(
  data: z.infer<typeof reviewSchema> | z.infer<typeof addParticipantSchema>,
): string {
  if ("participantUserId" in data) {
    return "admin_add_participant";
  }
  return `admin_review_${data.decision}`;
}

async function resolveAdminAuditIdentity(
  fallbackUserId?: string,
): Promise<{
  actorUserId: string;
} | null> {
  try {
    const identity = await getCurrentUserIdentity();
    if (!identity || !canUseAdminOverride(identity)) {
      return null;
    }
    const actorUserId = identity.userId ?? fallbackUserId ?? null;
    return actorUserId ? { actorUserId } : null;
  } catch {
    return null;
  }
}

async function resolveGroupJoinUserId(operation: string): Promise<string | null> {
  try {
    const identity = await getCurrentUserIdentity();
    return identity?.userId ?? null;
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
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

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

  let toggleAdminAuditRecorded = false;
  let toggleAdminAuditContext: {
    actorUserId: string;
    targetUserId: string | null;
    previousValue: { groupJoinEnabled: boolean };
    newValue: { groupJoinEnabled: boolean };
  } | null = null;
  let toggleActionKnown = false;
  const appendToggleAuditOnce = async (
    params: Parameters<typeof appendActionModerationAudit>[0],
  ): Promise<void> => {
    if (toggleAdminAuditRecorded) {
      return;
    }
    toggleAdminAuditRecorded = true;
    await appendActionModerationAudit(params);
  };

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
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendToggleAuditOnce({
          operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
          actorUserId: adminIdentity.actorUserId,
          targetActionId: trimmedActionId,
          operation: "toggle_group_join",
          outcome: "error",
          details: {
            stage: "lookup",
            partialMutation: false,
          },
        });
      }
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    toggleActionKnown = true;

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

    const shouldAuditToggle =
      Boolean(access.identity) &&
      canUseAdminOverride(access.identity) &&
      actorUserId !== actionResult.created_by_clerk_id;
    const previousValue = {
      groupJoinEnabled: extractActionMetadataFromNotes(actionResult.notes)
        .groupJoinEnabled,
    };
    if (shouldAuditToggle) {
      toggleActionKnown = true;
      toggleAdminAuditContext = {
        actorUserId,
        targetUserId: resolveCanonicalClerkUserId(
          actionResult.created_by_clerk_id,
        ),
        previousValue,
        newValue: { groupJoinEnabled: parsed.data.groupJoinEnabled },
      };
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

    if (updateResult.error || !updateResult.data) {
      throw new Error("Action update failed.");
    }

    const updatedMetadata = extractActionMetadataFromNotes(
      updateResult.data?.notes ?? updatedNotes,
    );

    if (toggleAdminAuditContext) {
      await appendToggleAuditOnce({
        operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
        actorUserId: toggleAdminAuditContext.actorUserId,
        targetActionId: trimmedActionId,
        operation: "toggle_group_join",
        outcome: "success",
        previousValue: toggleAdminAuditContext.previousValue,
        newValue: { groupJoinEnabled: updatedMetadata.groupJoinEnabled },
        ...(toggleAdminAuditContext.targetUserId
          ? { targetUserId: toggleAdminAuditContext.targetUserId }
          : {}),
      });
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      groupJoinEnabled: updatedMetadata.groupJoinEnabled,
    });
  } catch (error) {
    if (toggleAdminAuditContext) {
      await appendToggleAuditOnce({
        operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
        actorUserId: toggleAdminAuditContext.actorUserId,
        targetActionId: trimmedActionId,
        operation: "toggle_group_join",
        outcome: "error",
        previousValue: toggleAdminAuditContext.previousValue,
        newValue: toggleAdminAuditContext.newValue,
        ...(toggleAdminAuditContext.targetUserId
          ? { targetUserId: toggleAdminAuditContext.targetUserId }
          : {}),
        details: {
          stage: "update",
          partialMutation: false,
        },
      });
    } else if (!toggleActionKnown) {
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendToggleAuditOnce({
          operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
          actorUserId: adminIdentity.actorUserId,
          targetActionId: trimmedActionId,
          operation: "toggle_group_join",
          outcome: "error",
          details: {
            stage: "lookup",
            partialMutation: false,
          },
        });
      }
    }
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
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

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

  let adminParticipationAuditRecorded = false;
  let adminParticipationAuditContext: {
    actorUserId: string;
    operation: string;
    reason: string | null;
    targetUserId: string | null;
  } | null = null;
  const appendAdminParticipationAuditOnce = async (
    params: Parameters<typeof appendActionModerationAudit>[0],
  ): Promise<void> => {
    if (adminParticipationAuditRecorded) {
      return;
    }
    adminParticipationAuditRecorded = true;
    await appendActionModerationAudit(params);
  };
  const appendAdminParticipationError = async (params: {
    actorUserId: string;
    operation: string;
    reason: string | null;
    targetUserId?: string | null;
    stage: GroupJoinAuditErrorStage;
    partialMutation: boolean;
  }): Promise<void> => {
    await appendAdminParticipationAuditOnce({
      operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
      actorUserId: params.actorUserId,
      targetActionId: trimmedActionId,
      operation: params.operation,
      outcome: "error",
      reason: params.reason,
      ...(params.targetUserId
        ? { targetUserId: params.targetUserId }
        : {}),
      details: {
        stage: params.stage,
        partialMutation: params.partialMutation,
      },
    });
  };

  const adminOperation = getAdminParticipationOperation(parsed.data);
  const requestReason = normalizeModerationReason(parsed.data.reason);

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
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendAdminParticipationError({
          actorUserId: adminIdentity.actorUserId,
          operation: adminOperation,
          reason: requestReason,
          targetUserId:
            "participantUserId" in parsed.data
              ? parsed.data.participantUserId
              : null,
          stage: "lookup",
          partialMutation: false,
        });
      }
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
        ? adminOperation
        : null;
    const reasonRequired =
      adminOverrideOperation === "admin_add_participant" ||
      adminOverrideOperation === "admin_review_reject";
    const reason = normalizeModerationReason(parsed.data.reason, {
      required: reasonRequired,
    });
    if (adminOverrideOperation) {
      adminParticipationAuditContext = {
        actorUserId: access.identity?.userId ?? userId,
        operation: adminOverrideOperation,
        reason,
        targetUserId:
          "participantUserId" in parsed.data
            ? parsed.data.participantUserId
            : null,
      };
    }
    if (adminOverrideOperation && reasonRequired && !reason) {
      const auditContext = adminParticipationAuditContext;
      if (!auditContext) {
        return NextResponse.json(
          { error: "Opération admin non résolue." },
          { status: 400 },
        );
      }
      await appendAdminParticipationError({
        actorUserId: auditContext.actorUserId,
        operation: auditContext.operation,
        reason: auditContext.reason,
        targetUserId: auditContext.targetUserId,
        stage: "lookup",
        partialMutation: false,
      });
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
      await appendAdminParticipationAuditOnce({
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
    if (adminParticipationAuditContext) {
      const operationError =
        error instanceof ActionParticipationOperationError
          ? error
          : null;
      const stage: GroupJoinAuditErrorStage = operationError?.stage ??
        (error instanceof Error &&
        (error.name === "NotFoundError" || error.name === "ValidationError")
          ? "lookup"
          : "participation_update");
      await appendAdminParticipationError({
        actorUserId: adminParticipationAuditContext.actorUserId,
        operation: adminParticipationAuditContext.operation,
        reason: adminParticipationAuditContext.reason,
        targetUserId:
          operationError?.targetUserId ??
          adminParticipationAuditContext.targetUserId,
        stage,
        partialMutation: operationError?.partialMutation ?? false,
      });
    } else {
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendAdminParticipationError({
          actorUserId: adminIdentity.actorUserId,
          operation: getAdminParticipationOperation(parsed.data),
          reason: normalizeModerationReason(parsed.data.reason),
          targetUserId:
            "participantUserId" in parsed.data
              ? parsed.data.participantUserId
              : null,
          stage: "lookup",
          partialMutation: false,
        });
      }
    }
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
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

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
