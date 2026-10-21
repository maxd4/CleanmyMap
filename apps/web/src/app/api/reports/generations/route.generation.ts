import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
import {
  getReportExportAvailability,
  getReportExportQuotaDay,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";
import {
  auditReportGenerationError,
  auditReportGenerationSuccess,
  persistReportGenerationWithQuota,
  type ReportGenerationReservation,
} from "./route.persistence";
import { parseReportGenerationRequest, resolveReportGenerationInput } from "./route.input";

async function reserveReportGenerationQuota(operationId: string, actorUserId: string): Promise<
  { reservation: ReportGenerationReservation } | { response: NextResponse }
> {
  try {
    const reservation = await reserveReportExportSlot(actorUserId);
    if (!reservation.allowed) {
      await auditReportGenerationError(operationId, actorUserId, { stage: "quota", code: "daily_quota_exceeded" });
      return {
        response: NextResponse.json({
          error: "Un export détaillé a déjà été utilisé aujourd'hui.",
          quotaDay: reservation.quotaDay,
        }, { status: 429 }),
      };
    }
    return { reservation };
  } catch {
    await auditReportGenerationError(operationId, actorUserId, { stage: "quota", code: "quota_unavailable" });
    return { response: NextResponse.json({ error: "Quota d'export temporairement indisponible." }, { status: 503 }) };
  }
}

async function mapPostPersistenceAuditFailure(
  operationId: string,
  actorUserId: string,
  generationId: string,
): Promise<NextResponse> {
  try {
    await auditReportGenerationError(operationId, actorUserId, {
      stage: "audit",
      code: "audit_failed_after_persistence",
      generationId,
    }, generationId);
  } catch (reportingError) {
    console.error("Report generation audit failure could not be recorded", {
      operationId,
      generationId,
      error: reportingError instanceof Error ? reportingError.message : "unknown_error",
    });
  }
  return NextResponse.json({
    error: "Le rapport a été enregistré, mais son journal d'audit est indisponible. Ne relancez pas cette action.",
    code: "audit_failed_after_persistence",
    persisted: true,
    generationId,
  }, { status: 503 });
}

export async function generateReportGeneration(actorUserId: string, request: Request): Promise<NextResponse> {
  const operationId = `report-generation-${randomUUID()}`;
  const generationId = randomUUID();
  const parsed = await parseReportGenerationRequest(request, operationId, actorUserId);
  if ("response" in parsed) return parsed.response;

  const availability = await getReportExportAvailability(actorUserId).catch((error: unknown) => {
    console.error("Report export quota availability precheck failed; continuing to atomic reservation", {
      operationId,
      userId: actorUserId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  });
  if (availability === "used") {
    await auditReportGenerationError(operationId, actorUserId, { stage: "quota", code: "daily_quota_exceeded" });
    return NextResponse.json({
      error: "Un export détaillé a déjà été utilisé aujourd'hui.",
      quotaDay: getReportExportQuotaDay(),
    }, { status: 429 });
  }

  const resolved = await resolveReportGenerationInput(parsed.request, operationId, actorUserId, generationId);
  if ("response" in resolved) return resolved.response;
  const quota = await reserveReportGenerationQuota(operationId, actorUserId);
  if ("response" in quota) return quota.response;
  const persisted = await persistReportGenerationWithQuota({
    operationId,
    actorUserId,
    input: resolved.input,
    reservation: quota.reservation,
    generationId,
  });
  if ("response" in persisted) return persisted.response;

  try {
    await auditReportGenerationSuccess(operationId, actorUserId, persisted.item, resolved.input, persisted.persistenceReconciled);
  } catch (auditError) {
    console.error("Report generation success audit failed after persistence", {
      operationId,
      generationId: persisted.item.id,
      error: auditError instanceof Error ? auditError.message : "unknown_error",
    });
    return mapPostPersistenceAuditFailure(operationId, actorUserId, persisted.item.id);
  }
  return NextResponse.json({
    item: persisted.item,
    payload: resolved.input.payload,
    filename: buildPdfReportFilename({ rubrique: resolved.input.payload.rubrique, periode: resolved.input.payload.periode }),
  });
}
