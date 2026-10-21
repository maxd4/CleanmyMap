import { randomUUID } from "node:crypto";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
  persistDerivedReportGeneration,
  resolveDerivedReportGenerationPersistence,
} from "@/lib/reports/report-generation-history-store";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
import {
  assertReportGenerationCanBeDerived,
  ReportGenerationDerivationUnavailableError,
} from "@/lib/reports/report-generation-derivation";
import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
import { releaseReportExportSlot, reserveReportExportSlot } from "@/lib/reports/report-export-quota";

type Source = NonNullable<Awaited<ReturnType<typeof getReportGenerationSnapshotById>>>;
type Item = Awaited<ReturnType<typeof persistDerivedReportGeneration>>;

export type DerivationFailure =
  | { kind: "invalid_id" }
  | { kind: "invalid_snapshot" }
  | { kind: "source_unavailable" }
  | { kind: "not_found" }
  | { kind: "incompatible" }
  | { kind: "quota_unavailable" }
  | { kind: "quota_exceeded"; quotaDay: string }
  | { kind: "persistence_uncertain"; generationId: string }
  | { kind: "persistence_failed" }
  | { kind: "audit_failed"; generationId: string };

export type DerivationResult =
  | { kind: "success"; item: Item; generation: Source & { id: string; filename: string; generatedAt: string; snapshot: Source["snapshot"] } }
  | { kind: "failure"; failure: DerivationFailure };

async function resolveDerivationSource(id: string, userId: string): Promise<{ source: Source } | { failure: DerivationFailure }> {
  try {
    const source = await getReportGenerationSnapshotById(id, userId);
    return source ? { source } : { failure: { kind: "not_found" } };
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) return { failure: { kind: "invalid_id" } };
    if (error instanceof InvalidReportGenerationSnapshotError) return { failure: { kind: "invalid_snapshot" } };
    return { failure: { kind: "source_unavailable" } };
  }
}

async function reserveDerivationQuota(operationId: string, userId: string, targetId: string): Promise<{ quotaDay: string } | { failure: DerivationFailure }> {
  try {
    const reservation = await reserveReportExportSlot(userId);
    if (!reservation.allowed) {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId,
        details: { operation: "derive_report_generation", stage: "quota", code: "daily_quota_exceeded" },
      });
      return { failure: { kind: "quota_exceeded", quotaDay: reservation.quotaDay } };
    }
    return { quotaDay: reservation.quotaDay };
  } catch {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId,
      details: { operation: "derive_report_generation", stage: "quota", code: "quota_unavailable" },
    });
    return { failure: { kind: "quota_unavailable" } };
  }
}

async function auditDerivationFailure(params: {
  operationId: string;
  userId: string;
  targetId: string;
  details: Record<string, unknown>;
  message: string;
  context: Record<string, unknown>;
}): Promise<void> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: params.targetId,
      details: params.details,
    });
  } catch (error) {
    console.error(params.message, { ...params.context, error });
  }
}

async function persistDerivation(params: {
  operationId: string;
  userId: string;
  source: Source;
  quotaDay: string;
  generationId: string;
  generatedAt: string;
}): Promise<{ item: Item } | { failure: DerivationFailure }> {
  try {
    return {
      item: await persistDerivedReportGeneration({
        createdByClerkId: params.userId,
        source: params.source,
        generationId: params.generationId,
        generatedAt: params.generatedAt,
      }),
    };
  } catch (persistenceError) {
    const resolution = await resolveDerivedReportGenerationPersistence({
      createdByClerkId: params.userId,
      generationId: params.generationId,
      sourceGenerationId: params.source.id,
    });
    if (resolution.kind === "persisted") return { item: resolution.item };
    if (resolution.kind === "uncertain") {
      console.error("Report derived generation persistence outcome is uncertain", {
        operationId: params.operationId,
        generationId: params.generationId,
        sourceGenerationId: params.source.id,
        error: persistenceError,
      });
      await auditDerivationFailure({
        operationId: params.operationId,
        userId: params.userId,
        targetId: params.generationId,
        details: { operation: "derive_report_generation", stage: "persistence", code: "persistence_uncertain", sourceGenerationId: params.source.id },
        message: "Report derived generation uncertainty audit failed",
        context: { operationId: params.operationId, generationId: params.generationId, sourceGenerationId: params.source.id },
      });
      return { failure: { kind: "persistence_uncertain", generationId: params.generationId } };
    }
    await releaseReportExportSlot({ userId: params.userId, quotaDay: params.quotaDay }).catch(() => undefined);
    await auditDerivationFailure({
      operationId: params.operationId,
      userId: params.userId,
      targetId: params.source.id,
      details: { operation: "derive_report_generation", stage: "persistence", code: "persistence_failed" },
      message: "Report derived generation persistence failure audit failed",
      context: { operationId: params.operationId, generationId: params.generationId, sourceGenerationId: params.source.id },
    });
    return { failure: { kind: "persistence_failed" } };
  }
}

function buildDerivedGeneration(source: Source, item: Item, generationId: string, generatedAt: string) {
  const metadata = source.snapshot.snapshotMetadata!;
  const snapshot = {
    ...source.snapshot,
    snapshotMetadata: { ...metadata, generationId, sourceGenerationId: source.id, generatedAt },
    data: { ...source.snapshot.data, generatedAt },
  };
  return {
    ...source,
    id: item.id,
    filename: buildPdfReportFilename({ rubrique: snapshot.rubrique, periode: snapshot.periode }),
    generatedAt,
    snapshot,
  };
}

async function auditDerivationSuccess(params: {
  operationId: string;
  userId: string;
  sourceId: string;
  generationId: string;
}): Promise<DerivationFailure | null> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.userId,
      operationType: "admin_operation",
      outcome: "success",
      targetId: params.generationId,
      details: { operation: "derive_report_generation", stage: "persistence", sourceGenerationId: params.sourceId },
    });
    return null;
  } catch (auditError) {
    console.error("Report derived generation success audit failed after persistence", {
      operationId: params.operationId,
      generationId: params.generationId,
      sourceGenerationId: params.sourceId,
      error: auditError,
    });
    try {
      await appendAdminOperationAudit({
        operationId: params.operationId,
        at: new Date().toISOString(),
        actorUserId: params.userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId: params.generationId,
        details: { operation: "derive_report_generation", stage: "audit", code: "audit_failed_after_persistence", sourceGenerationId: params.sourceId },
      });
    } catch (reportingError) {
      console.error("Report derived generation audit failure could not be recorded", {
        operationId: params.operationId,
        generationId: params.generationId,
        sourceGenerationId: params.sourceId,
        error: reportingError,
      });
    }
    return { kind: "audit_failed", generationId: params.generationId };
  }
}

export async function deriveReportGeneration(params: {
  id: string;
  userId: string;
  operationId: string;
}): Promise<DerivationResult> {
  const sourceResult = await resolveDerivationSource(params.id, params.userId);
  if ("failure" in sourceResult) return { kind: "failure", failure: sourceResult.failure };
  try {
    assertReportGenerationCanBeDerived(sourceResult.source.snapshot);
  } catch (error) {
    if (!(error instanceof ReportGenerationDerivationUnavailableError)) throw error;
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.userId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: sourceResult.source.id,
      details: { operation: "derive_report_generation", stage: "compatibility", code: "derivation_incompatible" },
    });
    return { kind: "failure", failure: { kind: "incompatible" } };
  }
  const quota = await reserveDerivationQuota(params.operationId, params.userId, sourceResult.source.id);
  if ("failure" in quota) return { kind: "failure", failure: quota.failure };
  const generationId = randomUUID();
  const generatedAt = new Date().toISOString();
  const persisted = await persistDerivation({
    operationId: params.operationId,
    userId: params.userId,
    source: sourceResult.source,
    quotaDay: quota.quotaDay,
    generationId,
    generatedAt,
  });
  if ("failure" in persisted) return { kind: "failure", failure: persisted.failure };
  const auditFailure = await auditDerivationSuccess({
    operationId: params.operationId,
    userId: params.userId,
    sourceId: sourceResult.source.id,
    generationId: persisted.item.id,
  });
  if (auditFailure) return { kind: "failure", failure: auditFailure };
  return {
    kind: "success",
    item: persisted.item,
    generation: buildDerivedGeneration(sourceResult.source, persisted.item, generationId, generatedAt),
  };
}
