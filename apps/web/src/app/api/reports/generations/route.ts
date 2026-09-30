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

type ReportGenerationPayload = z.infer<typeof createPayloadSchema>;
type ReportGenerationReservation = Awaited<ReturnType<typeof reserveReportExportSlot>>;
type ReportGenerationItem = Awaited<ReturnType<typeof persistReportGeneration>>;

function auditReportGenerationError(
  operationId: string,
  actorUserId: string,
  details: Record<string, unknown>,
) {
  return appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
    operationType: "admin_operation",
    outcome: "error",
    details: { operation: "persist_report_generation", ...details },
  });
}

async function parseReportGenerationRequest(
  request: Request,
  operationId: string,
  actorUserId: string,
): Promise<{ input: ReportGenerationHistoryInput } | { response: NextResponse }> {
  const body = await readJsonBodyWithLimit(request, MAX_REPORT_GENERATION_REQUEST_BYTES);
  if (!body.ok) {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "validation",
      code: body.reason === "too_large" ? "payload_too_large" : "invalid_json",
    });
    return {
      response: NextResponse.json(
        { error: body.reason === "too_large" ? "Payload too large" : "Invalid JSON payload" },
        { status: body.reason === "too_large" ? 413 : 400 },
      ),
    };
  }

  const parsed = createPayloadSchema.safeParse(body.data);
  if (!parsed.success) {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "validation",
      code: "invalid_payload",
    });
    return {
      response: NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      ),
    };
  }

  return { input: toReportGenerationHistoryInput(parsed.data) };
}

function toReportGenerationHistoryInput(
  payload: ReportGenerationPayload,
): ReportGenerationHistoryInput {
  return {
    payload: payload.payload,
    scopeKind: payload.scopeKind,
    scopeValue: payload.scopeValue,
    scopeLabel: payload.scopeLabel,
    detailLevel: payload.detailLevel,
    modules: payload.modules,
  };
}

async function reserveReportGenerationQuota(
  operationId: string,
  actorUserId: string,
): Promise<{ reservation: ReportGenerationReservation } | { response: NextResponse }> {
  let reservation: ReportGenerationReservation;
  try {
    reservation = await reserveReportExportSlot(actorUserId);
  } catch {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "quota",
      code: "quota_unavailable",
    });
    return {
      response: NextResponse.json({ error: "Quota d'export temporairement indisponible." }, { status: 503 }),
    };
  }

  if (!reservation.allowed) {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "quota",
      code: "daily_quota_exceeded",
    });
    return {
      response: NextResponse.json(
        {
          error: "Un export détaillé a déjà été utilisé aujourd'hui.",
          quotaDay: reservation.quotaDay,
        },
        { status: 429 },
      ),
    };
  }

  return { reservation };
}

async function persistReportGenerationWithQuota(
  operationId: string,
  actorUserId: string,
  input: ReportGenerationHistoryInput,
  reservation: ReportGenerationReservation,
): Promise<{ item: ReportGenerationItem } | { response: NextResponse }> {
  try {
    return { item: await persistReportGeneration({ createdByClerkId: actorUserId, input }) };
  } catch {
    await releaseReportExportSlot({ userId: actorUserId, quotaDay: reservation.quotaDay }).catch(() => undefined);
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "persistence",
      code: "persistence_failed",
    });
    return {
      response: NextResponse.json(
        { error: "Impossible d'enregistrer l'historique du rapport." },
        { status: 503 },
      ),
    };
  }
}

function auditReportGenerationSuccess(
  operationId: string,
  actorUserId: string,
  item: ReportGenerationItem,
  input: ReportGenerationHistoryInput,
) {
  return appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
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
}

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

  const parsed = await parseReportGenerationRequest(request, operationId, access.userId);
  if ("response" in parsed) return parsed.response;

  const quota = await reserveReportGenerationQuota(operationId, access.userId);
  if ("response" in quota) return quota.response;

  const persisted = await persistReportGenerationWithQuota(
    operationId,
    access.userId,
    parsed.input,
    quota.reservation,
  );
  if ("response" in persisted) return persisted.response;

  await auditReportGenerationSuccess(operationId, access.userId, persisted.item, parsed.input);

  return NextResponse.json({
    item: persisted.item,
    filename: buildPdfReportFilename({
      rubrique: parsed.input.payload.rubrique,
      periode: parsed.input.payload.periode,
    }),
  });
}
