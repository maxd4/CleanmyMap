import { NextResponse } from "next/server";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  persistReportGeneration,
  resolveDirectReportGenerationPersistence,
} from "@/lib/reports/report-generation-history-store";
import {
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";
import type { ReportGenerationHistoryInput } from "@/lib/reports/report-generation-history-contract";

export type ReportGenerationReservation = Awaited<ReturnType<typeof reserveReportExportSlot>>;
export type ReportGenerationItem = Awaited<ReturnType<typeof persistReportGeneration>>;

export function auditReportGenerationError(
  operationId: string,
  actorUserId: string,
  details: Record<string, unknown>,
  targetId?: string,
) {
  return appendAdminOperationAudit({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
    operationType: "admin_operation",
    outcome: "error",
    ...(targetId ? { targetId } : {}),
    details: { operation: "persist_report_generation", ...details },
  });
}

export async function persistReportGenerationWithQuota(params: {
  operationId: string;
  actorUserId: string;
  input: ReportGenerationHistoryInput;
  reservation: ReportGenerationReservation;
  generationId: string;
}): Promise<
  | { item: ReportGenerationItem; persistenceReconciled: boolean }
  | { response: NextResponse }
> {
  let item: ReportGenerationItem;
  let persistenceReconciled = false;
  try {
    item = await persistReportGeneration({
      createdByClerkId: params.actorUserId,
      input: params.input,
    });
  } catch (persistenceError) {
    const resolution = await resolveDirectReportGenerationPersistence({
      createdByClerkId: params.actorUserId,
      generationId: params.generationId,
    });
    if (resolution.kind === "persisted") {
      item = resolution.item;
      persistenceReconciled = true;
      console.warn("Report generation persistence response was reconciled after insertion", {
        operationId: params.operationId,
        generationId: params.generationId,
        error: persistenceError instanceof Error ? persistenceError.message : "unknown_error",
      });
    } else if (resolution.kind === "uncertain") {
      console.error("Report generation persistence outcome is uncertain", {
        operationId: params.operationId,
        generationId: params.generationId,
        error: persistenceError instanceof Error ? persistenceError.message : "unknown_error",
      });
      try {
        await auditReportGenerationError(
          params.operationId,
          params.actorUserId,
          {
            stage: "persistence",
            code: "persistence_uncertain",
            generationId: params.generationId,
          },
          params.generationId,
        );
      } catch (auditError) {
        console.error("Report generation uncertainty audit failed", {
          operationId: params.operationId,
          generationId: params.generationId,
          error: auditError instanceof Error ? auditError.message : "unknown_error",
        });
      }
      return {
        response: NextResponse.json(
          {
            error: "Le résultat de l'enregistrement est incertain. Ne relancez pas cette action avant vérification.",
            code: "persistence_uncertain",
            persisted: "unknown",
            generationId: params.generationId,
          },
          { status: 503 },
        ),
      };
    } else {
      await releaseReportExportSlot({
        userId: params.actorUserId,
        quotaDay: params.reservation.quotaDay,
      }).catch(() => undefined);
      try {
        await auditReportGenerationError(
          params.operationId,
          params.actorUserId,
          {
            stage: "persistence",
            code: "persistence_failed",
            generationId: params.generationId,
          },
          params.generationId,
        );
      } catch (auditError) {
        console.error("Report generation persistence failure audit failed", {
          operationId: params.operationId,
          generationId: params.generationId,
          error: auditError instanceof Error ? auditError.message : "unknown_error",
        });
      }
      return {
        response: NextResponse.json(
          {
            error: "Impossible d'enregistrer l'historique du rapport.",
            code: "persistence_failed",
            persisted: false,
          },
          { status: 503 },
        ),
      };
    }
  }

  return { item, persistenceReconciled };
}

export function auditReportGenerationSuccess(
  operationId: string,
  actorUserId: string,
  item: ReportGenerationItem,
  input: ReportGenerationHistoryInput,
  persistenceReconciled: boolean,
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
      ...(persistenceReconciled ? { persistenceReconciled: true } : {}),
    },
  });
}
