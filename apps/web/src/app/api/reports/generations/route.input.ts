import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBodyWithLimit } from "@/lib/http/request-body";
import { auditReportGenerationError } from "./route.persistence";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";
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

const MAX_REPORT_GENERATION_REQUEST_BYTES = 2 * 1024 * 1024;
const detailLevelSchema = z.enum(["concis", "default", "exhaustif"]);
const reportThemeSchema = z.enum(["impact", "scientific"]);
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
  input: z.object({ type: z.literal("single_action"), actionId: z.string().uuid() }).strict(),
  detailLevel: detailLevelSchema,
  modules: modulesSchema.strict(),
  theme: reportThemeSchema.optional(),
}).strict();
const multiActionRequestSchema = z.object({
  input: z.object({
    type: z.literal("multi_action"),
    period: z.union([
      z.object({ id: periodIdSchema }).strict(),
      z.object({ id: z.literal("custom_range"), from: civilDateSchema, to: civilDateSchema }).strict(),
    ]),
    scope: z.object({ kind: scopeKindSchema, value: z.string().trim().max(180).nullable().optional() }).strict(),
    filters: reportAdvancedFiltersSchema.optional(),
  }).strict(),
  detailLevel: detailLevelSchema,
  modules: modulesSchema.strict(),
  theme: reportThemeSchema.optional(),
}).strict();

type ParsedReportGenerationRequest =
  | { kind: "single_action"; request: z.infer<typeof singleActionRequestSchema> }
  | { kind: "multi_action"; request: z.infer<typeof multiActionRequestSchema> };

function hasTypedInput(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "input"));
}

export async function parseReportGenerationRequest(
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
    await auditReportGenerationError(operationId, actorUserId, { stage: "validation", code: "invalid_typed_input" });
    return { response: NextResponse.json({ error: "Invalid report generation input" }, { status: 400 }) };
  }
  if (singleAction.success) return { request: { kind: "single_action", request: singleAction.data } };
  if (multiAction.success) return { request: { kind: "multi_action", request: multiAction.data } };
  if (body.data && typeof body.data === "object" && "payload" in body.data) {
    await auditReportGenerationError(operationId, actorUserId, { stage: "validation", code: "legacy_payload_rejected" });
    return { response: NextResponse.json({ error: "A typed report generation input is required." }, { status: 400 }) };
  }
  await auditReportGenerationError(operationId, actorUserId, { stage: "validation", code: "invalid_typed_input" });
  return { response: NextResponse.json({ error: "Invalid report generation input" }, { status: 400 }) };
}

async function resolveSingleActionInput(
  parsed: Extract<ParsedReportGenerationRequest, { kind: "single_action" }>,
  operationId: string,
  actorUserId: string,
  generationId: string,
): Promise<{ input: ReportGenerationHistoryInput } | { response: NextResponse }> {
  try {
    const contract = await resolveSingleActionReportContract(parsed.request.input.actionId);
    return {
      input: {
        ...buildSingleActionReportGenerationInput({
          request: parsed.request.input,
          contract,
          detailLevel: parsed.request.detailLevel,
          modules: parsed.request.modules,
          generationId,
          now: new Date(),
        }),
        theme: parsed.request.theme ?? "impact",
      },
    };
  } catch (error) {
    const unavailable = error instanceof SingleActionReportTargetUnavailableError;
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "source",
      code: unavailable ? "action_unavailable" : "action_resolution_failed",
    });
    return unavailable
      ? { response: NextResponse.json({ error: "Action indisponible." }, { status: 404 }) }
      : { response: NextResponse.json({ error: "Action temporairement indisponible." }, { status: 503 }) };
  }
}

async function resolveMultiActionInput(
  parsed: Extract<ParsedReportGenerationRequest, { kind: "multi_action" }>,
  operationId: string,
  actorUserId: string,
  generationId: string,
): Promise<{ input: ReportGenerationHistoryInput } | { response: NextResponse }> {
  try {
    return {
      input: {
        ...await buildMultiActionReportGenerationInput({
          request: parsed.request.input,
          detailLevel: parsed.request.detailLevel,
          modules: parsed.request.modules,
          generationId,
          readerUserId: actorUserId,
          now: new Date(),
        }),
        theme: parsed.request.theme ?? "impact",
      },
    };
  } catch (error) {
    const failure = getMultiActionFailure(error);
    await auditReportGenerationError(operationId, actorUserId, { stage: failure.stage, code: failure.code });
    return { response: NextResponse.json({ error: failure.message }, { status: failure.status }) };
  }
}

function getMultiActionFailure(error: unknown): {
  stage: "validation" | "authorization" | "source";
  code: string;
  status: 400 | 422 | 503;
  message: string;
} {
  if (error instanceof MultiActionReportPeriodInvalidError) {
    return { stage: "validation", code: "invalid_period", status: 400, message: "Période invalide." };
  }
  if (error instanceof MultiActionReportScopeUnavailableError) {
    return { stage: "authorization", code: "scope_unavailable", status: 422, message: "Périmètre indisponible." };
  }
  if (error instanceof MultiActionReportEmptyError) {
    return { stage: "source", code: "empty_report_window", status: 422, message: "Aucune action admissible sur cette période." };
  }
  if (error instanceof MultiActionReportSourceUnavailableError) {
    return { stage: "source", code: "actions_source_unavailable", status: 503, message: "Les données canoniques sont temporairement indisponibles." };
  }
  if (error instanceof ReportAdvancedFilterSourceUnavailableError) {
    return { stage: "source", code: "action_media_filter_source_unavailable", status: 503, message: "La preuve photographique canonique est temporairement indisponible." };
  }
  return { stage: "source", code: "multi_action_resolution_failed", status: 503, message: "Le rapport multi-actions est temporairement indisponible." };
}

export async function resolveReportGenerationInput(
  parsed: ParsedReportGenerationRequest,
  operationId: string,
  actorUserId: string,
  generationId: string,
): Promise<{ input: ReportGenerationHistoryInput } | { response: NextResponse }> {
  return parsed.kind === "single_action"
    ? resolveSingleActionInput(parsed, operationId, actorUserId, generationId)
    : resolveMultiActionInput(parsed, operationId, actorUserId, generationId);
}
