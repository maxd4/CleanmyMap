import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { adminErrorResponse, adminSuccessResponse, newOperationId } from "@/lib/admin/response";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import {
  ACTION_CANCELLATION_CONFIRMATION,
  ACTION_CANCELLATION_REASONS,
  ActionCancellationError,
} from "@/lib/actions/cancellation-contract";
import {
  cancelFutureAction,
} from "@/lib/actions/cancellation";
import { refreshActionImpactProgressionDependents } from "../../../admin/moderation/route.action-progression";

export const runtime = "nodejs";
// Justification Vercel: l’annulation admin dépend de l’état courant de l’action et de l’utilisateur.
export const dynamic = "force-dynamic";

const cancellationPayloadSchema = z.object({
  confirmPhrase: z.string(),
  reason: z.enum(ACTION_CANCELLATION_REASONS).nullable().optional(),
}).strict();

export async function POST(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const operationId = newOperationId();
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const actionId = (await ctx.params).actionId.trim();
  if (!actionId) {
    return adminErrorResponse({
      status: 400,
      code: "invalid_payload",
      message: "Identifiant d'action manquant.",
      hint: "Fournir l'identifiant de l'action à annuler.",
      operationId,
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return adminErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Invalid JSON payload",
      hint: "Vérifier le JSON d'annulation.",
      operationId,
    });
  }

  const parsed = cancellationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return adminErrorResponse({
      status: 400,
      code: "invalid_payload",
      message: "Payload d'annulation invalide.",
      hint: "Le motif doit être une catégorie connue et la confirmation est obligatoire.",
      operationId,
      details: parsed.error.flatten().fieldErrors,
    });
  }

  if (parsed.data.confirmPhrase.trim().toUpperCase() !== ACTION_CANCELLATION_CONFIRMATION) {
    return adminErrorResponse({
      status: 409,
      code: "confirmation_required",
      message: "Confirmation explicite requise.",
      hint: `Renseigner exactement : ${ACTION_CANCELLATION_CONFIRMATION}`,
      operationId,
    });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const result = await cancelFutureAction(supabase, {
      actionId,
      actorUserId: access.userId,
      reason: parsed.data.reason ?? null,
    });

    await refreshActionImpactProgressionDependents(supabase, {
      actionId,
      creatorUserId: null,
    });

    await appendActionModerationAudit({
      operationId,
      actorUserId: access.userId,
      targetActionId: actionId,
      operation: "cancel_action",
      outcome: "success",
      reason: result.cancellationReason,
      previousValue: { status: result.previousStatus },
      newValue: {
        status: result.status,
        cancelledAt: result.cancelledAt,
        cancelledBy: result.cancelledBy,
        cancellationReason: result.cancellationReason,
      },
      details: { alreadyCancelled: result.alreadyCancelled },
    });

    return adminSuccessResponse({
      operationId,
      payload: result,
    });
  } catch (error) {
    const cancellationError =
      error instanceof ActionCancellationError ? error : null;
    const status =
      cancellationError?.code === "not_found"
        ? 404
        : cancellationError?.code === "conflict"
          ? 409
          : cancellationError?.code === "not_eligible"
            ? 422
            : 500;
    const code =
      status === 404
        ? "not_found"
        : status === 500
          ? "server_error"
          : status === 409
            ? cancellationError?.code === "conflict"
              ? "state_conflict"
              : "confirmation_required"
            : "invalid_payload";

    await appendActionModerationAudit({
      operationId,
      actorUserId: access.userId,
      targetActionId: actionId,
      operation: "cancel_action",
      outcome: "error",
      reason: parsed.data.reason ?? null,
      details: {
        code,
        ...(cancellationError ? { cancellationCode: cancellationError.code } : {}),
      },
    }).catch(() => undefined);

    if (cancellationError) {
      return adminErrorResponse({
        status,
        code,
        message: cancellationError.message,
        hint:
          status === 422
            ? "Vérifier que l'action est publiée, future et en pré-action."
            : "Rafraîchir l'action puis réessayer.",
        operationId,
      });
    }

    return NextResponse.json(
      { error: "L'annulation de l'action a échoué.", operationId },
      { status: 500 },
    );
  }
}
