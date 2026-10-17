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
  getReportExportAvailability,
  getReportExportQuotaDay,
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
import { readJsonBodyWithLimit } from "@/lib/http/request-body";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import {
  buildSingleActionReportGenerationInput,
  resolveSingleActionReportContract,
  SingleActionReportTargetUnavailableError,
} from "@/lib/reports/single-action-report";
import {
  buildMultiActionReportGenerationInput,
  MultiActionReportEmptyError,
  MultiActionReportPeriodInvalidError,
  MultiActionReportScopeUnavailableError,
  MultiActionReportSourceUnavailableError,
} from "@/lib/reports/multi-action-report";
import {
  reportAdvancedFiltersSchema,
  ReportAdvancedFilterSourceUnavailableError,
} from "@/lib/reports/report-advanced-filters";

export const runtime = "nodejs";
const MAX_REPORT_GENERATION_REQUEST_BYTES = 2 * 1024 * 1024;

const detailLevelSchema = z.enum(["concis", "default", "exhaustif"]);
const scopeKindSchema = z.enum(["global", "account", "association", "arrondissement"]);
const periodIdSchema = z.enum([
  "thirty_days",
  "three_months",
  "six_months",
  "twelve_months",
  "current_year",
  "full_history",
]);
const civilDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const modulesSchema = z.object({
  dataAndCartography: z.boolean(),
  transparencyAndMethods: z.boolean(),
  rawData: z.boolean(),
  detailedFiles: z.boolean(),
});

const singleActionRequestSchema = z.object({
  input: z.object({
    type: z.literal("single_action"),
    actionId: z.string().uuid(),
  }).strict(),
  detailLevel: detailLevelSchema,
  modules: modulesSchema.strict(),
}).strict();

const multiActionRequestSchema = z.object({
  input: z.object({
    type: z.literal("multi_action"),
    period: z.union([
      z.object({ id: periodIdSchema }).strict(),
      z.object({
        id: z.literal("custom_range"),
        from: civilDateSchema,
        to: civilDateSchema,
      }).strict(),
    ]),
    scope: z.object({
      kind: scopeKindSchema,
      value: z.string().trim().max(180).nullable().optional(),
    }).strict(),
    filters: reportAdvancedFiltersSchema.optional(),
  }).strict(),
  detailLevel: detailLevelSchema,
  modules: modulesSchema.strict(),
}).strict();

type ReportGenerationReservation = Awaited<ReturnType<typeof reserveReportExportSlot>>;
type ReportGenerationItem = Awaited<ReturnType<typeof persistReportGeneration>>;
type ParsedReportGenerationRequest =
  | { kind: "single_action"; request: z.infer<typeof singleActionRequestSchema> }
  | { kind: "multi_action"; request: z.infer<typeof multiActionRequestSchema> };

function hasTypedInput(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, "input"),
  );
}

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
): Promise<{ request: ParsedReportGenerationRequest } | { response: NextResponse }> {
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

  const singleAction = singleActionRequestSchema.safeParse(body.data);
  const multiAction = multiActionRequestSchema.safeParse(body.data);
  if (hasTypedInput(body.data) && !singleAction.success && !multiAction.success) {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "validation",
      code: "invalid_typed_input",
    });
    return {
      response: NextResponse.json({ error: "Invalid report generation input" }, { status: 400 }),
    };
  }

  if (singleAction.success) {
    return { request: { kind: "single_action", request: singleAction.data } };
  }

  if (multiAction.success) {
    return { request: { kind: "multi_action", request: multiAction.data } };
  }

  if (body.data && typeof body.data === "object" && "payload" in body.data) {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "validation",
      code: "legacy_payload_rejected",
    });
    return {
      response: NextResponse.json({ error: "A typed report generation input is required." }, { status: 400 }),
    };
  }

  await auditReportGenerationError(operationId, actorUserId, {
    stage: "validation",
    code: "invalid_typed_input",
  });
  return {
    response: NextResponse.json({ error: "Invalid report generation input" }, { status: 400 }),
  };
}

async function resolveReportGenerationInput(
  parsed: ParsedReportGenerationRequest,
  operationId: string,
  actorUserId: string,
  generationId: string,
): Promise<{ input: ReportGenerationHistoryInput } | { response: NextResponse }> {
  if (parsed.kind === "single_action") {
    try {
      const contract = await resolveSingleActionReportContract(parsed.request.input.actionId);
      return {
        input: buildSingleActionReportGenerationInput({
          request: parsed.request.input,
          contract,
          detailLevel: parsed.request.detailLevel,
          modules: parsed.request.modules,
          generationId,
          now: new Date(),
        }),
      };
    } catch (error) {
      if (error instanceof SingleActionReportTargetUnavailableError) {
        await auditReportGenerationError(operationId, actorUserId, {
          stage: "source",
          code: "action_unavailable",
        });
        return { response: NextResponse.json({ error: "Action indisponible." }, { status: 404 }) };
      }
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "source",
        code: "action_resolution_failed",
      });
      return { response: NextResponse.json({ error: "Action temporairement indisponible." }, { status: 503 }) };
    }
  }

  try {
    return {
      input: await buildMultiActionReportGenerationInput({
        request: parsed.request.input,
        detailLevel: parsed.request.detailLevel,
        modules: parsed.request.modules,
        generationId,
        readerUserId: actorUserId,
        now: new Date(),
      }),
    };
  } catch (error) {
    if (error instanceof MultiActionReportPeriodInvalidError) {
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "validation",
        code: "invalid_period",
      });
      return { response: NextResponse.json({ error: "Période invalide." }, { status: 400 }) };
    }
    if (error instanceof MultiActionReportScopeUnavailableError) {
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "authorization",
        code: "scope_unavailable",
      });
      return { response: NextResponse.json({ error: "Périmètre indisponible." }, { status: 422 }) };
    }
    if (error instanceof MultiActionReportEmptyError) {
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "source",
        code: "empty_report_window",
      });
      return { response: NextResponse.json({ error: "Aucune action admissible sur cette période." }, { status: 422 }) };
    }
    if (error instanceof MultiActionReportSourceUnavailableError) {
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "source",
        code: "actions_source_unavailable",
      });
      return { response: NextResponse.json({ error: "Les données canoniques sont temporairement indisponibles." }, { status: 503 }) };
    }
    if (error instanceof ReportAdvancedFilterSourceUnavailableError) {
      await auditReportGenerationError(operationId, actorUserId, {
        stage: "source",
        code: "action_media_filter_source_unavailable",
      });
      return { response: NextResponse.json({ error: "La preuve photographique canonique est temporairement indisponible." }, { status: 503 }) };
    }
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "source",
      code: "multi_action_resolution_failed",
    });
    return { response: NextResponse.json({ error: "Le rapport multi-actions est temporairement indisponible." }, { status: 503 }) };
  }
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
  const generationId = randomUUID();

  const parsed = await parseReportGenerationRequest(request, operationId, access.userId);
  if ("response" in parsed) return parsed.response;

  const availability = await getReportExportAvailability(access.userId).catch((error: unknown) => {
    console.error("Report export quota availability precheck failed; continuing to atomic reservation", {
      operationId,
      userId: access.userId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  });
  if (availability === "used") {
    await auditReportGenerationError(operationId, access.userId, {
      stage: "quota",
      code: "daily_quota_exceeded",
    });
    return NextResponse.json(
      {
        error: "Un export détaillé a déjà été utilisé aujourd'hui.",
        quotaDay: getReportExportQuotaDay(),
      },
      { status: 429 },
    );
  }

  const resolved = await resolveReportGenerationInput(
    parsed.request,
    operationId,
    access.userId,
    generationId,
  );
  if ("response" in resolved) return resolved.response;

  const quota = await reserveReportGenerationQuota(operationId, access.userId);
  if ("response" in quota) return quota.response;

  const persisted = await persistReportGenerationWithQuota(
    operationId,
    access.userId,
    resolved.input,
    quota.reservation,
  );
  if ("response" in persisted) return persisted.response;

  await auditReportGenerationSuccess(operationId, access.userId, persisted.item, resolved.input);

  return NextResponse.json({
    item: persisted.item,
    payload: resolved.input.payload,
    filename: buildPdfReportFilename({
      rubrique: resolved.input.payload.rubrique,
      periode: resolved.input.payload.periode,
    }),
  });
}
