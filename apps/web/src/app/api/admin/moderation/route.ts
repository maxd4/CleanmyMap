import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  copyValidatedActionToLocalStore,
  copyValidatedSpotToLocalStore,
} from "@/lib/data/local-sync";
import { appendAdminOperationAudit } from "@/lib/admin/operation-audit";
import {
  trackActionValidationBonus,
  trackSpotValidationBonus,
} from "@/lib/gamification/progression";
import {
  adminErrorResponse,
  adminSuccessResponse,
  newOperationId,
} from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";
const MODERATION_CONFIRM_PHRASE = "CONFIRMER MODERATION";

const actionPayloadSchema = z.object({
  entityType: z.literal("action"),
  id: z.string().trim().min(1),
  status: z.enum(["pending", "approved", "rejected"]),
  confirmPhrase: z.string().trim().max(120).optional(),
});

const cleanPlacePayloadSchema = z.object({
  entityType: z.literal("clean_place"),
  id: z.string().trim().min(1),
  status: z.enum(["new", "validated", "cleaned"]),
  confirmPhrase: z.string().trim().max(120).optional(),
});

const moderationPayloadSchema = z.union([
  actionPayloadSchema,
  cleanPlacePayloadSchema,
]);

function isMissingActionsTableError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("could not find the table") && message.includes("actions")
  );
}

function isValidModerationConfirmationPhrase(
  value: string | null | undefined,
): boolean {
  return (value ?? "").trim().toUpperCase() === MODERATION_CONFIRM_PHRASE;
}

async function updateActionStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string,
  status: "pending" | "approved" | "rejected",
): Promise<{ source: "actions" | "submissions"; found: boolean }> {
  const primary = await supabase
    .from("actions")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (!primary.error && primary.data) {
    return { source: "actions", found: true };
  }
  if (primary.error && !isMissingActionsTableError(primary.error.message)) {
    throw new Error(primary.error.message);
  }

  const legacy = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (legacy.error) {
    throw new Error(legacy.error.message);
  }
  return { source: "submissions", found: Boolean(legacy.data) };
}

async function updateSpotStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  id: string,
  status: "new" | "validated" | "cleaned",
): Promise<boolean> {
  const updated = await supabase
    .from("spots")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (updated.error) {
    throw new Error(updated.error.message);
  }
  return Boolean(updated.data);
}

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

  const supabase = getSupabaseServerClient();

  try {
    if (parsed.data.entityType === "action") {
      const statusUpdate = await updateActionStatus(
        supabase,
        parsed.data.id,
        parsed.data.status,
      );
      if (!statusUpdate.found) {
        await appendAdminOperationAudit({
          operationId,
          at: new Date().toISOString(),
          actorUserId: access.userId,
          operationType: "moderation",
          outcome: "error",
          targetId: parsed.data.id,
          details: { code: "not_found", entityType: parsed.data.entityType },
        });

        return adminErrorResponse({
          status: 404,
          code: "not_found",
          message: "Action not found",
          hint: "Verifier l'identifiant avant de relancer la moderation.",
          operationId,
        });
      }

      let copied = false;
      if (parsed.data.status === "approved") {
        const syncResult = await copyValidatedActionToLocalStore(
          supabase,
          parsed.data.id,
          access.userId,
        );
        copied = syncResult.copied;
        try {
          await trackActionValidationBonus(supabase, {
            actionId: parsed.data.id,
          });
        } catch (progressionError) {
          console.error("Progression tracking failed for action moderation", {
            actionId: parsed.data.id,
            message:
              progressionError instanceof Error
                ? progressionError.message
                : String(progressionError),
          });
        }
      }

      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "moderation",
        outcome: "success",
        targetId: parsed.data.id,
        details: {
          entityType: parsed.data.entityType,
          targetStatus: parsed.data.status,
          sourceTable: statusUpdate.source,
          copiedToLocalValidatedStore: copied,
        },
      });

      return adminSuccessResponse({
        operationId,
        payload: {
          status: "ok",
          entityType: "action",
          id: parsed.data.id,
          sourceTable: statusUpdate.source,
          copiedToLocalValidatedStore: copied,
        },
      });
    }

    const updated = await updateSpotStatus(
      supabase,
      parsed.data.id,
      parsed.data.status,
    );
    if (!updated) {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "moderation",
        outcome: "error",
        targetId: parsed.data.id,
        details: { code: "not_found", entityType: parsed.data.entityType },
      });

      return adminErrorResponse({
        status: 404,
        code: "not_found",
        message: "Clean place not found",
        hint: "Verifier l'identifiant spot avant de relancer la moderation.",
        operationId,
      });
    }

    let copied = false;
    if (
      parsed.data.status === "validated" ||
      parsed.data.status === "cleaned"
    ) {
      copied = await copyValidatedSpotToLocalStore(
        supabase,
        parsed.data.id,
        access.userId,
      );
      try {
        await trackSpotValidationBonus(supabase, {
          spotId: parsed.data.id,
        });
      } catch (progressionError) {
        console.error("Progression tracking failed for spot moderation", {
          spotId: parsed.data.id,
          message:
            progressionError instanceof Error
              ? progressionError.message
              : String(progressionError),
        });
      }
    }

    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "success",
      targetId: parsed.data.id,
      details: {
        entityType: parsed.data.entityType,
        targetStatus: parsed.data.status,
        sourceTable: "spots",
        copiedToLocalValidatedStore: copied,
      },
    });

    return adminSuccessResponse({
      operationId,
      payload: {
        status: "ok",
        entityType: "clean_place",
        id: parsed.data.id,
        sourceTable: "spots",
        copiedToLocalValidatedStore: copied,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "moderation",
      outcome: "error",
      details: { code: "server_error", message },
    });

    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message,
      hint: "Verifier la connectivite base de donnees et relancer l'operation.",
      operationId,
    });
  }
}
