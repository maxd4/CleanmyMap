/**
 * API admin Brigade Verte — Parcours Éco-Citoyen Quartier Propre.
 *
 * ACCÈS : IMU max uniquement (requireCreatorAccess).
 * AUDIT : toute mutation écrit dans admin_operations_audit.
 *
 * GET  /api/admin/brigade-verte?actionId=<uuid>          → qualification + historique
 * GET  /api/admin/brigade-verte?query=<text>&date=<date> → recherche d'actions éligibles
 * POST /api/admin/brigade-verte { action: "qualify", ... }
 * POST /api/admin/brigade-verte { action: "revoke", ... }
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
});

const revokePayloadSchema = z.object({
  action: z.literal("revoke"),
  qualificationId: z.string().uuid({ message: "qualificationId doit être un UUID valide." }),
  revocationReason: z
    .string()
    .trim()
    .min(10, { message: "Le motif de révocation doit comporter au moins 10 caractères." })
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

  if (actionId) {
    // Lecture de la qualification + historique pour une action spécifique
    const { qualification, history } = await getQualificationWithHistory(actionId);
    return NextResponse.json({ qualification, history });
  }

  // Recherche d'actions éligibles
  const actions = await searchEligibleActions({ query, date });
  return NextResponse.json({ actions });
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
      hint: "Vérifier les champs action, actionId/qualificationId, justificationUrl/revocationReason.",
      operationId,
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const payload = parsed.data;

  if (payload.action === "qualify") {
    const result = await qualifyAction({
      actionId: payload.actionId,
      justificationUrl: payload.justificationUrl,
      qualifiedBy: access.userId,
      operationId,
    });

    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "brigade_verte_qualification",
      outcome: result.ok ? "success" : "error",
      targetId: payload.actionId,
      details: result.ok
        ? { decision: result.decision, qualificationId: result.qualificationId }
        : { error: result.error, message: result.message },
    });

    if (!result.ok) {
      const status = result.error === "already_active" ? 409 : result.error === "action_not_eligible" ? 422 : 500;
      return adminErrorResponse({
        status,
        code: result.error === "already_active" ? "state_conflict" : "server_error",
        message: result.message,
        hint: result.error === "already_active"
          ? "Cette action est déjà qualifiée Brigade Verte. Révoquer d'abord avant de requalifier."
          : "Vérifier l'éligibilité de l'action.",
        operationId,
      });
    }

    return NextResponse.json(
      { ok: true, qualificationId: result.qualificationId, decision: result.decision, operationId },
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

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: access.userId,
    operationType: "brigade_verte_qualification",
    outcome: result.ok ? "success" : "error",
    targetId: payload.qualificationId,
    details: result.ok
      ? { action: "revoke" }
      : { error: result.error, message: result.message },
  });

  if (!result.ok) {
    const status =
      result.error === "not_found" ? 404 :
      result.error === "already_revoked" ? 409 : 500;
    return adminErrorResponse({
      status,
      code: result.error === "not_found" ? "not_found" : result.error === "already_revoked" ? "state_conflict" : "server_error",
      message: result.message,
      hint: result.error === "not_found"
        ? "Vérifier l'identifiant de qualification."
        : "Cette qualification est déjà révoquée.",
      operationId,
    });
  }

  return NextResponse.json({ ok: true, operationId }, { status: 200 });
}
