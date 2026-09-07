import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { normalizeModerationReason } from "@/lib/actions/moderation-audit";
import { adminErrorResponse, newOperationId } from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  moderateAction,
} from "./route.action";
import { moderateCleanPlace } from "./route.clean-place";
import {
  MODERATION_CONFIRM_PHRASE,
  moderationPayloadSchema,
  isValidModerationConfirmationPhrase,
  resolveActionModerationOperation,
  type ModerationErrorStage,
} from "./route.shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const operationId = newOperationId();
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      details: { code: "invalid_json" },
    });

    return adminErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Invalid JSON payload",
      hint: "Verifier le JSON de moderation puis relancer.",
      operationId,
    });
  }

  const parsed = moderationPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      details: { code: "invalid_payload" },
    });

    return adminErrorResponse({
      status: 400,
      code: "invalid_payload",
      message: "Invalid payload",
      hint: "Le payload doit cibler une entite action|clean_place avec un statut valide.",
      operationId,
      details: parsed.error.flatten().fieldErrors,
    });
  }

  if (!isValidModerationConfirmationPhrase(parsed.data.confirmPhrase)) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      details: { code: "confirmation_required" },
    });

    return adminErrorResponse({
      status: 409,
      code: "confirmation_required",
      message: "Explicit confirmation phrase required",
      hint: `Renseigne exactement la phrase: ${MODERATION_CONFIRM_PHRASE}`,
      operationId,
    });
  }

  const requiredReasonOperation =
    parsed.data.entityType === "action"
      ? resolveActionModerationOperation(parsed.data)
      : null;
  const reason = normalizeModerationReason(parsed.data.reason, {
    required: Boolean(requiredReasonOperation),
  });
  if (requiredReasonOperation && !reason) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      targetId: parsed.data.id,
      details: {
        code: "reason_required",
        entityType: parsed.data.entityType,
        operation: requiredReasonOperation,
      },
    });

    return adminErrorResponse({
      status: 400,
      code: "reason_required",
      message: "Motif de modération obligatoire.",
      hint: "Renseigne un motif clair d'au moins 5 caractères pour cette opération sensible.",
      operationId,
    });
  }

  const supabase = getSupabaseAdminClient();
  let auditRecorded = false;
  let errorStage: ModerationErrorStage = "lookup";
  const appendAuditOnce = async (
    entry: Parameters<typeof appendAdminOperationAudit>[0],
  ): Promise<void> => {
    if (auditRecorded) {
      return;
    }
    auditRecorded = true;
    await appendAdminOperationAudit(entry);
  };

  try {
    if (parsed.data.entityType === "action") {
      return await moderateAction({
        supabase,
        payload: parsed.data,
        operationId,
        actorUserId: access.userId,
        requiredReasonOperation,
        reason,
        appendAuditOnce,
        setErrorStage: (stage) => {
          errorStage = stage;
        },
      });
    }

    return await moderateCleanPlace({
      supabase,
      payload: parsed.data,
      operationId,
      actorUserId: access.userId,
      reason,
      appendAuditOnce,
      setErrorStage: (stage) => {
        errorStage = stage;
      },
    });
  } catch {
    console.error("[Admin Moderation] Operation failed", {
      operationId,
      stage: errorStage,
    });

    await appendAuditOnce({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      targetId: parsed.data.id,
      details: {
        code: "server_error",
        entityType: parsed.data.entityType,
        stage: errorStage,
        ...(requiredReasonOperation
          ? { operation: requiredReasonOperation }
          : {}),
        ...(reason ? { reason } : {}),
      },
    });

    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message: "La modération a échoué.",
      hint: "Verifier la connectivite base de donnees et relancer l'operation.",
      operationId,
    });
  }
}
