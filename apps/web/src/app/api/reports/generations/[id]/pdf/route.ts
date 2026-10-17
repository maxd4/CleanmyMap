import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { appendAdminOperationAudit } from "@/lib/admin/audit/operation-audit";
import { assertReportRendererCompatibility, IncompatibleReportRendererError } from "@/lib/pdf-export/browser-report";
import { InvalidReportGenerationSnapshotError } from "@/lib/reports/report-generation-payload";
import {
  getReportGenerationSnapshotById,
  InvalidReportGenerationIdError,
} from "@/lib/reports/report-generation-history-store";
import {
  claimReportPdfArtifact,
  markReportPdfArtifactFailed,
  markReportPdfArtifactReady,
  REPORT_PDF_ARTIFACT_BUCKET,
  REPORT_PDF_ARTIFACT_RENDERER_VERSION,
  type ReportPdfArtifactTheme,
  waitForReportPdfArtifact,
} from "@/lib/reports/report-generation-pdf-artifact-store";
import { renderOfficialReportPdf } from "@/lib/reports/report-pdf-renderer";

export const runtime = "nodejs";
export const maxDuration = 60;

type ReportPdfRouteContext = { params: Promise<{ id: string }> };

function parseTheme(value: string | null): ReportPdfArtifactTheme | null {
  return value === null || value === "impact" ? "impact" : value === "scientific" ? "scientific" : null;
}

function attachmentFilename(filename: string): string {
  const normalized = filename.replace(/[\r\n"\\]/g, "_").trim();
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized || "rapport"}.pdf`;
}

async function auditFailure(params: {
  operationId: string;
  actorUserId: string;
  targetId: string;
  code: string;
}): Promise<void> {
  try {
    await appendAdminOperationAudit({
      operationId: params.operationId,
      at: new Date().toISOString(),
      actorUserId: params.actorUserId,
      operationType: "admin_operation",
      outcome: "error",
      targetId: params.targetId,
      details: { operation: "download_report_pdf", stage: "artifact", code: params.code },
    });
  } catch (error) {
    console.error("Report PDF artifact failure audit failed", { ...params, error });
  }
}

export async function GET(request: Request, { params }: ReportPdfRouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse({ hint: access.error });

  const operationId = `report-pdf-${crypto.randomUUID()}`;
  const { id } = await params;
  const theme = parseTheme(new URL(request.url).searchParams.get("theme"));
  if (!theme) return NextResponse.json({ error: "Thème PDF invalide." }, { status: 400 });

  let generation;
  try {
    generation = await getReportGenerationSnapshotById(id, access.userId);
  } catch (error) {
    if (error instanceof InvalidReportGenerationIdError) {
      return NextResponse.json({ error: "Identifiant de rapport invalide." }, { status: 400 });
    }
    if (error instanceof InvalidReportGenerationSnapshotError) {
      return NextResponse.json({ error: "Le snapshot historique est invalide ou incompatible." }, { status: 422 });
    }
    await auditFailure({ operationId, actorUserId: access.userId, targetId: id, code: "snapshot_unavailable" });
    return NextResponse.json({ error: "Impossible de charger le rapport historique." }, { status: 503 });
  }
  if (!generation) return NextResponse.json({ error: "Rapport historique introuvable." }, { status: 404 });

  try {
    assertReportRendererCompatibility(generation.snapshot);
  } catch (error) {
    if (error instanceof IncompatibleReportRendererError) {
      await auditFailure({ operationId, actorUserId: access.userId, targetId: generation.id, code: "renderer_incompatible" });
      return NextResponse.json({ error: "Le renderer historique n'est plus disponible pour ce rapport." }, { status: 422 });
    }
    throw error;
  }

  try {
    const claim = await claimReportPdfArtifact({
      generationId: generation.id,
      createdByClerkId: access.userId,
      theme,
      rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
    });
    let artifact = claim.artifact;
    if (claim.kind === "rendering") {
      const completed = await waitForReportPdfArtifact({
        generationId: generation.id,
        theme,
        rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION,
      });
      if (!completed || completed.status !== "ready") {
        return NextResponse.json(
          { error: "Le PDF est en cours de préparation. Réessayez dans quelques instants.", code: "pdf_render_in_progress" },
          { status: 202, headers: { "Retry-After": "2" } },
        );
      }
      artifact = completed;
    } else if (claim.kind === "owner") {
      try {
        const bytes = await renderOfficialReportPdf({ payload: generation.snapshot, theme });
        const supabase = (await import("@/lib/supabase/server")).getSupabaseAdminClient();
        const pdfBlob = new Blob([
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        ], { type: "application/pdf" });
        const upload = await supabase.storage.from(REPORT_PDF_ARTIFACT_BUCKET).upload(
          artifact.storagePath,
          pdfBlob,
          { contentType: "application/pdf", cacheControl: "31536000", upsert: false },
        );
        let storedByteSize = bytes.byteLength;
        if (upload.error) {
          const existing = await supabase.storage.from(REPORT_PDF_ARTIFACT_BUCKET).download(artifact.storagePath);
          if (existing.error || !existing.data) throw upload.error;
          storedByteSize = existing.data.size;
        }
        artifact = await markReportPdfArtifactReady({ artifactId: artifact.id, byteSize: storedByteSize });
      } catch (error) {
        try {
          await markReportPdfArtifactFailed({ artifactId: artifact.id, errorCode: "pdf_render_failed" });
        } catch (statusError) {
          console.error("Report PDF artifact failure state could not be persisted", { operationId, generationId: generation.id, statusError });
        }
        throw error;
      }
    }

    const supabase = (await import("@/lib/supabase/server")).getSupabaseAdminClient();
    const downloaded = await supabase.storage.from(REPORT_PDF_ARTIFACT_BUCKET).download(artifact.storagePath);
    if (downloaded.error || !downloaded.data) throw downloaded.error ?? new Error("PDF artifact is unavailable.");
    try {
      await appendAdminOperationAudit({
        operationId,
        at: new Date().toISOString(),
        actorUserId: access.userId,
        operationType: "admin_operation",
        outcome: "success",
        targetId: generation.id,
        details: { operation: "download_report_pdf", stage: "delivery", theme, rendererVersion: REPORT_PDF_ARTIFACT_RENDERER_VERSION },
      });
    } catch (auditError) {
      console.error("Report PDF delivery audit failed after artifact was ready", {
        operationId,
        generationId: generation.id,
        theme,
        error: auditError,
      });
      await auditFailure({ operationId, actorUserId: access.userId, targetId: generation.id, code: "audit_failed_after_pdf_ready" });
    }
    return new Response(downloaded.data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${attachmentFilename(generation.filename)}"; filename*=UTF-8''${encodeURIComponent(attachmentFilename(generation.filename))}`,
        "Content-Length": String(downloaded.data.size),
        "Cache-Control": "private, no-store",
        "X-Report-Pdf-Renderer-Version": REPORT_PDF_ARTIFACT_RENDERER_VERSION,
      },
    });
  } catch (error) {
    console.error("Report PDF generation or delivery failed", { operationId, generationId: generation.id, theme, error });
    await auditFailure({ operationId, actorUserId: access.userId, targetId: generation.id, code: "pdf_delivery_failed" });
    return NextResponse.json({ error: "Le PDF est indisponible pour le moment." }, { status: 503 });
  }
}
