import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { adminErrorResponse, newOperationId } from "@/lib/admin/response";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseExternalActionSyncStore } from "@/lib/actions/external-sync/store";
import { runExternalActionSync } from "@/lib/actions/external-sync/engine";

export const runtime = "nodejs";
// Justification force-dynamic: admin external-sync reads and mutates live private subscriptions, proposals, and actions.
export const dynamic = "force-dynamic";

const syncNowSchema = z.object({
  action: z.literal("sync_now"),
  organizerDirectoryId: z.string().trim().min(1).max(200).optional(),
});

const suppressSchema = z.object({
  action: z.literal("suppress"),
  actionId: z.string().uuid(),
  operationId: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().min(5).max(500),
});

const resolveProposalSchema = z.object({
  action: z.literal("resolve_proposal"),
  proposalId: z.string().uuid(),
  status: z.enum(["resolved", "dismissed"]),
  resolutionNote: z.string().trim().max(500).optional(),
});

const postPayloadSchema = z.discriminatedUnion("action", [
  syncNowSchema,
  suppressSchema,
  resolveProposalSchema,
]);

export async function GET(): Promise<Response> {
  const operationId = newOperationId();
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  try {
    const store = createSupabaseExternalActionSyncStore(getSupabaseServerClient(true));
    const [subscriptions, syncedActions, proposals] = await Promise.all([
      store.listSubscriptions(),
      store.listSyncedActions(),
      store.listProposals("pending"),
    ]);
    return NextResponse.json(
      { subscriptions, syncedActions, proposals },
      // Justification no-store: admin external-sync state contains private mandates and moderation proposals.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message: "Impossible de lire l'état de synchronisation externe.",
      hint: "Vérifier l'état Supabase puis réessayer.",
      operationId,
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const operationId = newOperationId();
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access, operationId);
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 10, window: 60 },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "external_action_sync",
      outcome: "error",
      details: { code: "invalid_json" },
    });
    return adminErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Payload JSON invalide.",
      hint: "Vérifier le corps JSON de la requête.",
      operationId,
    });
  }

  const parsed = postPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "external_action_sync",
      outcome: "error",
      details: { code: "invalid_payload" },
    });
    return adminErrorResponse({
      status: 400,
      code: "invalid_payload",
      message: "Paramètres de synchronisation externe invalides.",
      hint: "Vérifier l'action et les champs requis.",
      operationId,
    });
  }

  const store = createSupabaseExternalActionSyncStore(getSupabaseServerClient(true));
  const payload = parsed.data;

  try {
    if (payload.action === "sync_now") {
      const summary = await runExternalActionSync(
        { store },
        {
          mode: "admin_sync_now",
          organizerDirectoryId: payload.organizerDirectoryId,
          actorUserId: access.userId,
        },
      );
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "external_action_sync",
        outcome: summary.errors > 0 ? "error" : "success",
        details: {
          command: "sync_now",
          organizerDirectoryId: payload.organizerDirectoryId ?? null,
          created: summary.created,
          createdAndPublished: summary.createdAndPublished,
          updated: summary.updated,
          published: summary.published,
          proposals: summary.proposals,
          conflicts: summary.conflicts,
          disabledSources: summary.disabledSources,
          errors: summary.errors,
        },
      });
      return NextResponse.json({ operationId, summary });
    }

    if (payload.action === "suppress") {
      const effectiveOpId = payload.operationId ?? operationId;
      const result = await store.suppressAction({
        actionId: payload.actionId,
        actorUserId: access.userId,
        operationId: effectiveOpId,
        reason: payload.reason,
      });
      await appendAdminOperationAudit({
        operationId: effectiveOpId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "external_action_sync",
        outcome: result === "suppressed" ? "success" : "error",
        targetId: payload.actionId,
        details: {
          command: "suppress",
          result,
        },
      });

      if (result === "not_synced") {
        return adminErrorResponse({
          status: 404,
          code: "not_found",
          message: "Aucune action synchronisée correspondante.",
          hint: "Vérifier l'identifiant d'action.",
          operationId: effectiveOpId,
        });
      }
      if (result === "operation_conflict" || result === "organizer_mismatch") {
        return adminErrorResponse({
          status: 409,
          code: "state_conflict",
          message: "Suppression refusée en raison d'un conflit d'opération ou de propriétaire.",
          hint: "Utiliser un operationId distinct ou vérifier l'organisateur.",
          operationId: effectiveOpId,
        });
      }
      return NextResponse.json({ operationId: effectiveOpId, status: "suppressed", actionId: payload.actionId });
    }

    const resolution = await store.resolveProposal({
      proposalId: payload.proposalId,
      status: payload.status,
      actorUserId: access.userId,
      resolutionNote: payload.resolutionNote,
    });
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "external_action_sync",
      outcome: resolution === "not_found" ? "error" : "success",
      targetId: payload.proposalId,
      details: {
        command: "resolve_proposal",
        status: payload.status,
        result: resolution,
      },
    });
    if (resolution === "not_found") {
      return adminErrorResponse({
        status: 404,
        code: "not_found",
        message: "Proposition externe introuvable.",
        hint: "Vérifier l'identifiant de proposition.",
        operationId,
      });
    }
    return NextResponse.json({ operationId, status: resolution, proposalId: payload.proposalId });
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "external_action_sync",
      outcome: "error",
      details: { command: payload.action, code: "external_sync_failed" },
    });
    return adminErrorResponse({
      status: 500,
      code: "server_error",
      message: "Échec de l'opération de synchronisation externe.",
      hint: "Consulter l'audit admin puis réessayer.",
      operationId,
    });
  }
}
