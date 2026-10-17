import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { buildPdfReportFilename } from "@/lib/pdf-export/simple-pdf";
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
import {
  releaseReportExportSlot,
  reserveReportExportSlot,
} from "@/lib/reports/report-export-quota";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

export const runtime = "nodejs";

type ReportGenerationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: ReportGenerationRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  const { id } = await params;
  try {
    const generation = await getReportGenerationSnapshotById(id, access.userId);
    if (!generation) {
      return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
    }

    return NextResponse.json({ generation });
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) {
      return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    }

    if (error instanceof InvalidReportGenerationSnapshotError) {
      return NextResponse.json(
        { error: "Le snapshot historique est invalide ou incompatible." },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "Impossible de charger le rapport historique." },
      { status: 503 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: ReportGenerationRouteContext,
) {
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
  if (rateLimitResponse) return rateLimitResponse;

  const operationId = `report-derivation-${randomUUID()}`;
  const { id } = await params;
  let source;
  try {
    source = await getReportGenerationSnapshotById(id, access.userId);
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) {
      return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    }
    if (error instanceof InvalidReportGenerationSnapshotError) {
      return NextResponse.json(
        { error: "Le snapshot historique est invalide ou incompatible." },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Impossible de charger le rapport historique." },
      { status: 503 },
    );
  }

  if (!source) {
    return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });
  }

  try {
    assertReportGenerationCanBeDerived(source.snapshot);
  } catch (error) {
    if (error instanceof ReportGenerationDerivationUnavailableError) {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId: source.id,
        details: {
          operation: "derive_report_generation",
          stage: "compatibility",
          code: "derivation_incompatible",
        },
      });
      return NextResponse.json(
        { error: "Ce snapshot ne contient pas les versions nécessaires pour créer une nouvelle version." },
        { status: 422 },
      );
    }
    throw error;
  }

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
      targetId: source.id,
      details: { operation: "derive_report_generation", stage: "quota", code: "quota_unavailable" },
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
      targetId: source.id,
      details: { operation: "derive_report_generation", stage: "quota", code: "daily_quota_exceeded" },
    });
    return NextResponse.json(
      { error: "Un export détaillé a déjà été utilisé aujourd'hui.", quotaDay: reservation.quotaDay },
      { status: 429 },
    );
  }

  const generationId = randomUUID();
  const generatedAt = new Date().toISOString();
  let item;
  try {
    item = await persistDerivedReportGeneration({
      createdByClerkId: access.userId,
      source,
      generationId,
      generatedAt,
    });
  } catch (persistenceError) {
    const resolution = await resolveDerivedReportGenerationPersistence({
      createdByClerkId: access.userId,
      generationId,
      sourceGenerationId: source.id,
    });
    if (resolution.kind === "persisted") {
      item = resolution.item;
    } else if (resolution.kind === "uncertain") {
      console.error("Report derived generation persistence outcome is uncertain", {
        operationId,
        generationId,
        sourceGenerationId: source.id,
        error: persistenceError,
      });
      try {
        await appendAdminOperationAudit({
          operationId,
          at: new Date().toISOString(),
          actorUserId: access.userId,
          operationType: "admin_operation",
          outcome: "error",
          targetId: generationId,
          details: {
            operation: "derive_report_generation",
            stage: "persistence",
            code: "persistence_uncertain",
            sourceGenerationId: source.id,
          },
        });
      } catch (auditError) {
        console.error("Report derived generation uncertainty audit failed", {
          operationId,
          generationId,
          sourceGenerationId: source.id,
          error: auditError,
        });
      }
      return NextResponse.json(
        {
          error: "Le résultat de l'enregistrement est incertain. Ne relancez pas cette action avant vérification.",
          code: "persistence_uncertain",
          persisted: "unknown",
          generationId,
        },
        { status: 503 },
      );
    } else {
      await releaseReportExportSlot({ userId: access.userId, quotaDay: reservation.quotaDay }).catch(() => undefined);
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId: source.id,
        details: { operation: "derive_report_generation", stage: "persistence", code: "persistence_failed" },
      });
      return NextResponse.json({ error: "Impossible d'enregistrer la nouvelle version du rapport." }, { status: 503 });
    }
  }

  const metadata = source.snapshot.snapshotMetadata!;
  const payload = {
    ...source.snapshot,
    snapshotMetadata: {
      ...metadata,
      generationId,
      sourceGenerationId: source.id,
      generatedAt,
    },
    data: { ...source.snapshot.data, generatedAt },
  };

  try {
    await appendAdminOperationAudit({
      operationId,
      at: new Date().toISOString(),
      actorUserId: access.userId,
      operationType: "admin_operation",
      outcome: "success",
      targetId: item.id,
      details: {
        operation: "derive_report_generation",
        stage: "persistence",
        sourceGenerationId: source.id,
      },
    });
  } catch (auditError) {
    console.error("Report derived generation success audit failed after persistence", {
      operationId,
      generationId: item.id,
      sourceGenerationId: source.id,
      error: auditError,
    });
    try {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "admin_operation",
        outcome: "error",
        targetId: item.id,
        details: {
          operation: "derive_report_generation",
          stage: "audit",
          code: "audit_failed_after_persistence",
          sourceGenerationId: source.id,
        },
      });
    } catch (reportingError) {
      console.error("Report derived generation audit failure could not be recorded", {
        operationId,
        generationId: item.id,
        sourceGenerationId: source.id,
        error: reportingError,
      });
    }
    return NextResponse.json(
      {
        error: "La nouvelle version a été enregistrée, mais son journal d'audit est indisponible. Ne relancez pas cette action.",
        code: "audit_failed_after_persistence",
        persisted: true,
        generationId: item.id,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    item,
    generation: {
      ...source,
      id: item.id,
      filename: buildPdfReportFilename({ rubrique: payload.rubrique, periode: payload.periode }),
      generatedAt,
      snapshot: payload,
    },
  });
}
