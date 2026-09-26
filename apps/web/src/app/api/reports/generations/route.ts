import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
import {
  persistReportGeneration,
} from "@/lib/reports/report-generation-history-store";
import {
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { reportGenerationPayloadSchema } from "@/lib/reports/report-generation-payload";
import { readJsonBodyWithLimit } from "@/lib/http/request-body";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

export const runtime = "nodejs";
const MAX_REPORT_GENERATION_REQUEST_BYTES = 2 * 1024 * 1024;

const detailLevelSchema = z.enum(["concis", "default", "exhaustif"]);
const scopeKindSchema = z.enum(["global", "account", "association", "arrondissement"]);

const modulesSchema = z.object({
  dataAndCartography: z.boolean(),
  transparencyAndMethods: z.boolean(),
  rawData: z.boolean(),
  detailedFiles: z.boolean(),
});

const createPayloadSchema = z.object({
  payload: reportGenerationPayloadSchema,
  scopeKind: scopeKindSchema,
  scopeValue: z.string().max(180),
  scopeLabel: z.string().trim().min(1).max(180),
  detailLevel: detailLevelSchema,
  modules: modulesSchema,
});

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  const rateLimit = await verifyRateLimit(request, { limit: 5, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const operationId = `report-generation-${randomUUID()}`;

  const body = await readJsonBodyWithLimit(request, MAX_REPORT_GENERATION_REQUEST_BYTES);
  if (!body.ok) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: body.reason === "too_large" ? "payload_too_large" : "invalid_json",
      },
    });
    return NextResponse.json(
      { error: body.reason === "too_large" ? "Payload too large" : "Invalid JSON payload" },
      { status: body.reason === "too_large" ? 413 : 400 },
    );
  }
  const rawPayload: unknown = body.data;

  const parsed = createPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "validation",
        code: "invalid_payload",
      },
    });
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input: ReportGenerationHistoryInput = {
    payload: parsed.data.payload,
    scopeKind: parsed.data.scopeKind,
    scopeValue: parsed.data.scopeValue,
    scopeLabel: parsed.data.scopeLabel,
    detailLevel: parsed.data.detailLevel,
    modules: parsed.data.modules,
  };
  let reservation;
  try {
    reservation = await reserveReportExportSlot(access.userId);
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "quota",
        code: "quota_unavailable",
      },
    });
    return NextResponse.json({ error: "Quota d'export temporairement indisponible." }, { status: 503 });
  }
  if (!reservation.allowed) {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "quota",
        code: "daily_quota_exceeded",
      },
    });
    return NextResponse.json(
      {
        error: "Un export détaillé a déjà été utilisé aujourd'hui.",
        quotaDay: reservation.quotaDay,
      },
      { status: 429 },
    );
  }
  let item: Awaited<ReturnType<typeof persistReportGeneration>>;
  try {
    item = await persistReportGeneration({
      createdByClerkId: access.userId,
      input,
    });
  } catch {
    await releaseReportExportSlot({
      userId: access.userId,
      quotaDay: reservation.quotaDay,
    }).catch(() => undefined);
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "error",
      details: {
        operation: "persist_report_generation",
        stage: "persistence",
        code: "persistence_failed",
      },
    });
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'historique du rapport." },
      { status: 503 },
    );
  }

  await appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId: access.userId,
    operationType: "admin_operation",
    outcome: "success",
    targetId: item.id,
    details: {
      operation: "persist_report_generation",
      stage: "persistence",
      scopeKind: input.scopeKind,
      detailLevel: input.detailLevel,
    },
  });

  return NextResponse.json({
    item,
    filename: buildPdfReportFilename({
      rubrique: input.payload.rubrique,
      periode: input.payload.periode,
    }),
  });
}
