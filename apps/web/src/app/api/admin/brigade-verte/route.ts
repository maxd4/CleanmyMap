/**
 * API admin Brigade Verte — Parcours Éco-Citoyen Quartier Propre.
 *
 * ACCÈS : IMU max uniquement (requireCreatorAccess).
 * AUDIT : toute mutation écrit dans admin_operations_audit via la RPC PostgreSQL atomique ou le handler d'erreur.
 *
 * GET  /api/admin/brigade-verte?actionId=<uuid>          → qualification + historique
 * GET  /api/admin/brigade-verte?query=<text>&date=<date>&page=<number> → recherche paginée d'actions éligibles
 * POST /api/admin/brigade-verte { action: "qualify", actionId, justificationUrl, qualificationReason }
 * POST /api/admin/brigade-verte { action: "revoke", qualificationId, revocationReason }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCreatorAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { adminErrorResponse, newOperationId } from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import {
  qualifyAction,
  revokeQualification,
  getQualificationWithHistory,
  searchEligibleActions,
} from "@/lib/brigade-verte/brigade-verte-service";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Schémas de validation
// ---------------------------------------------------------------------------

const qualifyPayloadSchema = z.object({
  action: z.literal("qualify"),
  actionId: z.string().uuid({ message: "actionId doit être un UUID valide." }),
  justificationUrl: z
    .string()
    .url({ message: "justificationUrl doit être une URL valide." })
    .refine((url) => url.startsWith("https://"), {
      message: "justificationUrl doit commencer par https://.",
    }),
  qualificationReason: z
    .string()
    .trim()
    .min(5, { message: "Le motif de qualification doit comporter au moins 5 caractères." })
    .max(500, { message: "Le motif de qualification ne peut pas dépasser 500 caractères." }),
});

const revokePayloadSchema = z.object({
  action: z.literal("revoke"),
  qualificationId: z.string().uuid({ message: "qualificationId doit être un UUID valide." }),
  revocationReason: z
    .string()
    .trim()
    .min(5, { message: "Le motif de révocation doit comporter au moins 5 caractères." })
    .max(500, { message: "Le motif de révocation ne peut pas dépasser 500 caractères." }),
});

const brigadeVerteAdminPayloadSchema = z.discriminatedUnion("action", [
  qualifyPayloadSchema,
  revokePayloadSchema,
]);

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  const operationId = newOperationId();
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const url = new URL(request.url);
  const actionId = url.searchParams.get("actionId");
  const query = url.searchParams.get("query") ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;
  const pageStr = url.searchParams.get("page");
  const page = pageStr ? parseInt(pageStr, 10) : 1;

  if (actionId) {
    // Lecture de la qualification + historique pour une action spécifique
    const { qualification, history } = await getQualificationWithHistory(actionId);
    return NextResponse.json({ qualification, history });
  }

  // Recherche d'actions éligibles
  const searchResult = await searchEligibleActions({ query, date, page });
  return NextResponse.json(searchResult);
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const operationId = newOperationId();
  const access = await requireCreatorAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "brigade_verte_qualification",
      outcome: "error",
      details: { code: "invalid_json" },
    });
    return adminErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Payload JSON invalide.",
      hint: "Vérifier le JSON avant de relancer.",
      operationId,
    });
  }

  const parsed = brigadeVerteAdminPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "brigade_verte_qualification",
      outcome: "error",
      details: { code: "invalid_payload", fieldErrors: parsed.error.flatten().fieldErrors },
    });
    return adminErrorResponse({
      status: 400,
      code: "invalid_payload",
      message: "Payload invalide.",
      hint: "Vérifier les champs action, actionId/qualificationId, justificationUrl/qualificationReason/revocationReason.",
      operationId,
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const payload = parsed.data;

  if (payload.action === "qualify") {
    const result = await qualifyAction({
      actionId: payload.actionId,
      justificationUrl: payload.justificationUrl,
      qualificationReason: payload.qualificationReason,
      qualifiedBy: access.userId,
      operationId,
    });

    if (!result.ok) {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "brigade_verte_qualification",
        outcome: "error",
        targetId: payload.actionId,
        details: { error: result.error, message: result.message },
      });

      const status =
        result.error === "already_active" ? 409 : result.error === "action_not_eligible" ? 422 : 500;
      return adminErrorResponse({
        status,
        code: result.error === "already_active" ? "state_conflict" : "server_error",
        message: result.message,
        hint:
          result.error === "already_active"
            ? "Cette action est déjà qualifiée Brigade Verte. Révoquer d'abord avant de requalifier."
            : "Vérifier l'éligibilité de l'action.",
        operationId,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        qualificationId: result.qualificationId,
        decision: result.decision,
        idempotent: result.idempotent ?? false,
        operationId,
      },
      { status: 200 },
    );
  }

  // action === "revoke"
  const result = await revokeQualification({
    qualificationId: payload.qualificationId,
    revocationReason: payload.revocationReason,
    revokedBy: access.userId,
    operationId,
  });

  if (!result.ok) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "brigade_verte_qualification",
      outcome: "error",
      targetId: payload.qualificationId,
      details: { error: result.error, message: result.message },
    });

    const status =
      result.error === "not_found" ? 404 : result.error === "already_revoked" ? 409 : 500;
    return adminErrorResponse({
      status,
      code:
        result.error === "not_found"
          ? "not_found"
          : result.error === "already_revoked"
            ? "state_conflict"
            : "server_error",
      message: result.message,
      hint:
        result.error === "not_found"
          ? "Vérifier l'identifiant de qualification."
          : "Cette qualification est déjà révoquée.",
      operationId,
    });
  }

  return NextResponse.json(
    { ok: true, idempotent: result.idempotent ?? false, operationId },
    { status: 200 },
  );
}
